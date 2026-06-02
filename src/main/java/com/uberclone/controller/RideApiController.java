package com.uberclone.controller;

import com.uberclone.dto.FareEstimate;
import com.uberclone.dto.RideRequest;
import com.uberclone.dto.RideResponse;
import com.uberclone.model.DriverProfile;
import com.uberclone.model.VehicleType;
import com.uberclone.repository.DriverProfileRepository;
import com.uberclone.service.GeoService;
import com.uberclone.service.RideService;
import com.uberclone.websocket.RideEventPublisher;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Comparator;

@RestController
@RequestMapping("/api")
public class RideApiController {
    private final RideService rideService;
    private final DriverProfileRepository driverRepository;
    private final GeoService geoService;
    private final RideEventPublisher rideEventPublisher;

    public RideApiController(RideService rideService, DriverProfileRepository driverRepository,
                             GeoService geoService, RideEventPublisher rideEventPublisher) {
        this.rideService = rideService;
        this.driverRepository = driverRepository;
        this.geoService = geoService;
        this.rideEventPublisher = rideEventPublisher;
    }

    @GetMapping("/fare-estimates")
    public List<FareEstimate> estimate(@RequestParam double pickupLat, @RequestParam double pickupLng,
                                       @RequestParam double dropLat, @RequestParam double dropLng) {
        return rideService.estimate(pickupLat, pickupLng, dropLat, dropLng);
    }

    @PostMapping("/rides")
    public RideResponse requestRide(@Valid @RequestBody RideRequest request) {
        return rideResponse(rideService.requestRide(request));
    }

    @GetMapping("/rides")
    public List<RideResponse> rides() {
        return rideService.recentRides().stream().map(this::rideResponse).toList();
    }

    @GetMapping("/rides/active")
    public List<RideResponse> activeRides() {
        return rideService.activeRides().stream().map(this::rideResponse).toList();
    }

    @GetMapping("/riders/{riderId}/rides")
    public List<RideResponse> riderRides(@PathVariable Long riderId) {
        return rideService.riderRides(riderId).stream().map(this::rideResponse).toList();
    }

    @GetMapping("/drivers/{driverId}/rides")
    public List<RideResponse> driverRides(@PathVariable Long driverId) {
        long rideMinutesToday = rideService.driverRideMinutesToday(driverId);
        String rideHoursStatus = rideService.rideHoursStatus(rideMinutesToday);
        return rideService.driverRides(driverId).stream()
                .map(ride -> RideResponse.from(ride, rideMinutesToday, rideHoursStatus))
                .toList();
    }

    @GetMapping("/drivers/{driverId}/requests")
    public List<RideResponse> driverRequests(@PathVariable Long driverId) {
        return rideService.pendingForDriver(driverId).stream().map(this::rideResponse).toList();
    }

    @PatchMapping("/rides/{id}/accept")
    public RideResponse accept(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        return rideResponse(rideService.acceptRide(id, body.get("driverId")));
    }

    @PatchMapping("/rides/{id}/start")
    public RideResponse start(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return rideResponse(rideService.startRide(id, body.getOrDefault("otp", "")));
    }

    @PatchMapping("/rides/{id}/progress")
    public RideResponse progress(@PathVariable Long id) {
        return rideResponse(rideService.updateProgress(id));
    }

    @PatchMapping("/rides/{id}/complete")
    public RideResponse complete(@PathVariable Long id) {
        return rideResponse(rideService.completeRide(id));
    }

    @PatchMapping("/rides/{id}/pay")
    public RideResponse pay(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        String method = body == null ? "UPI" : body.getOrDefault("method", "UPI");
        return rideResponse(rideService.payRide(id, method));
    }

    @PatchMapping("/rides/{id}/cancel")
    public RideResponse cancel(@PathVariable Long id) {
        return rideResponse(rideService.cancelRide(id));
    }

    @PatchMapping("/rides/{id}/rate")
    public RideResponse rate(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return rideResponse(rideService.rateRide(id, body.getOrDefault("rating", 5)));
    }

    @GetMapping("/drivers")
    public List<Map<String, Object>> drivers() {
        return driverRepository.findAll().stream()
                .map(driver -> driverPayload(driver, null, null))
                .toList();
    }

