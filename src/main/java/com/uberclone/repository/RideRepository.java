package com.uberclone.repository;

import com.uberclone.model.Ride;
import com.uberclone.model.RideStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findTop20ByOrderByRequestedAtDesc();
    List<Ride> findByStatusInOrderByRequestedAtDesc(List<RideStatus> statuses);
    List<Ride> findByRiderIdOrderByRequestedAtDesc(Long riderId);
    List<Ride> findByDriverIdOrderByRequestedAtDesc(Long driverId);
    List<Ride> findByStatusAndVehicleTypeOrderByRequestedAtDesc(RideStatus status, com.uberclone.model.VehicleType vehicleType);
}
