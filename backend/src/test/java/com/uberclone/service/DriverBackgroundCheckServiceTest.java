package com.uberclone.service;

import com.uberclone.dto.DriverBackgroundCheckRequest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DriverBackgroundCheckServiceTest {
    private final DriverBackgroundCheckService service = new DriverBackgroundCheckService();

    @Test
    void approvesDriverWithinNormalBackgroundLimits() {
        var result = service.assess(new DriverBackgroundCheckRequest(
                "Asha Driver",
                "KA 05 AB 1234",
                "DLKA20240001",
                "RCKA05AB1234",
                "INS-2026-0001",
                null,
                null
        ));

        assertThat(result.approved()).isTrue();
        assertThat(result.status()).isEqualTo("VERIFIED");
        assertThat(result.accidentCount()).isZero();
        assertThat(result.challanCount()).isEqualTo(1);
    }

    @Test
    void rejectsDriverWhenAccidentsAreAboveLimit() {
        var result = service.assess(new DriverBackgroundCheckRequest(
                "Asha Driver",
                "KA 09 BAD 1111",
                "DLKA20249999",
                "RCKA09BAD1111",
                "INS-2026-0001",
                null,
                null
        ));

        assertThat(result.approved()).isFalse();
        assertThat(result.message()).contains("accident history");
    }

    @Test
    void rejectsDriverWhenChallansAreAboveLimit() {
        var result = service.assess(new DriverBackgroundCheckRequest(
                "Asha Driver",
                "KA 01 AB 1234",
                "DLKA20245555",
                "RCKA01AB1234",
                "INS-2026-0001",
                1,
                6
        ));

        assertThat(result.approved()).isFalse();
        assertThat(result.message()).contains("vehicle challans");
    }

    @Test
    void marksDriverPendingReviewWhenInsuranceCannotBeValidated() {
        var result = service.assess(new DriverBackgroundCheckRequest(
                "Asha Driver",
                "KA 11 EXP 3333",
                "DLKA20247777",
                "RCKA11EXP3333",
                "INS-2026-0001",
                null,
                null
        ));

        assertThat(result.approved()).isTrue();
        assertThat(result.status()).isEqualTo("PENDING_REVIEW");
        assertThat(result.insuranceValid()).isFalse();
    }
}
