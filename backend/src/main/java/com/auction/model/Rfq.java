package com.auction.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "rfqs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rfq {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String referenceId; // e.g. RFQ-2024-001

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Column(nullable = false)
    private LocalDateTime pickupDate;

    @Column(nullable = false)
    private LocalDateTime bidStartTime;

    @Column(nullable = false)
    private LocalDateTime bidCloseTime; // current close (can extend)

    @Column(nullable = false)
    private LocalDateTime forcedCloseTime; // hard cap, never changes

    @Column(nullable = false)
    private LocalDateTime originalCloseTime; // original close before extensions

    @Column(nullable = false)
    private String status = "DRAFT"; // DRAFT | ACTIVE | CLOSED | FORCE_CLOSED

    @OneToOne(mappedBy = "rfq", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("rfq")
    private AuctionConfig auctionConfig;

    @OneToMany(mappedBy = "rfq", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("rfq")
    private List<Bid> bids;

    @OneToMany(mappedBy = "rfq", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("rfq")
    private List<AuctionEvent> events;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
