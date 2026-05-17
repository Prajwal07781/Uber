package com.uberclone.dto;

import com.uberclone.model.Ride;

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
        String otp,
        int progressPercent,
        double pickupLat,
        double pickupLng,
        double dropLat,
        double dropLng,
        String requestedAt
) {
    public static RideResponse from(Ride ride) {
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
                ride.getStartOtp(),
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
}
