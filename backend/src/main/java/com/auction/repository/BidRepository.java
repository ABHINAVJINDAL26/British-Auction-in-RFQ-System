package com.auction.repository;

import com.auction.model.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidRepository extends JpaRepository<Bid, String> {
    List<Bid> findByRfqIdAndIsLatestTrueOrderByTotalChargesAsc(String rfqId);
    List<Bid> findByRfqIdAndSupplierId(String rfqId, String supplierId);
}
