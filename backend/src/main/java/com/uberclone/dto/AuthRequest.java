package com.uberclone.dto;

import com.uberclone.model.Role;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AuthRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @NotBlank String password,
        @NotNull Role role,
        String vehicleNumber,
        String vehicleName,
        String vehicleType,
        String drivingLicenseNumber,
        String rcNumber,
        String insurancePolicyNumber,
        @Min(0) Integer accidentCount,
        @Min(0) Integer challanCount
) {
}
