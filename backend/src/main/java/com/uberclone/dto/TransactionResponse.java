package com.uberclone.dto;

import com.uberclone.model.PaymentTransaction;
import java.time.format.DateTimeFormatter;

public record TransactionResponse(
        Long id,
        Long rideId,
        double amount,
        String paymentMethod,
        String paymentReference,
        String status,
        String type,
        String description,
        String createdAt
) {
    public static TransactionResponse from(PaymentTransaction tx) {
        return new TransactionResponse(
                tx.getId(),
                tx.getRideId(),
                tx.getAmount(),
                tx.getPaymentMethod(),
                tx.getPaymentReference(),
                tx.getStatus(),
                tx.getType(),
                tx.getDescription(),
                tx.getCreatedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"))
        );
    }
}
