package com.uberclone.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthApiControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void driverBackgroundCheckEndpointApprovesNormalHistory() throws Exception {
        mockMvc.perform(post("/api/auth/driver-background-check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "driverName": "Test Driver",
                                  "vehicleNumber": "KA 05 AB 1234",
                                  "drivingLicenseNumber": "DLKA20240001",
                                  "rcNumber": "RCKA05AB1234",
                                  "insurancePolicyNumber": "INS-2026-0001"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approved").value(true))
                .andExpect(jsonPath("$.status").value("VERIFIED"))
                .andExpect(jsonPath("$.accidentCount").value(0))
                .andExpect(jsonPath("$.challanCount").value(1));
    }

    @Test
    void driverSignupRejectsUnsafeHistory() throws Exception {
        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Blocked Driver",
                                  "phone": "9998887776",
                                  "password": "password",
                                  "role": "DRIVER",
                                  "vehicleName": "Honda City",
                                  "vehicleNumber": "KA 09 BAD 1111",
                                  "vehicleType": "CAB",
                                  "drivingLicenseNumber": "DLKA20249999",
                                  "rcNumber": "RCKA09BAD1111",
                                  "insurancePolicyNumber": "INS-2026-0001"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("accident history")));
    }
}
