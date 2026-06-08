package com.uberclone.controller;

import com.uberclone.dto.AuthRequest;
import com.uberclone.dto.DriverBackgroundCheckRequest;
import com.uberclone.dto.DriverBackgroundCheckResponse;
import com.uberclone.dto.LoginRequest;
import com.uberclone.dto.UserResponse;
import com.uberclone.service.AuthService;
import com.uberclone.service.DriverBackgroundCheckService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthApiController {
    private final AuthService authService;
    private final DriverBackgroundCheckService backgroundCheckService;

    public AuthApiController(AuthService authService, DriverBackgroundCheckService backgroundCheckService) {
        this.authService = authService;
        this.backgroundCheckService = backgroundCheckService;
    }

    @PostMapping("/signup")
    public UserResponse signup(@Valid @RequestBody AuthRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/driver-background-check")
    public DriverBackgroundCheckResponse driverBackgroundCheck(@Valid @RequestBody DriverBackgroundCheckRequest request) {
        return backgroundCheckService.assess(request);
    }
}
