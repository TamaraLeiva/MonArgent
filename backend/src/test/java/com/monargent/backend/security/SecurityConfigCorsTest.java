package com.monargent.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.mock.web.MockHttpServletRequest;

class SecurityConfigCorsTest {

    @Test
    void prodWithoutExplicitOrigins_fails() {
        SecurityConfig config = configFor(new String[] {"prod"}, "", "");

        assertThatThrownBy(config::corsConfigurationSource)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CORS");
    }

    @Test
    void prodWithInvalidOrigin_fails() {
        SecurityConfig config = configFor(new String[] {"prod"}, "https://app.example.com", "https://localhost:5173");

        assertThatThrownBy(config::corsConfigurationSource)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("inválida");
    }

    @Test
    void prodWithExplicitOrigin_allowsOnlyConfiguredOrigin() {
        SecurityConfig config = configFor(new String[] {"prod"}, "https://app.example.com", "https://app.example.com");
        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/auth/login");

        CorsConfiguration cors = source.getCorsConfiguration(request);

        assertThat(cors).isNotNull();
        assertThat(cors.getAllowedOriginPatterns()).contains("https://app.example.com");
        assertThat(cors.getAllowedOriginPatterns()).doesNotContain("http://localhost:*");
    }

    @Test
    void devWithoutOrigins_fallsBackToLocalhost() {
        SecurityConfig config = configFor(new String[] {"dev"}, "", "");
        CorsConfigurationSource source = config.corsConfigurationSource();
        CorsConfiguration cors = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/v1/health"));

        assertThat(cors.getAllowedOriginPatterns()).contains("http://localhost:*", "http://127.0.0.1:*");
    }

    private SecurityConfig configFor(String[] profiles, String frontendUrl, String corsPatterns) {
        JwtAuthenticationFilter jwt = mock(JwtAuthenticationFilter.class);
        RateLimitFilter rateLimit = mock(RateLimitFilter.class);
        AuthenticationProvider authProvider = mock(AuthenticationProvider.class);
        ObjectMapper mapper = new ObjectMapper();
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(profiles);
        when(env.getDefaultProfiles()).thenReturn(new String[] {"default"});

        SecurityConfig config = new SecurityConfig(jwt, rateLimit, authProvider, mapper, env);
        org.springframework.test.util.ReflectionTestUtils.setField(config, "corsAllowedOriginPatterns", corsPatterns);
        org.springframework.test.util.ReflectionTestUtils.setField(config, "appFrontendUrl", frontendUrl);
        org.springframework.test.util.ReflectionTestUtils.setField(config, "swaggerEnabled", false);
        return config;
    }
}
