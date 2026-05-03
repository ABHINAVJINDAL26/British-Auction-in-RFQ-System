package com.auction.repository;

import com.auction.model.Rfq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RfqRepository extends JpaRepository<Rfq, String> {
    
    @Query("SELECT r FROM Rfq r ORDER BY r.bidCloseTime ASC")
    List<Rfq> findAllOrderByBidCloseTimeAsc();
}
