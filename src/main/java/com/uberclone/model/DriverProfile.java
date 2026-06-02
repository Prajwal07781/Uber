package com.uberclone.model;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
public class DriverProfile {
    public static final long SAFE_DAILY_MINUTES = 8 * 60;
    public static final long OVERTIME_DAILY_MINUTES = 10 * 60;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    private AppUser user;

    @NotBlank
    private String vehicleNumber;

    @NotBlank
    private String vehicleName;

    @Enumerated(EnumType.STRING)
    private VehicleType vehicleType;

    private double latitude;
    private double longitude;
    private boolean available = true;
    private Boolean onDuty = true;
    private int completedTrips;
    private Integer ratingCount = 0;
    private Long dutyMinutesToday = 0L;
    private LocalDate dutyDate = LocalDate.now();
    private LocalDateTime dutyStartedAt = LocalDateTime.now();

    public DriverProfile() {
    }

    public DriverProfile(AppUser user, String vehicleNumber, String vehicleName, VehicleType vehicleType,
                         double latitude, double longitude) {
        this.user = user;
        this.vehicleNumber = vehicleNumber;
        this.vehicleName = vehicleName;
        this.vehicleType = vehicleType;
        this.latitude = latitude;
        this.longitude = longitude;
        startDuty();
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public String getVehicleNumber() {
        return vehicleNumber;
    }

    public String getVehicleName() {
        return vehicleName;
    }

    public VehicleType getVehicleType() {
        return vehicleType;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
        this.longitude = longitude;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public boolean isOnDuty() {
        return onDuty == null || onDuty;
    }

    public void setOnDuty(boolean onDuty) {
        if (onDuty) {
            startDuty();
        } else {
            stopDuty();
        }
    }

    public int getCompletedTrips() {
        return completedTrips;
    }

    public void setCompletedTrips(int completedTrips) {
        this.completedTrips = completedTrips;
    }

    public int getRatingCount() {
        return ratingCount == null ? 0 : ratingCount;
    }

    public void setRatingCount(int ratingCount) {
        this.ratingCount = ratingCount;
    }

    public long getDutyMinutesToday() {
        return dutyMinutesToday == null ? 0 : dutyMinutesToday;
    }

    public void setDutyMinutesToday(long dutyMinutesToday) {
        this.dutyMinutesToday = dutyMinutesToday;
    }

    public LocalDate getDutyDate() {
        return dutyDate;
    }

    public void setDutyDate(LocalDate dutyDate) {
        this.dutyDate = dutyDate;
    }

    public LocalDateTime getDutyStartedAt() {
        return dutyStartedAt;
    }

    public void setDutyStartedAt(LocalDateTime dutyStartedAt) {
        this.dutyStartedAt = dutyStartedAt;
    }

    public void startDuty() {
        refreshDutyDay();
        onDuty = true;
        if (dutyStartedAt == null) {
            dutyStartedAt = LocalDateTime.now();
        }
    }

    public void stopDuty() {
        refreshDutyDay();
        onDuty = false;
        available = false;
        dutyStartedAt = null;
    }

    public long currentDutyMinutes() {
        LocalDate today = LocalDate.now();
        return today.equals(dutyDate) ? getDutyMinutesToday() : 0;
    }

    public String dutyStatus() {
        long minutes = currentDutyMinutes();
        if (minutes >= OVERTIME_DAILY_MINUTES) {
            return "OVERTIME";
        }
        if (minutes >= SAFE_DAILY_MINUTES) {
            return "NEEDS_REST";
        }
        return "SAFE";
    }

    public void refreshDutyDay() {
        LocalDate today = LocalDate.now();
        refreshDutyDay(today);
    }

    public void addCompletedRideMinutes(long minutes, LocalDate completedDate) {
        refreshDutyDay(completedDate == null ? LocalDate.now() : completedDate);
        dutyMinutesToday = getDutyMinutesToday() + Math.max(0, minutes);
    }

    private void refreshDutyDay(LocalDate date) {
        if (dutyDate == null || !date.equals(dutyDate)) {
            dutyDate = date;
            dutyMinutesToday = 0L;
            if (isOnDuty()) {
                dutyStartedAt = date.atStartOfDay();
            }
        }
    }
}
