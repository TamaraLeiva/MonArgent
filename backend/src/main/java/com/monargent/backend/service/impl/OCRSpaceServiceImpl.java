package com.monargent.backend.service.impl;
import com.monargent.backend.dto.ocr.OCRSpaceResponse;
import com.monargent.backend.exception.InvalidRequestException;
import com.monargent.backend.service.OCRSpaceService;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
@Service
@RequiredArgsConstructor
@Slf4j
public class OCRSpaceServiceImpl implements OCRSpaceService {
    private final RestTemplate restTemplate;
    @Value("${ocr.api-key:}")
    private String apiKey;
    @Value("${ocr.base-url:https://api.ocr.space/parse/image}")
    private String ocrUrl;
    @Override
    public String extractRawText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("El archivo de imagen no puede estar vacío");
        }
        if (!StringUtils.hasText(apiKey)) {
            throw new InvalidRequestException(
                "El servicio de OCR no está configurado. Falta OCR_API_KEY en el servidor."
            );
        }
        try {
            log.info("Enviando archivo a OCR.Space para extracción de texto.");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
            String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
            boolean isPdf = contentType.equals("application/pdf") || filename.endsWith(".pdf");
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("apikey", apiKey);
            // Engine 2 detects the language automatically; sending `language` is deprecated.
            // `isTable` keeps the description/price columns aligned on receipts.
            body.add("isTable", "true");
            body.add("scale", "true");
            body.add("detectOrientation", "true");
            body.add("OCREngine", "2");
            body.add("isOverlayRequired", "false");
            body.add("file", fileResource);
            if (isPdf) {
                body.add("filetype", "PDF");
            }
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<OCRSpaceResponse> response = restTemplate.postForEntity(ocrUrl, requestEntity, OCRSpaceResponse.class);
            OCRSpaceResponse ocrResponse = response.getBody();
            if (ocrResponse == null) {
                throw new InvalidRequestException("El servicio de OCR no respondió. Intentá de nuevo en unos minutos.");
            }
            String errorMessage = ocrResponse.getErrorMessage();
            if (StringUtils.hasText(errorMessage)) {
                throw new InvalidRequestException("No se pudo leer el ticket: " + errorMessage);
            }
            if (ocrResponse.getParsedResults() == null || ocrResponse.getParsedResults().isEmpty()) {
                return "";
            }
            return ocrResponse.getParsedResults().stream()
                .map(OCRSpaceResponse.ParsedResult::getParsedText)
                .filter(StringUtils::hasText)
                .collect(Collectors.joining("\n"))
                .trim();
        } catch (HttpStatusCodeException ex) {
            log.error("OCR.Space respondió {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new InvalidRequestException(
                "El servicio de OCR rechazó la solicitud (" + ex.getStatusCode().value()
                    + "). Intentá de nuevo en unos minutos."
            );
        } catch (ResourceAccessException ex) {
            log.error("No se pudo conectar con OCR.Space: {}", ex.getMessage());
            throw new InvalidRequestException(
                "No se pudo conectar con el servicio de OCR. Revisá tu conexión e intentá de nuevo."
            );
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception e) {
            log.error("Error en OCRSpaceService", e);
            throw new InvalidRequestException("No se pudo procesar la imagen. Intentá con otra foto más nítida.");
        }
    }
}
