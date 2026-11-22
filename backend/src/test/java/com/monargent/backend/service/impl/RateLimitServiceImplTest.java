package com.monargent.backend.service.impl;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monargent.backend.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

class RateLimitServiceImplTest {

    private final RateLimitServiceImpl service = new RateLimitServiceImpl();

    @Test
    void allowsRequestsWithinLimit() {
        assertThatCode(() -> {
            service.checkLimit("ip:auth:1.2.3.4", 2, 60);
            service.checkLimit("ip:auth:1.2.3.4", 2, 60);
        }).doesNotThrowAnyException();
    }

    @Test
    void rejectsWhenLimitExceeded() {
        service.checkLimit("ip:auth:10.0.0.1", 1, 60);

        assertThatThrownBy(() -> service.checkLimit("ip:auth:10.0.0.1", 1, 60))
            .isInstanceOf(TooManyRequestsException.class)
            .satisfies(ex -> org.assertj.core.api.Assertions.assertThat(((TooManyRequestsException) ex).getRetryAfterSeconds()).isGreaterThanOrEqualTo(1));
    }

    @Test
    void ignoresInvalidInputs() {
        assertThatCode(() -> {
            service.checkLimit(null, 1, 60);
            service.checkLimit(" ", 1, 60);
            service.checkLimit("k", 0, 60);
            service.checkLimit("k", 1, 0);
        }).doesNotThrowAnyException();
    }
}
