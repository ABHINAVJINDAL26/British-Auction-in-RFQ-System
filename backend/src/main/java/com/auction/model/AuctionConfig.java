package com.auction.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "auction_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuctionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rfq_id", nullable = false, unique = true)
    @JsonIgnore
    private Rfq rfq;

    @Column(nullable = false)
    private Integer triggerWindowX; // minutes before close to monitor

    @Column(nullable = false)
    private Integer extensionDurationY; // minutes to extend when triggered

    @Column(nullable = false)
    private String triggerType; // BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
