package com.monargent.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.monargent.backend.exception.TooManyRequestsException;
import com.monargent.backend.service.RateLimitService;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

class RateLimitFilterTest {

    @Test
    void normalizesTrailingSlash_andAppliesAuthLimit() throws Exception {
        RateLimitService rateLimitService = mock(RateLimitService.class);
        RateLimitFilter filter = new RateLimitFilter(rateLimitService, new ObjectMapper().registerModule(new JavaTimeModule()));
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "authIpMax", 20);
        ReflectionTestUtils.setField(filter, "authIpWindowSeconds", 900);
        ReflectionTestUtils.setField(filter, "publicIpMax", 20);
        ReflectionTestUtils.setField(filter, "publicIpWindowSeconds", 900);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login/");
        request.setServletPath("/auth/login/");
        request.setRemoteAddr("10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(rateLimitService).checkLimit("ip:auth:10.0.0.1", 20, 900);
        verify(chain).doFilter(request, response);
    }

    @Test
    void returns429WithRetryAfter_whenLimitExceeded() throws Exception {
        RateLimitService rateLimitService = mock(RateLimitService.class);
        doThrow(new TooManyRequestsException("Demasiados intentos. ProbÃ¡ de nuevo mÃ¡s tarde.", 30))
            .when(rateLimitService).checkLimit("ip:auth:10.0.0.2", 20, 900);

        RateLimitFilter filter = new RateLimitFilter(rateLimitService, new ObjectMapper().registerModule(new JavaTimeModule()));
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "authIpMax", 20);
        ReflectionTestUtils.setField(filter, "authIpWindowSeconds", 900);
        ReflectionTestUtils.setField(filter, "publicIpMax", 20);
        ReflectionTestUtils.setField(filter, "publicIpWindowSeconds", 900);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setServletPath("/auth/login");
        request.setRemoteAddr("10.0.0.2");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("30");
    }

    @Test
    void ignoresSpoofedForwardedForHeader_usesRemoteAddr() throws Exception {
        RateLimitService rateLimitService = mock(RateLimitService.class);
        RateLimitFilter filter = new RateLimitFilter(rateLimitService, new ObjectMapper().registerModule(new JavaTimeModule()));
        ReflectionTestUtils.setField(filter, "enabled", true);
        ReflectionTestUtils.setField(filter, "authIpMax", 20);
        ReflectionTestUtils.setField(filter, "authIpWindowSeconds", 900);
        ReflectionTestUtils.setField(filter, "publicIpMax", 20);
        ReflectionTestUtils.setField(filter, "publicIpWindowSeconds", 900);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setServletPath("/auth/login");
        request.setRemoteAddr("10.0.0.9");
        request.addHeader("X-Forwarded-For", "1.2.3.4");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(rateLimitService).checkLimit("ip:auth:10.0.0.9", 20, 900);
    }
}
