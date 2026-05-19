package com.uberclone.controller;

import com.uberclone.dto.FareEstimate;
import com.uberclone.dto.RideRequest;
import com.uberclone.dto.RideResponse;
import com.uberclone.model.DriverProfile;
import com.uberclone.model.VehicleType;
import com.uberclone.repository.DriverProfileRepository;
import com.uberclone.service.RideService;
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
import java.util.Map;
import static java.util.Map.entry;

@RestController
@RequestMapping("/api")
public class RideApiController {
    private final RideService rideService;
    private final DriverProfileRepository driverRepository;

    public RideApiController(RideService rideService, DriverProfileRepository driverRepository) {
        this.rideService = rideService;
        this.driverRepository = driverRepository;
    }

    @GetMapping("/fare-estimates")
    public List<FareEstimate> estimate(@RequestParam double pickupLat, @RequestParam double pickupLng,
                                       @RequestParam double dropLat, @RequestParam double dropLng) {
        return rideService.estimate(pickupLat, pickupLng, dropLat, dropLng);
    }

    @PostMapping("/rides")
    public RideResponse requestRide(@Valid @RequestBody RideRequest request) {
        return RideResponse.from(rideService.requestRide(request));
    }

    @GetMapping("/rides")
    public List<RideResponse> rides() {
        return rideService.recentRides().stream().map(RideResponse::from).toList();
    }

    @GetMapping("/rides/active")
    public List<RideResponse> activeRides() {
        return rideService.activeRides().stream().map(RideResponse::from).toList();
    }

    @GetMapping("/riders/{riderId}/rides")
    public List<RideResponse> riderRides(@PathVariable Long riderId) {
        return rideService.riderRides(riderId).stream().map(RideResponse::from).toList();
    }

    @GetMapping("/drivers/{driverId}/rides")
    public List<RideResponse> driverRides(@PathVariable Long driverId) {
        return rideService.driverRides(driverId).stream().map(RideResponse::from).toList();
    }

    @GetMapping("/drivers/{driverId}/requests")
    public List<RideResponse> driverRequests(@PathVariable Long driverId) {
        return rideService.pendingForDriver(driverId).stream().map(RideResponse::from).toList();
    }

    @PatchMapping("/rides/{id}/accept")
    public RideResponse accept(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        return RideResponse.from(rideService.acceptRide(id, body.get("driverId")));
    }

    @PatchMapping("/rides/{id}/start")
    public RideResponse start(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return RideResponse.from(rideService.startRide(id, body.getOrDefault("otp", "")));
    }

    @PatchMapping("/rides/{id}/progress")
    public RideResponse progress(@PathVariable Long id) {
        return RideResponse.from(rideService.updateProgress(id));
    }

    @PatchMapping("/rides/{id}/complete")
    public RideResponse complete(@PathVariable Long id) {
        return RideResponse.from(rideService.completeRide(id));
    }

    @PatchMapping("/rides/{id}/pay")
    public RideResponse pay(@PathVariable Long id) {
        return RideResponse.from(rideService.payRide(id));
    }

    @PatchMapping("/rides/{id}/cancel")
    public RideResponse cancel(@PathVariable Long id) {
        return RideResponse.from(rideService.cancelRide(id));
    }

    @PatchMapping("/rides/{id}/rate")
    public RideResponse rate(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return RideResponse.from(rideService.rateRide(id, body.getOrDefault("rating", 5)));
    }

    @GetMapping("/drivers")
    public List<Map<String, Object>> drivers() {
        return driverRepository.findAll().stream()
                .map(this::driverPayload)
                .toList();
    }

    @GetMapping("/drivers/{id}")
    public Map<String, Object> driver(@PathVariable Long id) {
        return driverPayload(driverRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found")));
    }

    @GetMapping("/drivers/available")
    public List<Map<String, Object>> availableDrivers(@RequestParam VehicleType vehicleType) {
        return driverRepository.findByAvailableTrueAndVehicleType(vehicleType).stream()
                .map(this::driverPayload)
                .toList();
    }

    @PatchMapping("/drivers/{id}/availability")
    public ResponseEntity<Map<String, Object>> availability(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        var driver = driverRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        boolean available = body.getOrDefault("available", true);
        driver.setOnDuty(available);
        driver.setAvailable(available);
        driverRepository.save(driver);
        return ResponseEntity.ok(driverPayload(driver));
    }

    @GetMapping("/vehicles")
    public VehicleType[] vehicles() {
        return VehicleType.values();
    }

    private Map<String, Object> driverPayload(DriverProfile driver) {
        return Map.<String, Object>ofEntries(
                entry("id", driver.getId()),
                entry("name", driver.getUser().getName()),
                entry("phone", driver.getUser().getPhone()),
                entry("rating", driver.getUser().getRating()),
                entry("ratingCount", driver.getRatingCount()),
                entry("vehicleType", driver.getVehicleType()),
                entry("vehicleLabel", driver.getVehicleType().getLabel()),
                entry("seats", driver.getVehicleType().getSeats()),
                entry("vehicle", driver.getVehicleName()),
                entry("number", driver.getVehicleNumber()),
                entry("available", driver.isAvailable()),
                entry("onDuty", driver.isOnDuty()),
                entry("workMinutesToday", driver.currentDutyMinutes()),
                entry("workHoursLabel", workHoursLabel(driver.currentDutyMinutes())),
                entry("workStatus", driver.dutyStatus()),
                entry("safeDailyMinutes", DriverProfile.SAFE_DAILY_MINUTES),
                entry("overtimeDailyMinutes", DriverProfile.OVERTIME_DAILY_MINUTES),
                entry("trips", driver.getCompletedTrips()));
    }

    private String workHoursLabel(long minutes) {
        return "%dh %02dm".formatted(minutes / 60, minutes % 60);
    }
}
