package com.monargent.backend.service.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "brevo")
public class BrevoApiEmailTransport implements EmailTransport {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${brevo.api-url:https://api.brevo.com/v3/smtp/email}")
    private String apiUrl;

    @Value("${brevo.sender.email:}")
    private String senderEmail;

    @Value("${brevo.sender.name:MonArgent}")
    private String senderName;

    @org.springframework.beans.factory.annotation.Autowired
    public BrevoApiEmailTransport(ObjectMapper objectMapper) {
        this(objectMapper, HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build());
    }

    BrevoApiEmailTransport(ObjectMapper objectMapper, HttpClient httpClient) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @PostConstruct
    void validateConfiguration() {
        if (isBlank(apiKey)) {
            throw new IllegalStateException("BREVO_API_KEY is required when APP_MAIL_PROVIDER=brevo");
        }
        if (isBlank(senderEmail)) {
            throw new IllegalStateException("BREVO_SENDER_EMAIL is required when APP_MAIL_PROVIDER=brevo");
        }
        if (isBlank(apiUrl)) {
            throw new IllegalStateException("BREVO_API_URL is required when APP_MAIL_PROVIDER=brevo");
        }
    }

    private static final int MAX_ERROR_DETAIL_LENGTH = 500;

    @Override
    public void send(String to, String from, String subject, String plainText, String htmlContent) {
        try {
            Map<String, Object> payload = Map.of(
                "sender", Map.of("email", senderEmail.trim(), "name", senderName == null ? "MonArgent" : senderName.trim()),
                "to", List.of(Map.of("email", to == null ? "" : to.trim())),
                "subject", subject == null ? "" : subject,
                "htmlContent", htmlContent == null ? "" : htmlContent,
                "textContent", plainText == null ? "" : plainText
            );

            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl.trim()))
                .timeout(Duration.ofSeconds(15))
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .header("api-key", apiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status < 200 || status >= 300) {
                String detail = buildErrorDetail(status, response.body());
                throw new RuntimeException("Brevo API mail send failed: " + detail);
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Brevo API mail send interrupted", ex);
        } catch (IOException ex) {
            throw new RuntimeException("Brevo API mail send failed", ex);
        }
    }

    String buildErrorDetail(int status, String responseBody) {
        String code = "unknown";
        String message = "sin mensaje";

        if (responseBody != null && !responseBody.isBlank()) {
            try {
                var node = objectMapper.readTree(responseBody);
                if (node.hasNonNull("code")) {
                    code = node.path("code").asText(code);
                }
                if (node.hasNonNull("message")) {
                    message = node.path("message").asText(message);
                }
            } catch (Exception ignored) {
                message = responseBody;
            }
        }

        String detail = "status=" + status + ", code=" + sanitizeErrorValue(code) + ", message=" + sanitizeErrorValue(message);
        if (detail.length() > MAX_ERROR_DETAIL_LENGTH) {
            return detail.substring(0, MAX_ERROR_DETAIL_LENGTH);
        }
        return detail;
    }

    private String sanitizeErrorValue(String value) {
        if (value == null || value.isBlank()) {
            return "n/a";
        }
        String sanitized = value.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s{2,}", " ").trim();
        sanitized = sanitized.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[redacted-email]");
        sanitized = sanitized.replaceAll("(?i)(api[-_ ]?key|authorization|token)\\s*[:=]\\s*\\S+", "$1=[redacted]");
        if (sanitized.length() > MAX_ERROR_DETAIL_LENGTH) {
            return sanitized.substring(0, MAX_ERROR_DETAIL_LENGTH);
        }
        return sanitized;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
