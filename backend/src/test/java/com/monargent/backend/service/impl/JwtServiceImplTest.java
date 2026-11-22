package com.monargent.backend.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monargent.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceImplTest {

    private static final String SECRET =
        "bW9uYXJnZW50c2VjcmV0a2V5Zm9yand0dG9rZW5tb25hcmdlbnQyMDI2";

    private JwtServiceImpl jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtServiceImpl();
        ReflectionTestUtils.setField(jwtService, "secretKey", SECRET);
        ReflectionTestUtils.setField(jwtService, "expirationMs", 86_400_000L);
    }

    @Test
    void generateAndExtract_roundtripReturnsUsername() {
        User user = User.builder()
            .id(1L)
            .name("Mon")
            .lastname("Argent")
            .email("jwt-roundtrip@example.com")
            .password("encoded")
            .verified(true)
            .build();

        String token = jwtService.generateToken(user);

        assertThat(jwtService.extractUsername(token)).isEqualTo("jwt-roundtrip@example.com");
        assertThat(jwtService.isTokenValid(token, user)).isTrue();
    }

    @Test
    void isTokenValid_wrongUser_returnsFalse() {        User owner = User.builder()
            .id(1L)
            .name("Owner")
            .lastname("User")
            .email("owner@example.com")
            .password("encoded")
            .verified(true)
            .build();
        User other = User.builder()
            .id(2L)
            .name("Other")
            .lastname("User")
            .email("other@example.com")
            .password("encoded")
            .verified(true)
            .build();

        String token = jwtService.generateToken(owner);

        assertThat(jwtService.isTokenValid(token, other)).isFalse();
    }

    @Test
    void validateSecret_acceptsConfiguredSecret() {
        assertThatCode(() -> jwtService.validateSecret()).doesNotThrowAnyException();
    }

    @Test
    void validateSecret_rejectsShortSecret() {
        ReflectionTestUtils.setField(jwtService, "secretKey", "c2hvcnQ="); // "short"

        assertThatThrownBy(() -> jwtService.validateSecret())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("32 bytes");
    }

    @Test
    void validateSecret_rejectsMalformedBase64() {
        ReflectionTestUtils.setField(jwtService, "secretKey", "not a base64 secret!");

        assertThatThrownBy(() -> jwtService.validateSecret())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Base64");
    }

    @Test
    void isTokenValid_rejectsMissingVersionClaim() {
        JwtServiceImpl legacyService = new JwtServiceImpl();
        ReflectionTestUtils.setField(legacyService, "secretKey", SECRET);
        ReflectionTestUtils.setField(legacyService, "expirationMs", 86_400_000L);

        String legacyToken = io.jsonwebtoken.Jwts.builder()
            .subject("jwt-roundtrip@example.com")
            .issuedAt(new java.util.Date())
            .expiration(new java.util.Date(System.currentTimeMillis() + 86_400_000L))
            .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(io.jsonwebtoken.io.Decoders.BASE64.decode(SECRET)))
            .compact();

        User user = User.builder()
            .id(1L)
            .name("Mon")
            .lastname("Argent")
            .email("jwt-roundtrip@example.com")
            .password("encoded")
            .verified(true)
            .build();

        assertThat(jwtService.isTokenValid(legacyToken, user)).isFalse();
    }

    @Test
    void isTokenValid_rejectsOldTokenVersion() {
        User user = User.builder()
            .id(1L)
            .name("Mon")
            .lastname("Argent")
            .email("jwt-roundtrip@example.com")
            .password("encoded")
            .verified(true)
            .tokenVersion(0)
            .build();

        String token = jwtService.generateToken(user);
        user.setTokenVersion(1);

        assertThat(jwtService.isTokenValid(token, user)).isFalse();
    }
}
