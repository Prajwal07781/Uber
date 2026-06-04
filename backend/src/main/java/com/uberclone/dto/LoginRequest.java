package com.uberclone.dto;

import com.uberclone.model.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(@NotBlank String phone, @NotBlank String password, @NotNull Role role) {
}
