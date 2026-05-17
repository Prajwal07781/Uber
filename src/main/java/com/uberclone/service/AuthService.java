package com.uberclone.service;

import com.uberclone.dto.AuthRequest;
import com.uberclone.dto.LoginRequest;
import com.uberclone.dto.UserResponse;
import com.uberclone.model.AppUser;
import com.uberclone.model.DriverProfile;
import com.uberclone.model.Role;
import com.uberclone.model.VehicleType;
import com.uberclone.repository.AppUserRepository;
import com.uberclone.repository.DriverProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final AppUserRepository userRepository;
    private final DriverProfileRepository driverRepository;

    public AuthService(AppUserRepository userRepository, DriverProfileRepository driverRepository) {
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
    }

    @Transactional
    public UserResponse signup(AuthRequest request) {
        if (userRepository.existsByPhoneAndRole(request.phone(), request.role())) {
            throw new IllegalArgumentException("Account already exists for this phone and role");
        }

        AppUser user = userRepository.save(new AppUser(request.name(), request.phone(), request.password(), request.role()));
        Long driverId = null;
        if (request.role() == Role.DRIVER) {
            VehicleType type = request.vehicleType() == null || request.vehicleType().isBlank()
                    ? VehicleType.CAB
                    : VehicleType.valueOf(request.vehicleType());
            DriverProfile driver = driverRepository.save(new DriverProfile(
                    user,
                    valueOrDefault(request.vehicleNumber(), "KA 00 NEW"),
                    valueOrDefault(request.vehicleName(), "Demo Cab"),
                    type,
                    12.9716,
                    77.5946
            ));
            driverId = driver.getId();
        }
        return UserResponse.from(user, driverId);
    }

    public UserResponse login(LoginRequest request) {
        AppUser user = userRepository.findByPhoneAndRole(request.phone(), request.role())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!user.getPassword().equals(request.password())) {
            throw new IllegalArgumentException("Invalid password");
        }
        Long driverId = request.role() == Role.DRIVER
                ? driverRepository.findByUserId(user.getId()).map(DriverProfile::getId).orElse(null)
                : null;
        return UserResponse.from(user, driverId);
    }

    private String valueOrDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
