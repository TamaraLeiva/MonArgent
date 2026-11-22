package com.monargent.backend.utils;

import com.monargent.backend.enums.ImportSourceType;
import com.monargent.backend.exception.InvalidRequestException;
import java.io.IOException;
import java.util.Locale;
import org.springframework.web.multipart.MultipartFile;

public final class ImportFileUtils {

    private static final long MAX_BYTES = 5 * 1024 * 1024;
    private static final byte[] PDF_MAGIC = new byte[] {0x25, 0x50, 0x44, 0x46, 0x2D}; // %PDF-
    private static final byte[] PNG_MAGIC = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] ZIP_MAGIC = new byte[] {0x50, 0x4B, 0x03, 0x04};
    private static final byte[] OLE_MAGIC = new byte[] {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};

    private ImportFileUtils() {
    }

    public static ImportSourceType detectSourceType(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidRequestException("El archivo no puede estar vacío.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new InvalidRequestException("El archivo supera el límite de 5MB.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT).trim();
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT).trim();
        byte[] bytes = readBytes(file);

        ImportSourceType detected = detectByMagic(bytes);
        if (detected == null) {
            throw new InvalidRequestException("Tipo de archivo no soportado o formato inválido. Usá imagen, PDF o Excel.");
        }

        if (!isConsistent(detected, contentType, filename)) {
            throw new InvalidRequestException("El formato del archivo no coincide con su extensión o tipo declarado.");
        }

        return detected;
    }

    private static ImportSourceType detectByMagic(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            return null;
        }
        if (startsWith(bytes, PDF_MAGIC)) {
            return ImportSourceType.PDF;
        }
        if (startsWith(bytes, PNG_MAGIC)) {
            return ImportSourceType.IMAGE;
        }
        if (bytes.length >= 3
            && (bytes[0] & 0xFF) == 0xFF
            && (bytes[1] & 0xFF) == 0xD8
            && (bytes[2] & 0xFF) == 0xFF) {
            return ImportSourceType.IMAGE;
        }
        if (startsWith(bytes, ZIP_MAGIC)) {
            return ImportSourceType.EXCEL; // XLSX es ZIP OOXML; se valida más en parser
        }
        if (startsWith(bytes, OLE_MAGIC)) {
            return ImportSourceType.EXCEL; // XLS OLE
        }
        return null;
    }

    private static boolean isConsistent(ImportSourceType detected, String contentType, String filename) {
        return switch (detected) {
            case IMAGE -> (contentType.isBlank() || contentType.startsWith("image/"))
                && (filename.isBlank() || hasExtension(filename, ".jpg", ".jpeg", ".png"));
            case PDF -> (contentType.isBlank() || contentType.equals("application/pdf"))
                && (filename.isBlank() || filename.endsWith(".pdf"));
            case EXCEL -> (contentType.isBlank() || isExcelContentType(contentType))
                && (filename.isBlank() || hasExtension(filename, ".xlsx", ".xls"));
        };
    }

    private static boolean isExcelContentType(String contentType) {
        return contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            || contentType.equals("application/vnd.ms-excel")
            || contentType.equals("application/octet-stream");
    }

    private static boolean hasExtension(String filename, String... extensions) {
        for (String extension : extensions) {
            if (filename.endsWith(extension)) {
                return true;
            }
        }
        return false;
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            if (bytes == null || bytes.length == 0) {
                throw new InvalidRequestException("El archivo no puede estar vacío.");
            }
            return bytes;
        } catch (IOException ex) {
            throw new InvalidRequestException("No se pudo leer el archivo.");
        }
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
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
}
