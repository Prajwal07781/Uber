package com.uberclone.dto;

import com.uberclone.model.VehicleType;

public record FareEstimate(VehicleType vehicleType, String label, int seats, double distanceKm, double fare, int etaMinutes) {
}
