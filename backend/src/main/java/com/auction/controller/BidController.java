package com.auction.controller;

import com.auction.model.Bid;
import com.auction.model.Rfq;
import com.auction.repository.RfqRepository;
import com.auction.service.BidService;
import com.auction.validator.BidValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/rfqs/{id}/bids")
@RequiredArgsConstructor
public class BidController {

    private final BidService bidService;
    private final RfqRepository rfqRepository;
    private final BidValidator bidValidator;

    @PostMapping
    public ResponseEntity<?> submitBid(@PathVariable String id, @RequestBody BidRequest request, @RequestAttribute("userId") String userId, @RequestAttribute("userRole") String userRole) {
        if (!"SUPPLIER".equals(userRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only suppliers can submit bids"));
        }

        try {
            Rfq rfq = rfqRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("RFQ not found"));
            
            bidValidator.validate(request, rfq);

            Bid bidInput = Bid.builder()
                    .carrierName(request.getCarrierName())
                    .freightCharges(request.getFreightCharges())
                    .originCharges(request.getOriginCharges() != null ? request.getOriginCharges() : 0.0)
                    .destinationCharges(request.getDestinationCharges() != null ? request.getDestinationCharges() : 0.0)
                    .transitTime(request.getTransitTime())
                    .quoteValidity(LocalDateTime.parse(request.getQuoteValidity() + "T00:00:00"))
                    .notes(request.getNotes())
                    .build();

            Bid createdBid = bidService.submitBid(id, userId, bidInput);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdBid);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @lombok.Data
    public static class BidRequest {
        private String carrierName;
        private Double freightCharges;
        private Double originCharges;
        private Double destinationCharges;
        private Integer transitTime;
        private String quoteValidity;
        private String notes;
    }
}
