# syntax=docker/dockerfile:1
# Build context: repository root
# Dockerfile path: backend/Dockerfile

# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy pom files first for better layer caching
COPY pom.xml ./pom.xml
COPY backend/pom.xml ./backend/pom.xml

# Pre-fetch dependencies (best effort; does not fail build if offline cache differs)
RUN mvn -B -q -f backend/pom.xml -DskipTests dependency:go-offline || true

# Copy source and build
COPY backend/src ./backend/src
RUN mvn -B -DskipTests -f backend/pom.xml clean package

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Minimal tools for healthcheck and certs
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy only the bootable jar
COPY --from=build /workspace/backend/target/*.jar /app/app.jar

# Runtime defaults: conservative for Render free tier (adjust via JAVA_OPTS)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom" \
    PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

# Writable dirs for temp/uploads if used (ephemeral on Render free)
RUN mkdir -p /app/tmp /app/uploads && chown -R appuser:appuser /app
VOLUME ["/app/uploads"]

USER appuser

# Healthcheck (Render also has platform health checks; this helps local/docker)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["/bin/sh", "-c", "curl -fsS http://localhost:${PORT}/api/v1/health || exit 1"]

# exec ensures Java receives SIGTERM/SIGINT for graceful shutdown
ENTRYPOINT ["/bin/sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
