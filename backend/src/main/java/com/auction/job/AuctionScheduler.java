package com.auction.job;

import com.auction.model.AuctionEvent;
import com.auction.model.Bid;
import com.auction.model.Rfq;
import com.auction.repository.AuctionEventRepository;
import com.auction.repository.BidRepository;
import com.auction.repository.RfqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuctionScheduler {

    private final RfqRepository rfqRepository;
    private final AuctionEventRepository auctionEventRepository;
    private final BidRepository bidRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Scheduled(fixedRate = 30000) // Every 30 seconds
    @Transactional
    public void processAuctions() {
        log.info("Running auction scheduler...");
        List<Rfq> rfqs = rfqRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Rfq rfq : rfqs) {
            String oldStatus = rfq.getStatus();
            String newStatus = oldStatus;

            if ("DRAFT".equals(oldStatus) && !now.isBefore(rfq.getBidStartTime())) {
                newStatus = "ACTIVE";
            } else if ("ACTIVE".equals(oldStatus)) {
                if (!now.isBefore(rfq.getForcedCloseTime())) {
                    newStatus = "FORCE_CLOSED";
                } else if (!now.isBefore(rfq.getBidCloseTime())) {
                    newStatus = "CLOSED";
                }
            }

            if (!oldStatus.equals(newStatus)) {
                log.info("Transitioning RFQ {} from {} to {}", rfq.getId(), oldStatus, newStatus);
                rfq.setStatus(newStatus);
                rfqRepository.save(rfq);

                AuctionEvent event = AuctionEvent.builder()
                        .rfq(rfq)
                        .eventType("STATUS_CHANGED")
                        .description("Auction status changed to " + newStatus)
                        .build();
                auctionEventRepository.save(event);

                // Broadcast status update
                Map<String, Object> statusPayload = new HashMap<>();
                statusPayload.put("status", newStatus);
                messagingTemplate.convertAndSend("/topic/auction/" + rfq.getId() + "/status", statusPayload);
                messagingTemplate.convertAndSend("/topic/rfq/" + rfq.getId() + "/status", statusPayload);

                // When auction closes, broadcast rich result payload for Winner Card
                if ("CLOSED".equals(newStatus) || "FORCE_CLOSED".equals(newStatus)) {
                    broadcastAuctionResult(rfq, newStatus);
                }
            }
        }
    }

    private void broadcastAuctionResult(Rfq rfq, String closeType) {
        List<Bid> rankedBids = bidRepository.findByRfqIdAndIsLatestTrueOrderByTotalChargesAsc(rfq.getId());

        // Count extensions
        long extensionCount = auctionEventRepository.findByRfqIdOrderByCreatedAtDesc(rfq.getId())
                .stream().filter(e -> "TIME_EXTENDED".equals(e.getEventType())).count();

        // Build rankings array
        List<Map<String, Object>> rankings = new ArrayList<>();
        for (int i = 0; i < rankedBids.size(); i++) {
            Bid bid = rankedBids.get(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("rank", i + 1);
            entry.put("supplierId", bid.getSupplier().getId());
            entry.put("supplierName", bid.getSupplier().getName());
            entry.put("supplierCompany", bid.getSupplier().getCompany());
            entry.put("carrierName", bid.getCarrierName());
            entry.put("totalCharges", bid.getTotalCharges());
            entry.put("freightCharges", bid.getFreightCharges());
            entry.put("originCharges", bid.getOriginCharges());
            entry.put("destinationCharges", bid.getDestinationCharges());
            entry.put("transitTime", bid.getTransitTime());
            entry.put("quoteValidity", bid.getQuoteValidity() != null ? bid.getQuoteValidity().toString() : null);
            entry.put("bidId", bid.getId());
            rankings.add(entry);
        }

        Map<String, Object> winner = rankings.isEmpty() ? null : rankings.get(0);

        Map<String, Object> resultPayload = new HashMap<>();
        resultPayload.put("rfqId", rfq.getId());
        resultPayload.put("rfqName", rfq.getName());
        resultPayload.put("referenceId", rfq.getReferenceId());
        resultPayload.put("closeType", closeType);
        resultPayload.put("closedAt", LocalDateTime.now().toString());
        resultPayload.put("extensionCount", extensionCount);
        resultPayload.put("totalBids", rankedBids.size());
        resultPayload.put("rankings", rankings);
        resultPayload.put("winner", winner);

        messagingTemplate.convertAndSend("/topic/auction/" + rfq.getId() + "/result", resultPayload);
        log.info("Broadcast auction result for RFQ {} — winner: {}", rfq.getId(),
                winner != null ? winner.get("supplierName") : "none");
    }
}
