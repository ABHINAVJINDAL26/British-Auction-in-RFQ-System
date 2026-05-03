package com.auction.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rfq_id", nullable = false)
    @JsonIgnore
    private Rfq rfq;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id", nullable = false)
    private User supplier;

    @Column(nullable = false)
    private String carrierName;

    @Column(nullable = false)
    private Double freightCharges;

    @Column(nullable = false)
    private Double originCharges = 0.0;

    @Column(nullable = false)
    private Double destinationCharges = 0.0;

    @Column(nullable = false)
    private Double totalCharges; // Manually calculate on submission

    @Column(nullable = false)
    private Integer transitTime; // in days

    @Column(nullable = false)
    private LocalDateTime quoteValidity;

    private Integer rank; // L1=1, L2=2, etc. (computed)

    @Column(nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @Column(nullable = false)
    private Boolean isLatest = true; // only latest bid per supplier

    @Column(columnDefinition = "TEXT")
    private String notes;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
