package com.uberclone.service;

import com.uberclone.dto.AuthRequest;
import com.uberclone.model.Role;
import com.uberclone.repository.AppUserRepository;
import com.uberclone.repository.DriverProfileRepository;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    @Test
    void signupRejectsUnsafeDriverBeforeSavingAccount() {
        AppUserRepository userRepository = mock(AppUserRepository.class);
        AuthService authService = new AuthService(
                userRepository,
                mock(DriverProfileRepository.class),
                mock(TokenService.class),
                new DriverBackgroundCheckService()
        );
        AuthRequest request = new AuthRequest(
                "Unsafe Driver",
                "9000000999",
                "password",
                Role.DRIVER,
                "KA 01 AB 9999",
                "Honda City",
                "CAB",
                "DLKA20245555",
                "RCKA01AB9999",
                "INS-2026-0001",
                3,
                1
        );

        when(userRepository.existsByPhoneAndRole(request.phone(), request.role())).thenReturn(false);

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("accident history");
        verify(userRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
