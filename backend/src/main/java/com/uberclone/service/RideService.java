package com.uberclone.service;

import com.uberclone.dto.FareEstimate;
import com.uberclone.dto.RideRequest;
import com.uberclone.model.DriverProfile;
import com.uberclone.model.Ride;
import com.uberclone.model.RideStatus;
import com.uberclone.model.VehicleType;
import com.uberclone.repository.AppUserRepository;
import com.uberclone.repository.DriverProfileRepository;
import com.uberclone.repository.RideRepository;
import com.uberclone.websocket.RideEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

@Service
public class RideService {
    private final RideRepository rideRepository;
    private final AppUserRepository userRepository;
    private final DriverProfileRepository driverRepository;
    private final GeoService geoService;
    private final RideEventPublisher rideEventPublisher;
    private final Random random = new Random();

    public RideService(RideRepository rideRepository, AppUserRepository userRepository,
                       DriverProfileRepository driverRepository, GeoService geoService,
                       RideEventPublisher rideEventPublisher) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverRepository = driverRepository;
        this.geoService = geoService;
        this.rideEventPublisher = rideEventPublisher;
    }

    public List<FareEstimate> estimate(double pickupLat, double pickupLng, double dropLat, double dropLng) {
        double distance = geoService.distanceKm(pickupLat, pickupLng, dropLat, dropLng);
        return List.of(VehicleType.BIKE, VehicleType.AUTO, VehicleType.CAB, VehicleType.SUV).stream()
                .map(type -> new FareEstimate(type, type.getLabel(), type.getSeats(), round(distance), fare(type, distance), etaMinutes(distance)))
                .toList();
    }

    @Transactional
    public Ride requestRide(RideRequest request) {
        var rider = userRepository.findById(request.riderId())
                .orElseThrow(() -> new IllegalArgumentException("Rider not found"));
        double distance = geoService.distanceKm(request.pickupLat(), request.pickupLng(), request.dropLat(), request.dropLng());

        Ride ride = new Ride();
        ride.setRider(rider);
        ride.setPickupAddress(request.pickupAddress());
        ride.setDropAddress(request.dropAddress());
        ride.setPickupLat(request.pickupLat());
        ride.setPickupLng(request.pickupLng());
        ride.setDropLat(request.dropLat());
        ride.setDropLng(request.dropLng());
        ride.setDistanceKm(distance);
        ride.setVehicleType(request.vehicleType());
        ride.setFare(fare(request.vehicleType(), distance));

        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride acceptRide(Long rideId, Long driverId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new IllegalStateException("Ride is no longer available");
        }
        DriverProfile driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        driver.refreshDutyDay();
        if (driver.currentDutyMinutes() >= DriverProfile.OVERTIME_DAILY_MINUTES) {
            throw new IllegalStateException("Driver has reached the daily driving limit of 10 hours.");
        }
        if (!driver.isAvailable()) {
            throw new IllegalStateException("Driver is not available");
        }
        driver.startDuty();
        if (driver.getVehicleType() != ride.getVehicleType()) {
            throw new IllegalStateException("Driver vehicle type does not match this ride");
        }
        ride.setDriver(driver);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setStartOtp(String.valueOf(1000 + random.nextInt(9000)));
        driver.setAvailable(false);
        driverRepository.save(driver);
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride startRide(Long rideId, String otp) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.ACCEPTED) {
            throw new IllegalStateException("Ride must be accepted before it can start");
        }
        if (ride.getStartOtp() == null || !ride.getStartOtp().equals(otp)) {
            throw new IllegalStateException("Invalid OTP");
        }
        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setProgressPercent(8);
        ride.setStartedAt(LocalDateTime.now());
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride updateProgress(Long rideId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new IllegalStateException("Ride must be in progress for live tracking");
        }
        ride.setProgressPercent(Math.min(100, ride.getProgressPercent() + 14));
        if (ride.getProgressPercent() >= 100) {
            finishRide(ride);
        }
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride completeRide(Long rideId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new IllegalStateException("Ride must be in progress before completion");
        }
        finishRide(ride);
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride payRide(Long rideId, String paymentMethod) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new IllegalStateException("Ride must be completed before payment");
        }
        String method = paymentMethod == null || paymentMethod.isBlank() ? "UPI" : paymentMethod.trim().toUpperCase();
        ride.setPaid(true);
        ride.setPaymentMethod(method);
        ride.setPaymentReference("PAY-" + ride.getId() + "-" + (10000 + random.nextInt(90000)));
        ride.setPaidAt(LocalDateTime.now());
        if (ride.getDriver() != null) {
            DriverProfile driver = ride.getDriver();
            driver.refreshDutyDay();
            if (driver.currentDutyMinutes() >= DriverProfile.OVERTIME_DAILY_MINUTES) {
                driver.stopDuty();
            } else {
                driver.setAvailable(driver.isOnDuty());
            }
            driverRepository.save(driver);
        }
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride cancelRide(Long rideId) {
        Ride ride = getRide(rideId);
        if (ride.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Completed rides cannot be cancelled");
        }
        ride.setStatus(RideStatus.CANCELLED);
        if (ride.getDriver() != null) {
            DriverProfile driver = ride.getDriver();
            driver.refreshDutyDay();
            if (driver.currentDutyMinutes() < DriverProfile.OVERTIME_DAILY_MINUTES && driver.isOnDuty()) {
                driver.setAvailable(true);
            } else {
                driver.setAvailable(false);
            }
            driverRepository.save(driver);
        }
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    @Transactional
    public Ride rateRide(Long rideId, int rating) {
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5");
        }
        Ride ride = getRide(rideId);
        Integer previousRating = ride.getRiderRating();
        ride.setRiderRating(rating);
        if (ride.getDriver() != null) {
            DriverProfile driver = ride.getDriver();
            var user = driver.getUser();
            int ratingCount = driver.getRatingCount();
            if (previousRating == null) {
                ratingCount++;
            } else if (ratingCount == 0) {
                ratingCount = 1;
            }
            double previousTotal = previousRating == null
                    ? user.getRating() * Math.max(0, ratingCount - 1)
                    : user.getRating() * ratingCount - previousRating;
            driver.setRatingCount(ratingCount);
            user.setRating(round((previousTotal + rating) / ratingCount));
            userRepository.save(user);
            driverRepository.save(driver);
        }
        Ride saved = rideRepository.save(ride);
        rideEventPublisher.rideChanged(saved);
        return saved;
    }

    public Ride getRide(Long id) {
        return rideRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Ride not found"));
    }

    public List<Ride> recentRides() {
        return rideRepository.findTop20ByOrderByRequestedAtDesc();
    }

    public List<Ride> activeRides() {
        return rideRepository.findByStatusInOrderByRequestedAtDesc(
                List.of(RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.IN_PROGRESS));
    }

    public List<Ride> riderRides(Long riderId) {
        return rideRepository.findByRiderIdOrderByRequestedAtDesc(riderId);
    }

    public List<Ride> driverRides(Long driverId) {
        return rideRepository.findByDriverIdOrderByRequestedAtDesc(driverId);
    }

    public long driverRideMinutesToday(Long driverId) {
        return driverRepository.findById(driverId)
                .map(DriverProfile::currentDutyMinutes)
                .orElse(0L);
    }

    public String rideHoursStatus(long minutes) {
        if (minutes >= DriverProfile.OVERTIME_DAILY_MINUTES) {
            return "OVERTIME";
        }
        if (minutes >= DriverProfile.SAFE_DAILY_MINUTES) {
            return "NEEDS_REST";
        }
        return "SAFE";
    }

    public List<Ride> pendingForDriver(Long driverId) {
        DriverProfile driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        return rideRepository.findByStatusAndVehicleTypeOrderByRequestedAtDesc(RideStatus.REQUESTED, driver.getVehicleType()).stream()
                .sorted(Comparator
                        .comparingDouble((Ride ride) -> geoService.distanceKm(
                                driver.getLatitude(), driver.getLongitude(), ride.getPickupLat(), ride.getPickupLng()))
                        .thenComparing(Ride::getRequestedAt))
                .toList();
    }

    private double fare(VehicleType type, double distance) {
        return round(type.getBaseFare() + (distance * type.getPerKmFare()) + 18);
    }

    private void finishRide(Ride ride) {
        LocalDateTime completedAt = LocalDateTime.now();
        ride.setStatus(RideStatus.COMPLETED);
        ride.setProgressPercent(100);
        ride.setCompletedAt(completedAt);
        if (ride.getStartedAt() == null) {
            ride.setStartedAt(ride.getRequestedAt() == null ? completedAt : ride.getRequestedAt());
        }
        long rideMinutes = rideMinutes(ride.getStartedAt(), completedAt);
        if (ride.getDistanceKm() > 0.0) {
            rideMinutes = Math.max(rideMinutes, (long) etaMinutes(ride.getDistanceKm()));
        }
        ride.setDurationMinutes(rideMinutes);
        if (ride.getDriver() != null) {
            DriverProfile driver = ride.getDriver();
            driver.addCompletedRideMinutes(rideMinutes, completedAt.toLocalDate());
            driver.setCompletedTrips(driver.getCompletedTrips() + 1);
            driver.setLatitude(ride.getDropLat());
            driver.setLongitude(ride.getDropLng());
            if (driver.currentDutyMinutes() >= DriverProfile.OVERTIME_DAILY_MINUTES) {
                driver.stopDuty();
            }
            driverRepository.save(driver);
        }
    }

    private long rideMinutes(LocalDateTime startedAt, LocalDateTime completedAt) {
        long seconds = Math.max(0, Duration.between(startedAt, completedAt).toSeconds());
        return Math.max(1, (seconds + 59) / 60);
    }

    private long completedRideMinutes(Ride ride) {
        if (ride.getDurationMinutes() != null && ride.getDurationMinutes() > 0) {
            return ride.getDurationMinutes();
        }
        LocalDateTime finishedAt = rideFinishedAt(ride);
        if (finishedAt == null && ride.getStatus() == RideStatus.COMPLETED) {
            finishedAt = LocalDateTime.now();
        }
        if (finishedAt == null) return 0;
        LocalDateTime startedAt = ride.getStartedAt() == null ? ride.getRequestedAt() : ride.getStartedAt();
        return startedAt == null ? 0 : rideMinutes(startedAt, finishedAt);
    }

    private boolean happenedOn(Ride ride, LocalDate date) {
        return isSameDate(ride.getCompletedAt(), date)
                || isSameDate(ride.getPaidAt(), date)
                || isSameDate(ride.getStartedAt(), date)
                || isSameDate(ride.getRequestedAt(), date);
    }

    private boolean isSameDate(LocalDateTime value, LocalDate date) {
        return value != null && value.toLocalDate().equals(date);
    }

    private LocalDateTime rideFinishedAt(Ride ride) {
        if (ride.getCompletedAt() != null) {
            return ride.getCompletedAt();
        }
        return ride.getPaidAt();
    }

    private int etaMinutes(double distance) {
        return Math.max(3, (int) Math.round(distance * 2.5));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
