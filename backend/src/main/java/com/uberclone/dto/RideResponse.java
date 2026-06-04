package com.uberclone.dto;

import com.uberclone.model.Ride;
import com.uberclone.model.RideStatus;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record RideResponse(
        Long id,
        String riderName,
        String driverName,
        String driverPhone,
        String vehicle,
        String pickupAddress,
        String dropAddress,
        double distanceKm,
        double fare,
        String vehicleType,
        String vehicleLabel,
        String status,
        boolean paid,
        String paymentMethod,
        String paymentReference,
        String paidAt,
        String otp,
        Integer riderRating,
        double driverRating,
        long durationMinutes,
        long driverWorkMinutesToday,
        String driverWorkStatus,
        boolean driverOnDuty,
        int progressPercent,
        double pickupLat,
        double pickupLng,
        double dropLat,
        double dropLng,
        String requestedAt
) {
    public static RideResponse from(Ride ride) {
        var driver = ride.getDriver();
        return from(
                ride,
                driver == null ? 0 : driver.currentDutyMinutes(),
                driver == null ? "UNKNOWN" : driver.dutyStatus()
        );
    }

    public static RideResponse from(Ride ride, long driverWorkMinutesToday, String driverWorkStatus) {
        var driver = ride.getDriver();
        return new RideResponse(
                ride.getId(),
                ride.getRider().getName(),
                driver == null ? "Searching" : driver.getUser().getName(),
                driver == null ? "" : driver.getUser().getPhone(),
                driver == null ? "" : driver.getVehicleName() + " - " + driver.getVehicleNumber(),
                ride.getPickupAddress(),
                ride.getDropAddress(),
                round(ride.getDistanceKm()),
                round(ride.getFare()),
                ride.getVehicleType().name(),
                ride.getVehicleType().getLabel(),
                ride.getStatus().name(),
                ride.isPaid(),
                ride.getPaymentMethod(),
                ride.getPaymentReference(),
                ride.getPaidAt() == null ? "" : ride.getPaidAt().format(DateTimeFormatter.ofPattern("dd MMM, hh:mm a")),
                ride.getStartOtp(),
                ride.getRiderRating(),
                driver == null ? 0 : round(driver.getUser().getRating()),
                responseDurationMinutes(ride),
                driver == null ? 0 : driverWorkMinutesToday,
                driver == null ? "UNKNOWN" : driverWorkStatus,
                driver != null && driver.isOnDuty(),
                ride.getProgressPercent(),
                ride.getPickupLat(),
                ride.getPickupLng(),
                ride.getDropLat(),
                ride.getDropLng(),
                ride.getRequestedAt().format(DateTimeFormatter.ofPattern("dd MMM, hh:mm a"))
        );
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static long responseDurationMinutes(Ride ride) {
        if (ride.getDurationMinutes() != null && ride.getDurationMinutes() > 0) {
            return ride.getDurationMinutes();
        }
        LocalDateTime finishedAt = ride.getCompletedAt() == null ? ride.getPaidAt() : ride.getCompletedAt();
        if (finishedAt == null && ride.getStatus() == RideStatus.COMPLETED) {
            finishedAt = LocalDateTime.now();
        }
        LocalDateTime startedAt = ride.getStartedAt() == null ? ride.getRequestedAt() : ride.getStartedAt();
        if (startedAt == null || finishedAt == null) {
            return 0;
        }
        long seconds = Math.max(0, Duration.between(startedAt, finishedAt).toSeconds());
        return Math.max(1, (seconds + 59) / 60);
    }
}
