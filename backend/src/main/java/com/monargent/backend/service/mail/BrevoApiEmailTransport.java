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
                throw new RuntimeException("Brevo API mail send failed with status " + status);
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Brevo API mail send interrupted", ex);
        } catch (IOException ex) {
            throw new RuntimeException("Brevo API mail send failed", ex);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
