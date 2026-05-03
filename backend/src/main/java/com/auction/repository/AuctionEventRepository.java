package com.auction.repository;

import com.auction.model.AuctionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuctionEventRepository extends JpaRepository<AuctionEvent, String> {
    List<AuctionEvent> findByRfqIdOrderByCreatedAtDesc(String rfqId);
}
