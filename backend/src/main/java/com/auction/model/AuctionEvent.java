package com.auction.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "auction_events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuctionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rfq_id", nullable = false)
    @JsonIgnore
    private Rfq rfq;

    @Column(nullable = false)
    private String eventType; // BID_SUBMITTED | TIME_EXTENDED | AUCTION_STARTED | AUCTION_CLOSED | AUCTION_FORCE_CLOSED

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    private LocalDateTime oldCloseTime; // before extension
    private LocalDateTime newCloseTime; // after extension
    private String triggeredBy;   // trigger type that caused extension

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
