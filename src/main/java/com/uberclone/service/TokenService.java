package com.uberclone.service;

import com.uberclone.model.AppUser;
import com.uberclone.model.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Service
public class TokenService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final long TOKEN_TTL_SECONDS = 24 * 60 * 60;

    private final String secret;

    public TokenService(@Value("${app.auth.secret:uber-java-react-demo-secret}") String secret) {
        this.secret = secret;
    }

    public String createToken(AppUser user) {
        long expiresAt = Instant.now().getEpochSecond() + TOKEN_TTL_SECONDS;
        String payload = "%d:%s:%d".formatted(user.getId(), user.getRole().name(), expiresAt);
        return encode(payload) + "." + sign(payload);
    }

    public TokenClaims verify(String token) {
        if (token == null || token.isBlank() || !token.contains(".")) {
            throw new IllegalArgumentException("Missing auth token");
        }
        String[] parts = token.split("\\.", 2);
        String payload = decode(parts[0]);
        if (!sign(payload).equals(parts[1])) {
            throw new IllegalArgumentException("Invalid auth token");
        }
        String[] values = payload.split(":");
        if (values.length != 3) {
            throw new IllegalArgumentException("Invalid auth token");
        }
        long expiresAt = Long.parseLong(values[2]);
        if (expiresAt < Instant.now().getEpochSecond()) {
            throw new IllegalArgumentException("Auth token expired");
        }
        return new TokenClaims(Long.parseLong(values[0]), Role.valueOf(values[1]), expiresAt);
    }

    private String encode(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String decode(String value) {
        return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Could not sign auth token", exception);
        }
    }

    public record TokenClaims(Long userId, Role role, long expiresAt) {
    }
}
