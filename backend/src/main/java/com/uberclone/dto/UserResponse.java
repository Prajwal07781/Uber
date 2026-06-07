package com.uberclone.dto;

import com.uberclone.model.AppUser;

public record UserResponse(Long id, String name, String phone, String role, double rating, Long driverId, String token, double walletBalance) {
    public static UserResponse from(AppUser user, Long driverId, String token) {
        return new UserResponse(user.getId(), user.getName(), user.getPhone(), user.getRole().name(), user.getRating(), driverId, token, user.getWalletBalance());
    }
}