    @GetMapping("/drivers/{id}")
    public Map<String, Object> driver(@PathVariable Long id) {
        return driverPayload(driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found")), null, null);
    }

    @GetMapping("/drivers/available")
    public List<Map<String, Object>> availableDrivers(@RequestParam VehicleType vehicleType,
                                                      @RequestParam(required = false) Double pickupLat,
                                                      @RequestParam(required = false) Double pickupLng) {
        return driverRepository.findByAvailableTrueAndVehicleType(vehicleType).stream()
                .sorted(driverComparator(pickupLat, pickupLng))
                .map(driver -> driverPayload(driver, pickupLat, pickupLng))
                .toList();
    }

    @PatchMapping("/drivers/{id}/availability")
    public ResponseEntity<Map<String, Object>> availability(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        var driver = driverRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        boolean available = body.getOrDefault("available", true);
        if (available) {
            long rideMinutesToday = rideService.driverRideMinutesToday(driver.getId());
            if (rideMinutesToday >= DriverProfile.OVERTIME_DAILY_MINUTES) {
                throw new IllegalStateException("You have reached your daily driving limit of 10 hours. Please rest and try again tomorrow.");
            }
        }
        driver.setOnDuty(available);
        driver.setAvailable(available);
        driverRepository.save(driver);
        rideEventPublisher.driverAvailabilityChanged(driver.getId());
        return ResponseEntity.ok(driverPayload(driver, null, null));
    }

    @GetMapping("/vehicles")
    public VehicleType[] vehicles() {
        return VehicleType.values();
    }

    private Comparator<DriverProfile> driverComparator(Double pickupLat, Double pickupLng) {
        return Comparator
                .comparingDouble((DriverProfile driver) -> matchScore(driver, pickupLat, pickupLng))
                .thenComparing(driver -> driver.getUser().getName());
    }

    private double matchScore(DriverProfile driver, Double pickupLat, Double pickupLng) {
        double distance = pickupLat == null || pickupLng == null
                ? 0
                : geoService.distanceKm(driver.getLatitude(), driver.getLongitude(), pickupLat, pickupLng);
        double safetyPenalty = switch (rideService.rideHoursStatus(rideService.driverRideMinutesToday(driver.getId()))) {
            case "SAFE" -> 0;
            case "NEEDS_REST" -> 4;
            default -> 9;
        };
        double ratingBoost = Math.max(0, 5 - driver.getUser().getRating());
        double experienceBoost = Math.max(0, 20 - driver.getCompletedTrips()) / 20.0;
        return distance + safetyPenalty + ratingBoost + experienceBoost;
    }

    private Map<String, Object> driverPayload(DriverProfile driver, Double pickupLat, Double pickupLng) {
        long rideMinutesToday = rideService.driverRideMinutesToday(driver.getId());
        String rideHoursStatus = rideService.rideHoursStatus(rideMinutesToday);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", driver.getId());
        payload.put("name", driver.getUser().getName());
        payload.put("phone", driver.getUser().getPhone());
        payload.put("rating", driver.getUser().getRating());
        payload.put("ratingCount", driver.getRatingCount());
        payload.put("vehicleType", driver.getVehicleType());
        payload.put("vehicleLabel", driver.getVehicleType().getLabel());
        payload.put("seats", driver.getVehicleType().getSeats());
        payload.put("vehicle", driver.getVehicleName());
        payload.put("number", driver.getVehicleNumber());
        payload.put("available", driver.isAvailable());
        payload.put("onDuty", driver.isOnDuty());
        payload.put("latitude", driver.getLatitude());
        payload.put("longitude", driver.getLongitude());
        payload.put("workMinutesToday", rideMinutesToday);
        payload.put("workHoursLabel", workHoursLabel(rideMinutesToday));
        payload.put("workStatus", rideHoursStatus);
        payload.put("safeDailyMinutes", DriverProfile.SAFE_DAILY_MINUTES);
        payload.put("overtimeDailyMinutes", DriverProfile.OVERTIME_DAILY_MINUTES);
        payload.put("trips", driver.getCompletedTrips());
        if (pickupLat != null && pickupLng != null) {
            double distance = geoService.distanceKm(driver.getLatitude(), driver.getLongitude(), pickupLat, pickupLng);
            payload.put("pickupDistanceKm", Math.round(distance * 100.0) / 100.0);
            payload.put("etaToPickupMinutes", Math.max(2, (int) Math.round(distance * 3.2)));
            payload.put("matchScore", Math.round(matchScore(driver, pickupLat, pickupLng) * 100.0) / 100.0);
        }
        return payload;
    }

    private RideResponse rideResponse(com.uberclone.model.Ride ride) {
        if (ride.getDriver() == null) {
            return RideResponse.from(ride);
        }
        long rideMinutesToday = rideService.driverRideMinutesToday(ride.getDriver().getId());
        return RideResponse.from(ride, rideMinutesToday, rideService.rideHoursStatus(rideMinutesToday));
    }

    private String workHoursLabel(long minutes) {
        if (minutes < 60) {
            return "%d min".formatted(minutes);
        }
        return "%dh %02dm".formatted(minutes / 60, minutes % 60);
    }
}
