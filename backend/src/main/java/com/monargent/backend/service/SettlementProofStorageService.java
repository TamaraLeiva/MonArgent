package com.monargent.backend.service;

import com.monargent.backend.exception.InvalidRequestException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
public class SettlementProofStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "application/pdf"
    );
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final int MAX_IMAGE_DIMENSION = 4096;
    private static final byte[] PDF_MAGIC = new byte[] {0x25, 0x50, 0x44, 0x46, 0x2D}; // %PDF-
    private static final byte[] PNG_MAGIC = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    @Value("${app.settlement-proof-dir:uploads/settlement-proofs}")
    private String proofDir;

    public record StoredProof(String storedName, String contentType) {}

    public StoredProof store(MultipartFile file, Long groupId, String fromMemberKey, String toMemberKey) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("Subí una imagen o PDF del comprobante.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidRequestException("El comprobante supera el límite de 5MB.");
        }

        String declaredContentType = normalizeContentType(file.getContentType());
        if (declaredContentType == null || !ALLOWED_CONTENT_TYPES.contains(declaredContentType)) {
            throw new InvalidRequestException("Formato no válido. Usá JPG, PNG o PDF.");
        }

        byte[] originalBytes = readBytes(file);
        DetectedFile detected = detectAndSanitize(originalBytes, declaredContentType);

        String extension = extensionFor(detected.contentType());
        String storedName = "g" + groupId + "-"
            + sanitizeKey(fromMemberKey) + "-"
            + sanitizeKey(toMemberKey) + "-"
            + UUID.randomUUID() + extension;

        try {
            Path directory = Paths.get(proofDir).toAbsolutePath().normalize();
            Files.createDirectories(directory);
            Path target = directory.resolve(storedName).normalize();
            if (!target.startsWith(directory)) {
                throw new InvalidRequestException("Nombre de archivo no válido.");
            }
            Files.write(target, detected.sanitizedBytes());
            return new StoredProof(storedName, detected.contentType());
        } catch (IOException ex) {
            log.error("Could not store settlement proof", ex);
            throw new InvalidRequestException("No se pudo guardar el comprobante. Intentá de nuevo.");
        }
    }

    public Resource load(String storedName) {
        if (storedName == null || storedName.isBlank()) {
            throw new InvalidRequestException("Comprobante no encontrado.");
        }
        try {
            Path directory = Paths.get(proofDir).toAbsolutePath().normalize();
            Path file = directory.resolve(storedName).normalize();
            if (!file.startsWith(directory) || !Files.exists(file)) {
                throw new InvalidRequestException("Comprobante no encontrado.");
            }
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new InvalidRequestException("Comprobante no encontrado.");
            }
            return resource;
        } catch (IOException ex) {
            throw new InvalidRequestException("No se pudo leer el comprobante.");
        }
    }

    public String contentTypeFor(String storedName) {
        String lower = storedName == null ? "" : storedName.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".pdf")) {
            return "application/pdf";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        return "image/jpeg";
    }

    public void delete(String storedName) {
        if (storedName == null || storedName.isBlank()) {
            return;
        }
        try {
            Path directory = Paths.get(proofDir).toAbsolutePath().normalize();
            Path file = directory.resolve(storedName).normalize();
            if (file.startsWith(directory) && Files.exists(file)) {
                Files.delete(file);
            }
        } catch (IOException ex) {
            log.warn("Could not delete settlement proof {}", storedName, ex);
        }
    }

    public String filenameForContentType(String contentType) {
        return "comprobante" + extensionForContentType(contentType);
    }

    private DetectedFile detectAndSanitize(byte[] bytes, String declaredContentType) {
        String detectedType = detectTypeByMagic(bytes);
        if (detectedType == null || !ALLOWED_CONTENT_TYPES.contains(detectedType)) {
            throw new InvalidRequestException("El archivo no es un JPG, PNG o PDF válido.");
        }
        if (!detectedType.equals(declaredContentType)) {
            // Permitir jpeg declarado para jpg detectado ya normalizado; si no coincide, rechazar.
            throw new InvalidRequestException("El formato real del archivo no coincide con el tipo enviado.");
        }

        if ("application/pdf".equals(detectedType)) {
            validatePdf(bytes);
            return new DetectedFile(detectedType, bytes);
        }

        return new DetectedFile(detectedType, sanitizeImage(bytes, detectedType));
    }

    private String detectTypeByMagic(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            return null;
        }
        if (startsWith(bytes, PDF_MAGIC)) {
            return "application/pdf";
        }
        if (startsWith(bytes, PNG_MAGIC)) {
            return "image/png";
        }
        if (bytes.length >= 3
            && (bytes[0] & 0xFF) == 0xFF
            && (bytes[1] & 0xFF) == 0xD8
            && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        return null;
    }

    private byte[] sanitizeImage(byte[] bytes, String contentType) {
        try (InputStream input = new ByteArrayInputStream(bytes)) {
            BufferedImage image = ImageIO.read(input);
            if (image == null) {
                throw new InvalidRequestException("La imagen está corrupta o no se pudo procesar.");
            }
            int width = image.getWidth();
            int height = image.getHeight();
            if (width <= 0 || height <= 0) {
                throw new InvalidRequestException("La imagen tiene dimensiones inválidas.");
            }
            if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                throw new InvalidRequestException("La imagen excede las dimensiones máximas permitidas.");
            }
            String format = "image/png".equals(contentType) ? "png" : "jpg";
            BufferedImage toWrite = image;
            if ("jpg".equals(format) && image.getColorModel().hasAlpha()) {
                BufferedImage rgb = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                rgb.createGraphics().drawImage(image, 0, 0, java.awt.Color.WHITE, null);
                rgb.createGraphics().dispose();
                toWrite = rgb;
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            boolean written = ImageIO.write(toWrite, format, output);
            if (!written) {
                throw new InvalidRequestException("No se pudo procesar la imagen.");
            }
            byte[] sanitized = output.toByteArray();
            if (sanitized.length == 0 || sanitized.length > MAX_FILE_SIZE_BYTES) {
                throw new InvalidRequestException("La imagen procesada es inválida o excede el tamaño permitido.");
            }
            return sanitized;
        } catch (InvalidRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Invalid image upload rejected", ex);
            throw new InvalidRequestException("La imagen está corrupta o no se pudo procesar.");
        }
    }

    private void validatePdf(byte[] bytes) {
        if (bytes.length < PDF_MAGIC.length) {
            throw new InvalidRequestException("El PDF es inválido o está corrupto.");
        }
        // Validación básica de estructura PDF. No garantiza ausencia de contenido activo.
        int tailLength = Math.min(bytes.length, 2048);
        String tail = new String(bytes, bytes.length - tailLength, tailLength, java.nio.charset.StandardCharsets.US_ASCII);
        if (!tail.contains("%%EOF")) {
            throw new InvalidRequestException("El PDF es inválido o está corrupto.");
        }
    }

    private byte[] readBytes(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            if (bytes == null || bytes.length == 0) {
                throw new InvalidRequestException("Subí una imagen o PDF del comprobante.");
            }
            if (bytes.length > MAX_FILE_SIZE_BYTES) {
                throw new InvalidRequestException("El comprobante supera el límite de 5MB.");
            }
            return bytes;
        } catch (IOException ex) {
            throw new InvalidRequestException("No se pudo leer el archivo.");
        }
    }

    private boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private String extensionForContentType(String contentType) {
        if (contentType == null) {
            return ".jpg";
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "application/pdf" -> ".pdf";
            case "image/png" -> ".png";
            default -> ".jpg";
        };
    }

    private String extensionFor(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "application/pdf" -> ".pdf";
            default -> ".jpg";
        };
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return null;
        }
        String normalized = contentType.toLowerCase(Locale.ROOT).trim();
        if ("image/jpg".equals(normalized)) {
            return "image/jpeg";
        }
        return normalized;
    }

    private String sanitizeKey(String memberKey) {
        if (memberKey == null) {
            return "unknown";
        }
        String sanitized = memberKey.replaceAll("[^a-zA-Z0-9_-]", "");
        return sanitized.isEmpty() ? "unknown" : sanitized;
    }

    private record DetectedFile(String contentType, byte[] sanitizedBytes) {}
}
