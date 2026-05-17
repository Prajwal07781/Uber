package com.uberclone.repository;

import com.uberclone.model.DriverProfile;
import com.uberclone.model.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, Long> {
    List<DriverProfile> findByAvailableTrue();
    List<DriverProfile> findByAvailableTrueAndVehicleType(VehicleType vehicleType);
    Optional<DriverProfile> findByUserId(Long userId);
}
