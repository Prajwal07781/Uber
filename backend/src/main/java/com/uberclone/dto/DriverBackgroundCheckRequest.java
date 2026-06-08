package com.uberclone.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record DriverBackgroundCheckRequest(
        String driverName,
        @NotBlank String vehicleNumber,
        @NotBlank String drivingLicenseNumber,
        @NotBlank String rcNumber,
        @NotBlank String insurancePolicyNumber,
        @Min(0) Integer accidentCount,
        @Min(0) Integer challanCount
) {
}
