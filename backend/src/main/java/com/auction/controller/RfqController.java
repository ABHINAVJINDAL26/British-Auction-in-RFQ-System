package com.auction.controller;

import com.auction.model.AuctionConfig;
import com.auction.model.Rfq;
import com.auction.model.User;
import com.auction.repository.RfqRepository;
import com.auction.repository.UserRepository;
import com.auction.validator.RfqValidator;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/rfqs")
@RequiredArgsConstructor
public class RfqController {

    private final RfqRepository rfqRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RfqValidator rfqValidator;

    @GetMapping
    public ResponseEntity<List<Rfq>> getAllRfqs() {
        return ResponseEntity.ok(rfqRepository.findAllOrderByBidCloseTimeAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRfqById(@PathVariable String id) {
        Optional<Rfq> rfqOpt = rfqRepository.findById(id);
        if (rfqOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "RFQ not found"));
        }
        return ResponseEntity.ok(rfqOpt.get());
    }

    @PostMapping
    public ResponseEntity<?> createRfq(@RequestBody CreateRfqRequest request, @RequestAttribute("userId") String userId, @RequestAttribute("userRole") String userRole) {
        if (!"BUYER".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: insufficient permissions"));
        }

        try {
            rfqValidator.validate(request);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }

        User buyer = userRepository.findById(userId).orElseThrow();

        LocalDateTime pickup = LocalDateTime.parse(request.getPickupDate() + "T00:00:00");
        LocalDateTime start = LocalDateTime.parse(request.getBidStartTime());
        LocalDateTime close = LocalDateTime.parse(request.getBidCloseTime());
        LocalDateTime forced = LocalDateTime.parse(request.getForcedCloseTime());

        Rfq rfq = Rfq.builder()
                .referenceId(request.getReferenceId())
                .name(request.getName())
                .buyer(buyer)
                .pickupDate(pickup)
                .bidStartTime(start)
                .bidCloseTime(close)
                .originalCloseTime(close)
                .forcedCloseTime(forced)
                .status("DRAFT")
                .build();

        if (request.getAuctionConfig() != null) {
            AuctionConfig config = AuctionConfig.builder()
                    .rfq(rfq)
                    .triggerWindowX(request.getAuctionConfig().getTriggerWindowX())
                    .extensionDurationY(request.getAuctionConfig().getExtensionDurationY())
                    .triggerType(request.getAuctionConfig().getTriggerType())
                    .build();
            rfq.setAuctionConfig(config);
        }

        rfqRepository.save(rfq);

        messagingTemplate.convertAndSend("/topic/rfq/created", rfq);

        return ResponseEntity.status(HttpStatus.CREATED).body(rfq);
    }

    @Data
    public static class CreateRfqRequest {
        private String referenceId;
        private String name;
        private String pickupDate;
        private String bidStartTime;
        private String bidCloseTime;
        private String forcedCloseTime;
        private AuctionConfigRequest auctionConfig;

        @Data
        public static class AuctionConfigRequest {
            private Integer triggerWindowX;
            private Integer extensionDurationY;
            private String triggerType;
        }
    }
}
