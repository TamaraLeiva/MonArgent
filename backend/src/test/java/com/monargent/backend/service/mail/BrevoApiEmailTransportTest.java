package com.monargent.backend.service.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class BrevoApiEmailTransportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpClient httpClient;
    private BrevoApiEmailTransport transport;

    @BeforeEach
    void setUp() {
        httpClient = mock(HttpClient.class);
        transport = new BrevoApiEmailTransport(objectMapper, httpClient);
        ReflectionTestUtils.setField(transport, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(transport, "apiUrl", "https://api.brevo.com/v3/smtp/email");
        ReflectionTestUtils.setField(transport, "senderEmail", "noreply@monargent.app");
        ReflectionTestUtils.setField(transport, "senderName", "MonArgent");
    }

    @Test
    void send_success_buildsExpectedRequest() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(201);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        transport.send("user@example.com", "ignored@from.com", "Subject", "plain", "<p>html</p>");

        ArgumentCaptor<HttpRequest> captor = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(captor.capture(), any(HttpResponse.BodyHandler.class));
        HttpRequest request = captor.getValue();

        assertThat(request.uri().toString()).isEqualTo("https://api.brevo.com/v3/smtp/email");
        assertThat(request.headers().firstValue("api-key")).contains("test-api-key");
        assertThat(request.headers().firstValue("content-type")).contains("application/json");
        assertThat(request.timeout()).contains(java.time.Duration.ofSeconds(15));

        JsonNode body = objectMapper.readTree(bodyPublisherToString(request));
        assertThat(body.path("sender").path("email").asText()).isEqualTo("noreply@monargent.app");
        assertThat(body.path("sender").path("name").asText()).isEqualTo("MonArgent");
        assertThat(body.path("to").get(0).path("email").asText()).isEqualTo("user@example.com");
        assertThat(body.path("subject").asText()).isEqualTo("Subject");
        assertThat(body.path("htmlContent").asText()).isEqualTo("<p>html</p>");
        assertThat(body.path("textContent").asText()).isEqualTo("plain");
    }

    @Test
    void send_4xx_throwsWithSanitizedDetail() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(400);
        when(response.body()).thenReturn("{\"code\":\"invalid_parameter\",\"message\":\"Invalid recipient address\"}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        assertThatThrownBy(() -> transport.send("u@e.com", "f@e.com", "s", "p", "h"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("status=400")
            .hasMessageContaining("code=invalid_parameter")
            .hasMessageContaining("message=Invalid recipient address");
    }

    @Test
    void send_5xx_throwsWithSanitizedDetail() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(503);
        when(response.body()).thenReturn("{\"code\":\"service_unavailable\",\"message\":\"Service temporarily unavailable\"}");
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        assertThatThrownBy(() -> transport.send("u@e.com", "f@e.com", "s", "p", "h"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("status=503")
            .hasMessageContaining("code=service_unavailable")
            .hasMessageContaining("message=Service temporarily unavailable");
    }

    @Test
    void send_nonJsonErrorBody_isSanitizedAndTruncated() throws Exception {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(502);
        when(response.body()).thenReturn("Bad gateway\ncontact admin@example.com api-key: SECRET123 " + "x".repeat(600));
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);

        assertThatThrownBy(() -> transport.send("u@e.com", "f@e.com", "s", "p", "h"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("status=502")
            .hasMessageNotContaining("admin@example.com")
            .hasMessageNotContaining("SECRET123")
            .satisfies(ex -> assertThat(ex.getMessage().length()).isLessThanOrEqualTo(560));
    }

    @Test
    void send_ioException_throws() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
            .thenThrow(new IOException("network"));

        assertThatThrownBy(() -> transport.send("u@e.com", "f@e.com", "s", "p", "h"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Brevo API mail send failed");
    }

    @Test
    void send_interrupted_throwsAndSetsInterruptFlag() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
            .thenThrow(new InterruptedException("interrupted"));

        assertThatThrownBy(() -> transport.send("u@e.com", "f@e.com", "s", "p", "h"))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("interrupted");
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
        Thread.interrupted(); // clear flag
    }

    @Test
    void validateConfiguration_missingApiKey_throws() {
        ReflectionTestUtils.setField(transport, "apiKey", "");
        assertThatThrownBy(transport::validateConfiguration)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("BREVO_API_KEY");
    }

    @Test
    void validateConfiguration_missingSenderEmail_throws() {
        ReflectionTestUtils.setField(transport, "senderEmail", " ");
        assertThatThrownBy(transport::validateConfiguration)
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("BREVO_SENDER_EMAIL");
    }

    private static String bodyPublisherToString(HttpRequest request) {
        return request.bodyPublisher().map(publisher -> {
            java.util.concurrent.Flow.Subscriber<java.nio.ByteBuffer> subscriber = new java.util.concurrent.Flow.Subscriber<>() {
                private final java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                private volatile String result;

                @Override
                public void onSubscribe(java.util.concurrent.Flow.Subscription subscription) {
                    subscription.request(Long.MAX_VALUE);
                }

                @Override
                public void onNext(java.nio.ByteBuffer item) {
                    byte[] bytes = new byte[item.remaining()];
                    item.get(bytes);
                    out.writeBytes(bytes);
                }

                @Override
                public void onError(Throwable throwable) {
                    result = "";
                }

                @Override
                public void onComplete() {
                    result = out.toString(java.nio.charset.StandardCharsets.UTF_8);
                }
            };
            publisher.subscribe(subscriber);
            // BodyPublishers.ofString publishes synchronously
            try {
                for (int i = 0; i < 50 && subscriber.getClass().getDeclaredField("result").get(subscriber) == null; i++) {
                    Thread.sleep(10);
                }
                Object result = subscriber.getClass().getDeclaredField("result").get(subscriber);
                return result == null ? "" : result.toString();
            } catch (Exception e) {
                return "";
            }
        }).orElse("");
    }
}
