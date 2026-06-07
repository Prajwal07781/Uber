package com.uberclone.repository;

import com.uberclone.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
    List<PaymentTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);
}
