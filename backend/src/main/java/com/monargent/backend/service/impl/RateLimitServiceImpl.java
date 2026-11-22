package com.monargent.backend.service.impl;

import com.monargent.backend.exception.TooManyRequestsException;
import com.monargent.backend.service.RateLimitService;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Service;

@Service
public class RateLimitServiceImpl implements RateLimitService {

    private static final String DEFAULT_MESSAGE = "Demasiados intentos. Probá de nuevo más tarde.";

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    public void checkLimit(String key, int maxRequests, int windowSeconds) {
        if (key == null || key.isBlank() || maxRequests <= 0 || windowSeconds <= 0) {
            return;
        }
        long now = Instant.now().getEpochSecond();
        WindowCounter counter = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStartEpochSec >= windowSeconds) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > maxRequests) {
            long retryAfter = getRetryAfterSeconds(key, windowSeconds);
            throw new TooManyRequestsException(DEFAULT_MESSAGE, retryAfter);
        }

        cleanupIfNeeded(now);
    }

    @Override
    public long getRetryAfterSeconds(String key, int windowSeconds) {
        WindowCounter counter = counters.get(key);
        if (counter == null || windowSeconds <= 0) {
            return 1;
        }
        long now = Instant.now().getEpochSecond();
        long elapsed = now - counter.windowStartEpochSec;
        long remaining = windowSeconds - elapsed;
        return Math.max(1, remaining);
    }

    private void cleanupIfNeeded(long now) {
        if (counters.size() < 10_000) {
            return;
        }
        counters.entrySet().removeIf(entry -> now - entry.getValue().windowStartEpochSec > 3600);
    }

    private static final class WindowCounter {
        private final long windowStartEpochSec;
        private final AtomicInteger count;

        private WindowCounter(long windowStartEpochSec, AtomicInteger count) {
            this.windowStartEpochSec = windowStartEpochSec;
            this.count = count;
        }
    }
}
