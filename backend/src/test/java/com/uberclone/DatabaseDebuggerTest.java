package com.uberclone;

import com.uberclone.model.Ride;
import com.uberclone.model.DriverProfile;
import com.uberclone.repository.RideRepository;
import com.uberclone.repository.DriverProfileRepository;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@SpringBootTest
class DatabaseDebuggerTest {

    private static Path tempDbPath;

    @BeforeAll
    static void setupTempDb() throws IOException {
        Path originalDb = Paths.get("./data/uberdb.mv.db");
        if (Files.exists(originalDb)) {
            tempDbPath = Files.createTempFile("uberdb_temp", "");
            // Copy to temp without .mv.db suffix (H2 expects prefix)
            String tempPrefix = tempDbPath.toString();
            Files.copy(originalDb, Paths.get(tempPrefix + ".mv.db"), StandardCopyOption.REPLACE_EXISTING);
            System.setProperty("temp.db.url", "jdbc:h2:file:" + tempPrefix + ";DB_CLOSE_DELAY=-1;ACCESS_MODE_DATA=r");
        } else {
            System.setProperty("temp.db.url", "jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1");
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("temp.db.url"));
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }

    @Autowired
    private RideRepository rideRepository;

    @Autowired
    private DriverProfileRepository driverRepository;

    @Test
    void debugDatabase() {
        System.out.println("=== DRIVERS IN DATABASE ===");
        List<DriverProfile> drivers = driverRepository.findAll();
        for (DriverProfile d : drivers) {
            System.out.printf("Driver ID: %d, Name: %s, DutyMinutesToday: %d, DutyDate: %s, OnDuty: %b, Available: %b%n",
                    d.getId(), d.getUser().getName(), d.getDutyMinutesToday(), d.getDutyDate(), d.isOnDuty(), d.isAvailable());
        }

        System.out.println("=== COMPLETED RIDES IN DATABASE ===");
        List<Ride> rides = rideRepository.findAll();
        for (Ride r : rides) {
            System.out.printf("Ride ID: %d, Status: %s, Driver ID: %s, DurationMinutes: %s, StartedAt: %s, CompletedAt: %s, RequestedAt: %s%n",
                    r.getId(), r.getStatus(), r.getDriver() != null ? r.getDriver().getId() : "null",
                    r.getDurationMinutes(), r.getStartedAt(), r.getCompletedAt(), r.getRequestedAt());
        }
    }
}
