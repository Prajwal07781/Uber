package com.uberclone.dto;

import com.uberclone.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AuthRequest(
        @NotBlank String name,
        @NotBlank String phone,
        @NotBlank String password,
        @NotNull Role role,
        String vehicleNumber,
        String vehicleName,
        String vehicleType
) {
}
