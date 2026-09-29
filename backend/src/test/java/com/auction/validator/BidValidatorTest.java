package com.auction.validator;

import com.auction.controller.BidController.BidRequest;
import com.auction.model.Rfq;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class BidValidatorTest {

    private BidValidator bidValidator;

    @BeforeEach
    void setUp() {
        bidValidator = new BidValidator();
    }

    @Test
    @DisplayName("Valid bid submission should pass validation")
    void testValidBid() {
        BidRequest request = new BidRequest();
        request.setCarrierName("Maersk");
        request.setFreightCharges(1200.0);
        request.setTransitTime(5);
        request.setQuoteValidity("2026-12-31");

        Rfq rfq = Rfq.builder()
                .status("ACTIVE")
                .bidStartTime(LocalDateTime.now().minusHours(1))
                .bidCloseTime(LocalDateTime.now().plusHours(1))
                .build();

        assertDoesNotThrow(() -> bidValidator.validate(request, rfq));
    }

    @Test
    @DisplayName("Bid with missing carrier name should throw exception")
    void testMissingCarrierName() {
        BidRequest request = new BidRequest();
        request.setFreightCharges(1200.0);
        request.setTransitTime(5);

        Rfq rfq = Rfq.builder().status("ACTIVE").build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> bidValidator.validate(request, rfq));
        assertEquals("Carrier Name is required", ex.getMessage());
    }

    @Test
    @DisplayName("Bid on non-active auction should throw exception")
    void testInactiveAuction() {
        BidRequest request = new BidRequest();
        request.setCarrierName("Maersk");
        request.setFreightCharges(1200.0);
        request.setTransitTime(5);
        request.setQuoteValidity("2026-12-31");

        Rfq rfq = Rfq.builder()
                .status("CLOSED")
                .bidStartTime(LocalDateTime.now().minusHours(2))
                .bidCloseTime(LocalDateTime.now().minusHours(1))
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> bidValidator.validate(request, rfq));
        assertTrue(ex.getMessage().contains("Bidding is closed"));
    }
}
