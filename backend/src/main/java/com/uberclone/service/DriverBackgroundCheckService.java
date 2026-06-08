package com.uberclone.service;

import com.uberclone.dto.AuthRequest;
import com.uberclone.dto.DriverBackgroundCheckRequest;
import com.uberclone.dto.DriverBackgroundCheckResponse;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class DriverBackgroundCheckService {
    public static final int MAX_ACCIDENT_COUNT = 2;
    public static final int MAX_CHALLAN_COUNT = 5;
    private static final String MOCK_REGISTRY = "Local transport safety registry";
    private static final Map<String, RegistryRecord> REGISTRY = Map.of(
            "KA05AB1234|DLKA20240001", new RegistryRecord(true, true, true, false, 0, 1),
            "KA03CD4567|DLKA20240002", new RegistryRecord(true, true, true, false, 1, 3),
            "KA51GH9090|DLKA20240003", new RegistryRecord(true, true, true, false, 2, 4),
            "KA02EF7788|DLKA20240004", new RegistryRecord(true, true, true, false, 0, 0),
            "KA09BAD1111|DLKA20249999", new RegistryRecord(true, true, true, false, 4, 2),
            "KA10BLK2222|DLKA20248888", new RegistryRecord(true, true, true, true, 1, 1),
            "KA11EXP3333|DLKA20247777", new RegistryRecord(true, true, false, false, 0, 2),
            "KA12REV4444|DLKA20246666", new RegistryRecord(false, true, true, false, 0, 0)
    );

    public DriverBackgroundCheckResponse assess(DriverBackgroundCheckRequest request) {
        return assess(
                request.vehicleNumber(),
                request.drivingLicenseNumber(),
                request.rcNumber(),
                request.insurancePolicyNumber(),
                request.accidentCount(),
                request.challanCount()
        );
    }

    public DriverBackgroundCheckResponse verifyEligible(AuthRequest request) {
        DriverBackgroundCheckResponse result = assess(
                request.vehicleNumber(),
                request.drivingLicenseNumber(),
                request.rcNumber(),
                request.insurancePolicyNumber(),
                request.accidentCount(),
                request.challanCount()
        );
        if (!result.approved()) {
            throw new IllegalArgumentException(result.message());
        }
        return result;
    }

    private DriverBackgroundCheckResponse assess(String vehicleNumber, String licenseNumber, String rcNumber,
                                                String insurancePolicyNumber, Integer accidentCount, Integer challanCount) {
        if (vehicleNumber == null || vehicleNumber.isBlank()) {
            return rejected("Vehicle number is required to check the driver's vehicle history.", false, false, false, false, 0, 0);
        }
        if (licenseNumber == null || licenseNumber.isBlank()) {
            return rejected("Driving license number is required to verify the driver.", false, false, false, false, 0, 0);
        }
        if (rcNumber == null || rcNumber.isBlank()) {
            return rejected("RC number is required to verify the vehicle registration.", false, false, false, false, 0, 0);
        }
        if (insurancePolicyNumber == null || insurancePolicyNumber.isBlank()) {
            return rejected("Insurance policy number is required to verify active vehicle coverage.", false, false, false, false, 0, 0);
        }

        RegistryRecord record = REGISTRY.getOrDefault(registryKey(vehicleNumber, licenseNumber),
                new RegistryRecord(true, true, true, false,
                        Math.max(0, accidentCount == null ? 0 : accidentCount),
                        Math.max(0, challanCount == null ? 0 : challanCount)));

        boolean rcValid = record.rcValid() && rcMatchesVehicle(vehicleNumber, rcNumber);
        boolean insuranceValid = record.insuranceValid() && insurancePolicyNumber.trim().toUpperCase(Locale.ROOT).startsWith("INS");
        int accidents = record.accidentCount();
        int challans = record.challanCount();

        if (!record.licenseValid()) {
            return rejected("Driver verification failed: driving license is invalid or suspended.",
                    false, rcValid, insuranceValid, record.vehicleBlacklisted(), accidents, challans);
        }
        if (!rcValid) {
            return rejected("Driver verification failed: RC details do not match the vehicle record.",
                    record.licenseValid(), false, insuranceValid, record.vehicleBlacklisted(), accidents, challans);
        }
        if (!insuranceValid) {
            return pendingReview("Driver verification needs review: insurance policy is expired or could not be validated.",
                    record.licenseValid(), rcValid, false, record.vehicleBlacklisted(), accidents, challans);
        }
        if (record.vehicleBlacklisted()) {
            return rejected("Driver verification failed: vehicle is blacklisted in the transport safety registry.",
                    record.licenseValid(), rcValid, insuranceValid, true, accidents, challans);
        }

        if (accidents > MAX_ACCIDENT_COUNT && challans > MAX_CHALLAN_COUNT) {
            return rejected(
                    "Driver verification failed: accident history and vehicle challans are above the allowed safety limits.",
                    record.licenseValid(),
                    rcValid,
                    insuranceValid,
                    record.vehicleBlacklisted(),
                    accidents,
                    challans
            );
        }
        if (accidents > MAX_ACCIDENT_COUNT) {
            return rejected(
                    "Driver verification failed: accident history is above the allowed safety limit.",
                    record.licenseValid(),
                    rcValid,
                    insuranceValid,
                    record.vehicleBlacklisted(),
                    accidents,
                    challans
            );
        }
        if (challans > MAX_CHALLAN_COUNT) {
            return rejected(
                    "Driver verification failed: vehicle challans are above the allowed safety limit.",
                    record.licenseValid(),
                    rcValid,
                    insuranceValid,
                    record.vehicleBlacklisted(),
                    accidents,
                    challans
            );
        }

        return new DriverBackgroundCheckResponse(
                true,
                "VERIFIED",
                "Background check passed. This driver can create an account.",
                MOCK_REGISTRY,
                record.licenseValid(),
                rcValid,
                insuranceValid,
                record.vehicleBlacklisted(),
                accidents,
                challans,
                MAX_ACCIDENT_COUNT,
                MAX_CHALLAN_COUNT
        );
    }

    private DriverBackgroundCheckResponse pendingReview(String message, boolean licenseValid, boolean rcValid,
                                                        boolean insuranceValid, boolean vehicleBlacklisted,
                                                        int accidentCount, int challanCount) {
        return new DriverBackgroundCheckResponse(
                true,
                "PENDING_REVIEW",
                message,
                MOCK_REGISTRY,
                licenseValid,
                rcValid,
                insuranceValid,
                vehicleBlacklisted,
                accidentCount,
                challanCount,
                MAX_ACCIDENT_COUNT,
                MAX_CHALLAN_COUNT
        );
    }

    private DriverBackgroundCheckResponse rejected(String message, boolean licenseValid, boolean rcValid,
                                                   boolean insuranceValid, boolean vehicleBlacklisted,
                                                   int accidentCount, int challanCount) {
        return new DriverBackgroundCheckResponse(
                false,
                "REJECTED",
                message,
                MOCK_REGISTRY,
                licenseValid,
                rcValid,
                insuranceValid,
                vehicleBlacklisted,
                accidentCount,
                challanCount,
                MAX_ACCIDENT_COUNT,
                MAX_CHALLAN_COUNT
        );
    }

    private String registryKey(String vehicleNumber, String licenseNumber) {
        return normalize(vehicleNumber) + "|" + normalize(licenseNumber);
    }

    private boolean rcMatchesVehicle(String vehicleNumber, String rcNumber) {
        String vehicle = normalize(vehicleNumber);
        String rc = normalize(rcNumber);
        return rc.equals("RC" + vehicle) || rc.endsWith(vehicle);
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    private record RegistryRecord(
            boolean licenseValid,
            boolean rcValid,
            boolean insuranceValid,
            boolean vehicleBlacklisted,
            int accidentCount,
            int challanCount
    ) {
    }
}
