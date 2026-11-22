package com.monargent.backend.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

class ProductionConfigValidatorTest {

    private final ProductionConfigValidator validator = new ProductionConfigValidator();

    @Test
    void prodProfile_missingRequiredVars_failsFast() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        assertThatThrownBy(() -> validator.postProcessEnvironment(env, new SpringApplication()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Faltan variables obligatorias");
    }

    @Test
    void prodProfile_invalidCorsOrigin_failsFast() {
        MockEnvironment env = prodEnv("https://app.example.com", "https://app.example.com,https://localhost:5173");

        assertThatThrownBy(() -> validator.postProcessEnvironment(env, new SpringApplication()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CORS");
    }

    @Test
    void prodProfile_wildcardCors_failsFast() {
        MockEnvironment env = prodEnv("https://app.example.com", "*");

        assertThatThrownBy(() -> validator.postProcessEnvironment(env, new SpringApplication()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CORS");
    }

    @Test
    void prodProfile_validExplicitOrigins_passes() {
        MockEnvironment env = prodEnv("https://app.example.com", "https://app.example.com");

        assertThatCode(() -> validator.postProcessEnvironment(env, new SpringApplication()))
            .doesNotThrowAnyException();
    }

    private MockEnvironment prodEnv(String frontend, String cors) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        env.setProperty("SPRING_DATASOURCE_URL", "jdbc:mysql://localhost:3306/db");
        env.setProperty("DB_USERNAME", "user");
        env.setProperty("DB_PASSWORD", "pass");
        env.setProperty("JWT_SECRET", "dGVzdC1vbmx5LWp3dC1zZWNyZXQtZm9yLW1vbmFyZ2VudC10ZXN0cy0yMDI2");
        env.setProperty("APP_FRONTEND_URL", frontend);
        env.setProperty("CORS_ALLOWED_ORIGIN_PATTERNS", cors);
        return env;
    }
}
