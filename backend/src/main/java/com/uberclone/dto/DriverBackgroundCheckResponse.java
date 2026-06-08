package com.uberclone.dto;

public record DriverBackgroundCheckResponse(
        boolean approved,
        String status,
        String message,
        String registrySource,
        boolean licenseValid,
        boolean rcValid,
        boolean insuranceValid,
        boolean vehicleBlacklisted,
        int accidentCount,
        int challanCount,
        int maxAccidentCount,
        int maxChallanCount
) {
}
