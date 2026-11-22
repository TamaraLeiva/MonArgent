package com.monargent.backend.service;

public interface RateLimitService {

    void checkLimit(String key, int maxRequests, int windowSeconds);

    long getRetryAfterSeconds(String key, int windowSeconds);
}
