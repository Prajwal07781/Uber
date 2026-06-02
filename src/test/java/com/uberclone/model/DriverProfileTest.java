package com.uberclone.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DriverProfileTest {

    @Test
    void completedRideMinutesAccumulateForCurrentDay() {
        DriverProfile driver = new DriverProfile();
        LocalDate today = LocalDate.now();
        driver.setDutyDate(today);
        driver.setDutyMinutesToday(45);

        driver.addCompletedRideMinutes(30, today);

        assertThat(driver.currentDutyMinutes()).isEqualTo(75);
    }

    @Test
    void completedRideMinutesResetWhenNewDayStarts() {
        DriverProfile driver = new DriverProfile();
        LocalDate today = LocalDate.now();
        driver.setDutyDate(today.minusDays(1));
        driver.setDutyMinutesToday(480);

        driver.addCompletedRideMinutes(25, today);

        assertThat(driver.currentDutyMinutes()).isEqualTo(25);
    }

    @Test
    void dutyStatusFollowsCompletedRideMinutes() {
        DriverProfile driver = new DriverProfile();
        driver.setDutyDate(LocalDate.now());
        driver.setDutyMinutesToday(DriverProfile.OVERTIME_DAILY_MINUTES);

        assertThat(driver.dutyStatus()).isEqualTo("OVERTIME");
    }
}
