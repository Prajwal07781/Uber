package com.uberclone.dto;

import com.uberclone.model.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RideRequest(
        @NotNull Long riderId,
        @NotBlank String pickupAddress,
        @NotBlank String dropAddress,
        double pickupLat,
        double pickupLng,
        double dropLat,
        double dropLng,
        @NotNull VehicleType vehicleType
) {
}
