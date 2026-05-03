package com.auction.service;

import com.auction.model.AuctionEvent;
import com.auction.model.Bid;
import com.auction.model.Rfq;
import com.auction.model.User;
import com.auction.repository.AuctionEventRepository;
import com.auction.repository.BidRepository;
import com.auction.repository.RfqRepository;
import com.auction.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BidService {

    private final BidRepository bidRepository;
    private final RfqRepository rfqRepository;
    private final UserRepository userRepository;
    private final AuctionEventRepository auctionEventRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ExtensionEngine extensionEngine;

    @Transactional
    public Bid submitBid(String rfqId, String supplierId, Bid bidInput) {
        Rfq rfq = rfqRepository.findById(rfqId)
                .orElseThrow(() -> new RuntimeException("RFQ not found"));

        if (!"ACTIVE".equals(rfq.getStatus())) {
            throw new RuntimeException("Auction is not active");
        }

        User supplier = userRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        double totalCharges = bidInput.getFreightCharges() + bidInput.getOriginCharges() + bidInput.getDestinationCharges();

        // Mark previous bids from this supplier as not latest
        List<Bid> prevBids = bidRepository.findByRfqIdAndSupplierId(rfqId, supplierId);
        for (Bid b : prevBids) {
            b.setIsLatest(false);
            bidRepository.save(b);
        }

        // Get current L1
        List<Bid> currentRanks = bidRepository.findByRfqIdAndIsLatestTrueOrderByTotalChargesAsc(rfqId);
        String currentL1SupplierId = currentRanks.isEmpty() ? null : currentRanks.get(0).getSupplier().getId();

        Bid newBid = Bid.builder()
                .rfq(rfq)
                .supplier(supplier)
                .carrierName(bidInput.getCarrierName())
                .freightCharges(bidInput.getFreightCharges())
                .originCharges(bidInput.getOriginCharges())
                .destinationCharges(bidInput.getDestinationCharges())
                .totalCharges(totalCharges)
                .transitTime(bidInput.getTransitTime())
                .quoteValidity(bidInput.getQuoteValidity())
                .isLatest(true)
                .notes(bidInput.getNotes())
                .build();

        bidRepository.save(newBid);

        // Recalculate ranks
        List<Bid> newRanks = bidRepository.findByRfqIdAndIsLatestTrueOrderByTotalChargesAsc(rfqId);
        for (int i = 0; i < newRanks.size(); i++) {
            Bid b = newRanks.get(i);
            b.setRank(i + 1);
            bidRepository.save(b);
        }

        String newL1SupplierId = newRanks.get(0).getSupplier().getId();
        boolean l1Changed = currentL1SupplierId != null && !currentL1SupplierId.equals(newL1SupplierId);
        boolean anyRankChanged = !currentRanks.isEmpty() && newBid.getRank() != null && newBid.getRank() <= currentRanks.size() + 1;

        String triggeredBy = "BID_RECEIVED";
        if (l1Changed) {
            triggeredBy = "L1_RANK_CHANGE";
        } else if (anyRankChanged) {
            triggeredBy = "ANY_RANK_CHANGE";
        }

        AuctionEvent event = AuctionEvent.builder()
                .rfq(rfq)
                .eventType("BID_SUBMITTED")
                .actor(supplier)
                .description("New bid submitted: ₹" + totalCharges)
                .triggeredBy(triggeredBy)
                .build();
        auctionEventRepository.save(event);

        Map<String, Object> payload = new HashMap<>();
        payload.put("bid", newBid);
        payload.put("l1Changed", l1Changed);

        messagingTemplate.convertAndSend("/topic/auction/" + rfq.getId() + "/bid", payload);

        extensionEngine.checkAndExtendAuction(rfqId);

        return newBid;
    }
}
