package com.monargent.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monargent.backend.exception.ApiErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitFilter rateLimitFilter;
    private final AuthenticationProvider authenticationProvider;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    @Value("${cors.allowed-origin-patterns:}")
    private String corsAllowedOriginPatterns;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String appFrontendUrl;

    @Value("${springdoc.swagger-ui.enabled:false}")
    private boolean swaggerEnabled;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(buildAllowedOriginPatterns());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private List<String> buildAllowedOriginPatterns() {
        Set<String> patterns = new LinkedHashSet<>();
        patterns.addAll(parseOrigins(corsAllowedOriginPatterns));
        patterns.addAll(parseOrigins(appFrontendUrl));

        boolean prod = Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase)
            || Arrays.stream(environment.getDefaultProfiles()).anyMatch("prod"::equalsIgnoreCase);

        if (patterns.isEmpty()) {
            if (prod) {
                throw new IllegalStateException(
                    "Configuración CORS de producción incompleta: se requiere al menos un origen explícito."
                );
            }
            patterns.add("http://localhost:*");
            patterns.add("http://127.0.0.1:*");
        }

        for (String pattern : patterns) {
            if (!isValidOriginPattern(pattern)) {
                throw new IllegalStateException("Configuración CORS inválida: origen no permitido.");
            }
        }

        return List.copyOf(patterns);
    }

    private List<String> parseOrigins(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();
    }

    private boolean isValidOriginPattern(String pattern) {
        if (pattern == null || pattern.isBlank()) {
            return false;
        }
        String normalized = pattern.trim();
        if ("*".equals(normalized)) {
            return false;
        }
        // Permitir localhost/127.0.0.1 con puerto wildcard solo fuera de prod (ya controlado por caller)
        if (normalized.matches("^https?://(localhost|127\\.0\\.0\\.1)(:\\*|:\\d+)?$")) {
            boolean prod = Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase)
                || Arrays.stream(environment.getDefaultProfiles()).anyMatch("prod"::equalsIgnoreCase);
            return !prod;
        }
        // Permitir orígenes https/http explícitos con host válido opcionalmente puerto; sin comodines.
        if (normalized.contains("*")) {
            return false;
        }
        return normalized.matches("^https?://[A-Za-z0-9.-]+(?::\\d{1,5})?$");
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> {
                headers.contentTypeOptions(contentType -> {});
                headers.frameOptions(frame -> frame.deny());
                headers.referrerPolicy(referrer -> referrer.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER));
                headers.permissionsPolicy(permissions -> permissions.policy("geolocation=(), microphone=(), camera=(), payment=(), usb=()"));
                headers.httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000));
                if (!swaggerEnabled) {
                    headers.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"));
                }
                headers.addHeaderWriter(new StaticHeadersWriter("X-Permitted-Cross-Domain-Policies", "none"));
            })
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    writeUnauthorized(response, request.getRequestURI())
                )
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    var authentication = org.springframework.security.core.context.SecurityContextHolder
                        .getContext()
                        .getAuthentication();
                    boolean anonymous = authentication == null
                        || !authentication.isAuthenticated()
                        || authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken;
                    if (anonymous) {
                        writeUnauthorized(response, request.getRequestURI());
                        return;
                    }
                    response.sendError(HttpServletResponse.SC_FORBIDDEN);
                })
            )
            .authorizeHttpRequests(auth -> {
                auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                auth.requestMatchers(
                    "/auth/login",
                    "/auth/register",
                    "/auth/verify",
                    "/auth/resend-code",
                    "/auth/forgot-password",
                    "/auth/reset-password",
                    "/auth/resend-reset-code"
                ).permitAll();

                List<String> publicPaths = new ArrayList<>(List.of(
                    "/public/**",
                    "/health",
                    "/error"
                ));
                if (swaggerEnabled) {
                    publicPaths.addAll(List.of(
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs/**",
                        "/v3/api-docs.yaml",
                        "/api-docs"
                    ));
                }
                auth.requestMatchers(publicPaths.toArray(String[]::new)).permitAll();

                // Default deny: every new endpoint is protected unless listed above.
                auth.anyRequest().authenticated();
            })
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    private void writeUnauthorized(HttpServletResponse response, String path) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiErrorResponse errorResponse = ApiErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNAUTHORIZED.value())
            .error("No autorizado")
            .message("Se requiere autenticación")
            .path(path)
            .build();
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
