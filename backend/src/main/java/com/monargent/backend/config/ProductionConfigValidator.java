package com.monargent.backend.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Falla rápido en producción cuando faltan variables obligatorias.
 * Solo reporta nombres de variables, nunca valores.
 */
public class ProductionConfigValidator implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        boolean prod = Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase)
            || Arrays.stream(environment.getDefaultProfiles()).anyMatch("prod"::equalsIgnoreCase)
            || containsProfile(environment.getProperty("spring.profiles.active"))
            || containsProfile(environment.getProperty("SPRING_PROFILES_ACTIVE"));

        if (!prod) {
            return;
        }

        List<String> missing = new ArrayList<>();
        requireAny(environment, missing, "SPRING_DATASOURCE_URL", "spring.datasource.url");
        requireAny(environment, missing, "DB_USERNAME", "spring.datasource.username");
        requireAny(environment, missing, "DB_PASSWORD", "spring.datasource.password");
        requireAny(environment, missing, "JWT_SECRET", "jwt.secret");
        requireAny(environment, missing, "APP_FRONTEND_URL", "app.frontend.url");
        requireAny(environment, missing, "CORS_ALLOWED_ORIGIN_PATTERNS", "cors.allowed-origin-patterns");

        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                "Configuración de producción incompleta. Faltan variables obligatorias: "
                    + String.join(", ", missing)
            );
        }

        validateCorsOrigins(environment);
    }

    private void requireAny(ConfigurableEnvironment environment, List<String> missing, String envName, String propertyName) {
        if (isBlank(environment.getProperty(propertyName)) && isBlank(environment.getProperty(envName))) {
            missing.add(envName);
        }
    }

    private boolean containsProfile(String raw) {
        if (isBlank(raw)) {
            return false;
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .anyMatch("prod"::equalsIgnoreCase);
    }

    private void validateCorsOrigins(ConfigurableEnvironment environment) {
        String rawCors = firstNonBlank(environment.getProperty("cors.allowed-origin-patterns"), environment.getProperty("CORS_ALLOWED_ORIGIN_PATTERNS"));
        String rawFrontend = firstNonBlank(environment.getProperty("app.frontend.url"), environment.getProperty("APP_FRONTEND_URL"));
        List<String> origins = new ArrayList<>();
        origins.addAll(parseOrigins(rawCors));
        origins.addAll(parseOrigins(rawFrontend));
        if (origins.isEmpty()) {
            throw new IllegalStateException("Configuración CORS de producción incompleta: se requiere al menos un origen explícito.");
        }
        for (String origin : origins) {
            if (!isValidProdOrigin(origin)) {
                throw new IllegalStateException("Configuración CORS de producción inválida: origen no permitido.");
            }
        }
    }

    private List<String> parseOrigins(String raw) {
        if (isBlank(raw)) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
    }

    private boolean isValidProdOrigin(String origin) {
        String normalized = origin.trim();
        if ("*".equals(normalized) || normalized.contains("*")) {
            return false;
        }
        if (normalized.matches("^https?://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$")) {
            return false;
        }
        return normalized.matches("^https?://[A-Za-z0-9.-]+(?::\\d{1,5})?$");
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
