package com.uberclone.config;

import com.uberclone.model.AppUser;
import com.uberclone.model.DriverProfile;
import com.uberclone.model.Role;
import com.uberclone.model.VehicleType;
import com.uberclone.repository.AppUserRepository;
import com.uberclone.repository.DriverProfileRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private final AppUserRepository userRepository;
    private final DriverProfileRepository driverRepository;

    public DataSeeder(AppUserRepository userRepository, DriverProfileRepository driverRepository) {
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        AppUser rider = new AppUser("Prajwal Rider", "9000000001", Role.RIDER);
        rider.setWalletBalance(1500.0);
        userRepository.save(rider);

        seedDriver("Aarav Driver", "9000000101", "KA 05 AB 1234", "Royal Enfield Hunter", VehicleType.BIKE, 12.9716, 77.5946);
        seedDriver("Meera Driver", "9000000102", "KA 03 CD 4567", "Bajaj RE Auto", VehicleType.AUTO, 12.9352, 77.6245);
        seedDriver("Nisha Driver", "9000000104", "KA 51 GH 9090", "Honda City", VehicleType.CAB, 13.0358, 77.5970);
        seedDriver("Kabir Driver", "9000000103", "KA 02 EF 7788", "Toyota Innova", VehicleType.SUV, 12.9850, 77.6050);
    }

    private void seedDriver(String name, String phone, String vehicleNumber, String vehicleName, VehicleType type,
                            double lat, double lng) {
        AppUser user = new AppUser(name, phone, Role.DRIVER);
        user.setWalletBalance(500.0);
        AppUser savedUser = userRepository.save(user);
        driverRepository.save(new DriverProfile(savedUser, vehicleNumber, vehicleName, type, lat, lng));
    }
}
