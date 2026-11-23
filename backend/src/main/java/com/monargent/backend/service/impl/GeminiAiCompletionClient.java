package com.monargent.backend.service.impl;

import com.monargent.backend.exception.AiServiceUnavailableException;
import com.monargent.backend.service.ai.AiCompletionClient;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAiCompletionClient implements AiCompletionClient {

    private static final String GEMINI_BASE_URL =
        "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final List<String> FALLBACK_MODELS = List.of(
        "gemini-flash-latest",
        "gemini-2.5-flash"
    );
    private static final int MAX_ATTEMPTS_PER_MODEL = 3;

    private final RestTemplate restTemplate;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-flash-latest}")
    private String geminiModel;

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        String combinedPrompt = systemPrompt + "\n\n" + userPrompt;
        return completeWithParts(List.of(Map.of("text", combinedPrompt)));
    }

    @Override
    public String completeWithImage(String systemPrompt, String userPrompt, byte[] imageBytes, String mimeType) {
        if (imageBytes == null || imageBytes.length == 0) {
            throw new AiServiceUnavailableException("La imagen está vacía, no se puede procesar con IA.");
        }
        String combinedPrompt = systemPrompt + "\n\n" + userPrompt;
        Map<String, Object> imagePart = Map.of(
            "inline_data", Map.of(
                "mime_type", normalizeMimeType(mimeType),
                "data", Base64.getEncoder().encodeToString(imageBytes)
            )
        );
        return completeWithParts(List.of(Map.of("text", combinedPrompt), imagePart));
    }

    private String completeWithParts(List<Map<String, Object>> parts) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new AiServiceUnavailableException(
                "La API de Gemini no está configurada. Generá una clave en https://aistudio.google.com/apikey "
                    + "y cargala como GEMINI_API_KEY en backend/.env (local) o en las Environment Variables de Render (producción)."
            );
        }

        String lastError = "sin detalle";

        for (String model : modelsToTry()) {
            for (int attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
                try {
                    String response = callApi(model, parts);
                    if (response != null && !response.isBlank()) {
                        if (!model.equals(geminiModel)) {
                            log.info("Gemini respondió usando modelo de respaldo: {}", model);
                        }
                        return response;
                    }
                    lastError = "respuesta vacía";
                } catch (HttpStatusCodeException ex) {
                    lastError = ex.getStatusCode() + " " + ex.getResponseBodyAsString();
                    log.warn("Gemini model={} attempt={} failed: {}", model, attempt, ex.getMessage());
                    if (isModelUnavailable(ex)) {
                        break;
                    }
                    if (isRetryable(ex) && attempt < MAX_ATTEMPTS_PER_MODEL) {
                        sleepBackoff(attempt);
                        continue;
                    }
                    break;
                } catch (Exception ex) {
                    lastError = ex.getMessage();
                    log.error("Gemini model={} attempt={} unexpected error: {}", model, attempt, ex.getMessage());
                    break;
                }
            }
        }

        throw new AiServiceUnavailableException(
            "Gemini no pudo procesar el ticket (alta demanda o servicio temporalmente caído). "
                + "Intentá de nuevo en unos minutos. Detalle: " + truncate(lastError, 200)
        );
    }

    private String normalizeMimeType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return "image/jpeg";
        }
        String clean = mimeType.toLowerCase().trim();
        if (clean.equals("image/jpg")) {
            return "image/jpeg";
        }
        return clean;
    }

    private List<String> modelsToTry() {
        Set<String> models = new LinkedHashSet<>();
        if (geminiModel != null && !geminiModel.isBlank()) {
            models.add(geminiModel.trim());
        }
        models.addAll(FALLBACK_MODELS);
        return new ArrayList<>(models);
    }

    private String callApi(String model, List<Map<String, Object>> requestParts) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Keep the key out of the URL so it never lands in proxy or access logs.
        headers.set("x-goog-api-key", geminiApiKey);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of("parts", requestParts)),
            "generationConfig", Map.of(
                "temperature", 0,
                "topP", 0.1,
                "maxOutputTokens", 8192,
                "responseMimeType", "application/json"
            )
        );

        String url = GEMINI_BASE_URL + model + ":generateContent";
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            url,
            HttpMethod.POST,
            request,
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        Map<String, Object> body = response.getBody();
        if (body == null) {
            return "";
        }

        List<Map<String, Object>> candidates = castList(body.get("candidates"));
        if (candidates.isEmpty()) {
            return "";
        }

        Map<String, Object> content = castMap(candidates.get(0).get("content"));
        List<Map<String, Object>> parts = castList(content.get("parts"));
        if (parts.isEmpty()) {
            return "";
        }

        Object text = parts.get(0).get("text");
        return text != null ? text.toString() : "";
    }

    private boolean isRetryable(HttpStatusCodeException ex) {
        int code = ex.getStatusCode().value();
        return code == 429 || code == 503 || code == 500 || code == 502;
    }

    private boolean isModelUnavailable(HttpStatusCodeException ex) {
        int code = ex.getStatusCode().value();
        return code == 404 || code == 400;
    }

    private void sleepBackoff(int attempt) {
        try {
            Thread.sleep(1000L * attempt);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength) + "...";
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castList(Object value) {
        if (value instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }
}
