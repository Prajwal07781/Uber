package com.uberclone.websocket;

import com.uberclone.dto.RideResponse;
import com.uberclone.model.Ride;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class RideEventPublisher {
    private final RideWebSocketHandler rideWebSocketHandler;

    public RideEventPublisher(RideWebSocketHandler rideWebSocketHandler) {
        this.rideWebSocketHandler = rideWebSocketHandler;
    }

    public void rideChanged(Ride ride) {
        rideWebSocketHandler.broadcast(Map.of(
                "type", "RIDE_UPDATED",
                "ride", RideResponse.from(ride)
        ));
    }

    public void driverAvailabilityChanged(Long driverId) {
        rideWebSocketHandler.broadcast(Map.of(
                "type", "DRIVER_UPDATED",
                "driverId", driverId
        ));
    }
}
