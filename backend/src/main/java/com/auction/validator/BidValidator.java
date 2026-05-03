package com.auction.validator;

import com.auction.controller.BidController.BidRequest;
import com.auction.model.Rfq;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class BidValidator {

    public void validate(BidRequest request, Rfq rfq) {
        if (request == null) {
            throw new IllegalArgumentException("Bid request cannot be null");
        }

        if (request.getCarrierName() == null || request.getCarrierName().trim().isEmpty()) {
            throw new IllegalArgumentException("Carrier Name is required");
        }

        if (request.getFreightCharges() == null || request.getFreightCharges() <= 0) {
            throw new IllegalArgumentException("Freight Charges must be greater than 0");
        }

        if (request.getTransitTime() == null || request.getTransitTime() <= 0) {
            throw new IllegalArgumentException("Transit Time must be greater than 0");
        }

        if (request.getQuoteValidity() == null || request.getQuoteValidity().trim().isEmpty()) {
            throw new IllegalArgumentException("Quote Validity is required");
        }

        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(rfq.getBidStartTime())) {
            throw new IllegalArgumentException("Bidding has not started yet. Starts at: " + rfq.getBidStartTime());
        }

        if (now.isAfter(rfq.getBidCloseTime())) {
            throw new IllegalArgumentException("Bidding is closed. Closed at: " + rfq.getBidCloseTime());
        }

        if (!"ACTIVE".equals(rfq.getStatus())) {
            throw new IllegalArgumentException("Cannot submit bid. Auction is currently " + rfq.getStatus());
        }
    }
}
