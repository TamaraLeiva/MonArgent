package com.monargent.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.monargent.backend.exception.ApiErrorResponse;
import com.monargent.backend.exception.TooManyRequestsException;
import com.monargent.backend.service.RateLimitService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    @Value("${app.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${app.rate-limit.ip.auth.max:20}")
    private int authIpMax;

    @Value("${app.rate-limit.ip.auth.window-seconds:900}")
    private int authIpWindowSeconds;

    @Value("${app.rate-limit.ip.public.max:20}")
    private int publicIpMax;

    @Value("${app.rate-limit.ip.public.window-seconds:900}")
    private int publicIpWindowSeconds;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {
        if (!enabled || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = normalizePath(request.getServletPath());
        RateLimitRule rule = ruleFor(path);
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String key = "ip:" + rule.name() + ":" + clientIp;
        try {
            rateLimitService.checkLimit(key, rule.maxRequests(), rule.windowSeconds());
            filterChain.doFilter(request, response);
        } catch (TooManyRequestsException ex) {
            writeTooManyRequests(response, request.getRequestURI(), ex);
        }
    }

    private RateLimitRule ruleFor(String path) {
        if (path == null) {
            return null;
        }
        if (isAuthRateLimitedPath(path)) {
            return new RateLimitRule("auth", authIpMax, authIpWindowSeconds);
        }
        if (path.startsWith("/public/groups/guest-settlements")) {
            return new RateLimitRule("public-guest-settlement", publicIpMax, publicIpWindowSeconds);
        }
        return null;
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        String normalized = path.trim();
        // Colapsar slashes múltiples
        normalized = normalized.replaceAll("/+", "/");
        // Remover trailing slash salvo raíz
        if (normalized.length() > 1 && normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private boolean isAuthRateLimitedPath(String path) {
        return Map.of(
            "/auth/login", true,
            "/auth/register", true,
            "/auth/verify", true,
            "/auth/resend-code", true,
            "/auth/forgot-password", true,
            "/auth/reset-password", true,
            "/auth/resend-reset-code", true
        ).containsKey(path);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.isBlank()) {
            return "unknown";
        }
        return remoteAddr.trim();
    }

    private void writeTooManyRequests(HttpServletResponse response, String path, TooManyRequestsException ex)
        throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(ex.getRetryAfterSeconds()));
        ApiErrorResponse errorResponse = ApiErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.TOO_MANY_REQUESTS.value())
            .error("Demasiadas solicitudes")
            .message(ex.getMessage())
            .path(path)
            .build();
        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }

    private record RateLimitRule(String name, int maxRequests, int windowSeconds) {}
}
