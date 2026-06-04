package com.uberclone.service;

import com.uberclone.model.DriverProfile;
import com.uberclone.model.Ride;
import com.uberclone.model.RideStatus;
import com.uberclone.repository.AppUserRepository;
import com.uberclone.repository.DriverProfileRepository;
import com.uberclone.repository.RideRepository;
import com.uberclone.websocket.RideEventPublisher;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RideServiceTest {

    @Test
    void driverRideMinutesTodaySumsCompletedRideDurations() {
        DriverProfileRepository driverRepository = mock(DriverProfileRepository.class);
        RideService rideService = new RideService(
                mock(RideRepository.class),
                mock(AppUserRepository.class),
                driverRepository,
                mock(GeoService.class),
                mock(RideEventPublisher.class)
        );
        DriverProfile driver = new DriverProfile();
        driver.setDutyMinutesToday(570);
        driver.setDutyDate(LocalDate.now());

        when(driverRepository.findById(7L)).thenReturn(java.util.Optional.of(driver));

        assertThat(rideService.driverRideMinutesToday(7L)).isEqualTo(570);
        assertThat(rideService.rideHoursStatus(570)).isEqualTo("NEEDS_REST");
    }

    @Test
    void acceptRideThrowsExceptionWhenDriverOverDailyLimit() {
        RideRepository rideRepository = mock(RideRepository.class);
        DriverProfileRepository driverRepository = mock(DriverProfileRepository.class);
        RideService rideService = new RideService(
                rideRepository,
                mock(AppUserRepository.class),
                driverRepository,
                mock(GeoService.class),
                mock(RideEventPublisher.class)
        );

        Ride ride = new Ride();
        ride.setStatus(RideStatus.REQUESTED);
        when(rideRepository.findById(1L)).thenReturn(java.util.Optional.of(ride));

        DriverProfile driver = new DriverProfile();
        driver.refreshDutyDay();
        driver.setDutyMinutesToday(DriverProfile.OVERTIME_DAILY_MINUTES); // 10 hours
        when(driverRepository.findById(2L)).thenReturn(java.util.Optional.of(driver));

        assertThatThrownBy(() -> rideService.acceptRide(1L, 2L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Driver has reached the daily driving limit of 10 hours.");
    }

    @Test
    void completeRideStopsDutyWhenDailyLimitReached() {
        RideRepository rideRepository = mock(RideRepository.class);
        DriverProfileRepository driverRepository = mock(DriverProfileRepository.class);
        RideService rideService = new RideService(
                rideRepository,
                mock(AppUserRepository.class),
                driverRepository,
                mock(GeoService.class),
                mock(RideEventPublisher.class)
        );

        DriverProfile driver = new DriverProfile();
        driver.startDuty();
        driver.setDutyMinutesToday(580); // 9h 40m

        Ride ride = new Ride();
        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now().minusHours(2)); // 2 hours duration
        ride.setDriver(driver);

        when(rideRepository.findById(1L)).thenReturn(java.util.Optional.of(ride));
        when(rideRepository.save(ride)).thenReturn(ride);

        rideService.completeRide(1L);

        // 580 + 120 = 700 minutes (> 600 minutes / 10 hours)
        assertThat(driver.isOnDuty()).isFalse();
        assertThat(driver.isAvailable()).isFalse();
    }

    private Ride completedRide(long durationMinutes) {
        Ride ride = new Ride();
        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDate.now().atTime(12, 0));
        ride.setDurationMinutes(durationMinutes);
        return ride;
    }

    @Test
    void completeRideAddsActualDurationWhenGreaterThanEta() {
        RideRepository rideRepository = mock(RideRepository.class);
        DriverProfileRepository driverRepository = mock(DriverProfileRepository.class);
        RideService rideService = new RideService(
                rideRepository,
                mock(AppUserRepository.class),
                driverRepository,
                mock(GeoService.class),
                mock(RideEventPublisher.class)
        );

        DriverProfile driver = new DriverProfile();
        driver.startDuty();
        driver.setDutyMinutesToday(8); // Start with 8 min

        Ride ride = new Ride();
        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now().minusMinutes(200)); // 200 min elapsed
        ride.setDistanceKm(10.0); // 10 km distance (ETA would be 10 * 2.5 = 25 minutes)
        ride.setDriver(driver);

        when(rideRepository.findById(1L)).thenReturn(java.util.Optional.of(ride));
        when(rideRepository.save(ride)).thenReturn(ride);

        rideService.completeRide(1L);

        // Duty minutes should be 8 (initial) + 200 (actual) = 208 minutes
        assertThat(driver.getDutyMinutesToday()).isEqualTo(208);
    }
}
