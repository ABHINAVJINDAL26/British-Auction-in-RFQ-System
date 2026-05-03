package com.auction.service;

import com.auction.model.AuctionEvent;
import com.auction.model.Rfq;
import com.auction.repository.AuctionEventRepository;
import com.auction.repository.RfqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExtensionEngine {

    private final RfqRepository rfqRepository;
    private final AuctionEventRepository auctionEventRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void checkAndExtendAuction(String rfqId) {
        Rfq rfq = rfqRepository.findById(rfqId).orElse(null);
        if (rfq == null || !"ACTIVE".equals(rfq.getStatus()) || rfq.getAuctionConfig() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        int triggerWindowX = rfq.getAuctionConfig().getTriggerWindowX();
        int extensionDurationY = rfq.getAuctionConfig().getExtensionDurationY();
        String triggerType = rfq.getAuctionConfig().getTriggerType();

        LocalDateTime windowStart = rfq.getBidCloseTime().minusMinutes(triggerWindowX);

        if (now.isBefore(windowStart) || now.isAfter(rfq.getBidCloseTime())) {
            return;
        }

        List<AuctionEvent> events = auctionEventRepository.findByRfqIdOrderByCreatedAtDesc(rfqId);
        LocalDateTime lastExtensionAt = events.stream()
                .filter(e -> "TIME_EXTENDED".equals(e.getEventType()))
                .map(AuctionEvent::getCreatedAt)
                .findFirst()
                .orElse(null);

        boolean shouldExtend = false;

        if ("BID_RECEIVED".equals(triggerType)) {
            shouldExtend = events.stream()
                    .anyMatch(e -> "BID_SUBMITTED".equals(e.getEventType()) &&
                            !e.getCreatedAt().isBefore(windowStart) &&
                            !e.getCreatedAt().isAfter(rfq.getBidCloseTime()) &&
                            (lastExtensionAt == null || e.getCreatedAt().isAfter(lastExtensionAt)));
        } else if ("ANY_RANK_CHANGE".equals(triggerType)) {
            shouldExtend = events.stream()
                    .anyMatch(e -> "BID_SUBMITTED".equals(e.getEventType()) &&
                            ("ANY_RANK_CHANGE".equals(e.getTriggeredBy()) || "L1_RANK_CHANGE".equals(e.getTriggeredBy())) &&
                            !e.getCreatedAt().isBefore(windowStart) &&
                            !e.getCreatedAt().isAfter(rfq.getBidCloseTime()) &&
                            (lastExtensionAt == null || e.getCreatedAt().isAfter(lastExtensionAt)));
        } else if ("L1_RANK_CHANGE".equals(triggerType)) {
            shouldExtend = events.stream()
                    .anyMatch(e -> "BID_SUBMITTED".equals(e.getEventType()) &&
                            "L1_RANK_CHANGE".equals(e.getTriggeredBy()) &&
                            !e.getCreatedAt().isBefore(windowStart) &&
                            !e.getCreatedAt().isAfter(rfq.getBidCloseTime()) &&
                            (lastExtensionAt == null || e.getCreatedAt().isAfter(lastExtensionAt)));
        }

        if (shouldExtend) {
            extendAuction(rfq, extensionDurationY, triggerType);
        }
    }

    private void extendAuction(Rfq rfq, int extensionMinutes, String reason) {
        LocalDateTime currentClose = rfq.getBidCloseTime();
        LocalDateTime newCloseTime = currentClose.plusMinutes(extensionMinutes);
        LocalDateTime forcedClose = rfq.getForcedCloseTime();

        LocalDateTime finalCloseTime = newCloseTime.isAfter(forcedClose) ? forcedClose : newCloseTime;

        if (!currentClose.isBefore(forcedClose)) {
            return;
        }

        rfq.setBidCloseTime(finalCloseTime);
        rfqRepository.save(rfq);

        AuctionEvent event = AuctionEvent.builder()
                .rfq(rfq)
                .eventType("TIME_EXTENDED")
                .description("Auction extended by " + extensionMinutes + " min due to " + reason)
                .oldCloseTime(currentClose)
                .newCloseTime(finalCloseTime)
                .triggeredBy(reason)
                .build();
        auctionEventRepository.save(event);

        Map<String, Object> payload = new HashMap<>();
        payload.put("rfqId", rfq.getId());
        payload.put("oldCloseTime", currentClose.toString());
        payload.put("newCloseTime", finalCloseTime.toString());
        payload.put("reason", reason);
        payload.put("extensionMinutes", extensionMinutes);

        messagingTemplate.convertAndSend("/topic/auction/" + rfq.getId() + "/time", payload);
    }
}
