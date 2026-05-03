package com.auction.validator;

import com.auction.controller.RfqController.CreateRfqRequest;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class RfqValidator {

    public void validate(CreateRfqRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request cannot be null");
        }

        LocalDateTime bidStartTime = parseDate(request.getBidStartTime(), "Bid Start Time");
        LocalDateTime bidCloseTime = parseDate(request.getBidCloseTime(), "Bid Close Time");
        LocalDateTime forcedCloseTime = parseDate(request.getForcedCloseTime(), "Forced Close Time");

        if (!bidStartTime.isBefore(bidCloseTime)) {
            throw new IllegalArgumentException("Bid Start Time must be strictly before Bid Close Time");
        }

        if (!bidCloseTime.isBefore(forcedCloseTime)) {
            throw new IllegalArgumentException("Bid Close Time must be strictly before Forced Close Time");
        }
        
        if (request.getAuctionConfig() != null) {
            if (request.getAuctionConfig().getTriggerWindowX() == null || request.getAuctionConfig().getTriggerWindowX() <= 0) {
                throw new IllegalArgumentException("Trigger Window (X) must be greater than 0");
            }
            if (request.getAuctionConfig().getExtensionDurationY() == null || request.getAuctionConfig().getExtensionDurationY() <= 0) {
                throw new IllegalArgumentException("Extension Duration (Y) must be greater than 0");
            }
        }
    }

    private LocalDateTime parseDate(String dateStr, String fieldName) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        try {
            return LocalDateTime.parse(dateStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid date format for " + fieldName + ". Expected format: yyyy-MM-ddTHH:mm:ss");
        }
    }
}
