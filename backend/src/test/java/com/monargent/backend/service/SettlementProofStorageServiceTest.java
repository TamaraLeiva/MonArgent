package com.monargent.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monargent.backend.exception.InvalidRequestException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class SettlementProofStorageServiceTest {

    @TempDir
    Path tempDir;

    private SettlementProofStorageService service;

    @BeforeEach
    void setUp() {
        service = new SettlementProofStorageService();
        ReflectionTestUtils.setField(service, "proofDir", tempDir.toString());
    }

    @Test
    void storesValidPng_afterMagicAndReencode() throws Exception {
        byte[] png = pngBytes(10, 10);
        MockMultipartFile file = new MockMultipartFile("file", "proof.png", "image/png", png);

        SettlementProofStorageService.StoredProof stored = service.store(file, 1L, "user-1", "user-2");

        assertThat(stored.storedName()).endsWith(".png");
        assertThat(stored.contentType()).isEqualTo("image/png");
        assertThat(Files.exists(tempDir.resolve(stored.storedName()))).isTrue();
    }

    @Test
    void rejectsMimeSpoof_whenContentDoesNotMatchMagic() {
        byte[] notAnImage = "not really an image".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "proof.png", "image/png", notAnImage);

        assertThatThrownBy(() -> service.store(file, 1L, "user-1", "user-2"))
            .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejectsWrongExtension_whenRealFormatIsDifferent() {
        byte[] pdf = minimalPdf();
        MockMultipartFile file = new MockMultipartFile("file", "proof.jpg", "image/jpeg", pdf);

        assertThatThrownBy(() -> service.store(file, 1L, "user-1", "user-2"))
            .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejectsInvalidPdf() {
        byte[] badPdf = "%PDF-1.4\nnot valid".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "proof.pdf", "application/pdf", badPdf);

        assertThatThrownBy(() -> service.store(file, 1L, "user-1", "user-2"))
            .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejectsTooLargeFile() {
        byte[] big = new byte[5 * 1024 * 1024 + 1];
        big[0] = (byte) 0x89; big[1] = 0x50; big[2] = 0x4E; big[3] = 0x47;
        MockMultipartFile file = new MockMultipartFile("file", "proof.png", "image/png", big);

        assertThatThrownBy(() -> service.store(file, 1L, "user-1", "user-2"))
            .isInstanceOf(InvalidRequestException.class)
            .hasMessageContaining("5MB");
    }

    @Test
    void sanitizesMemberKeys_preventingPathTraversal() throws Exception {
        byte[] png = pngBytes(5, 5);
        MockMultipartFile file = new MockMultipartFile("file", "proof.png", "image/png", png);

        SettlementProofStorageService.StoredProof stored = service.store(file, 1L, "../evil", "..\\evil");

        assertThat(stored.storedName()).doesNotContain("..");
        assertThat(stored.storedName()).doesNotContain("/");
        assertThat(stored.storedName()).doesNotContain("\\");
        assertThat(tempDir.resolve(stored.storedName()).normalize().startsWith(tempDir.normalize())).isTrue();
    }

    private byte[] pngBytes(int w, int h) throws Exception {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    private byte[] minimalPdf() {
        String pdf = "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n";
        return pdf.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    }
}
