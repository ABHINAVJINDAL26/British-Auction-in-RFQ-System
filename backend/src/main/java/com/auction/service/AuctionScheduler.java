package com.auction.service;

import com.auction.model.AuctionEvent;
import com.auction.model.Rfq;
import com.auction.repository.AuctionEventRepository;
import com.auction.repository.RfqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuctionScheduler {

    private final RfqRepository rfqRepository;
    private final AuctionEventRepository auctionEventRepository;
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

                Map<String, String> payload = new HashMap<>();
                payload.put("status", newStatus);
                messagingTemplate.convertAndSend("/topic/auction/" + rfq.getId() + "/status", payload);
                messagingTemplate.convertAndSend("/topic/rfq/" + rfq.getId() + "/status", payload);
            }
        }
    }
}
