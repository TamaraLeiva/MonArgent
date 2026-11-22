package com.monargent.backend.utils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.monargent.backend.enums.ImportSourceType;
import com.monargent.backend.exception.InvalidRequestException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ImportFileUtilsTest {

    @Test
    void detectsPngImage() throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", out.toByteArray());

        assertThat(ImportFileUtils.detectSourceType(file)).isEqualTo(ImportSourceType.IMAGE);
    }

    @Test
    void rejectsMimeSpoof() {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", "not-image".getBytes());

        assertThatThrownBy(() -> ImportFileUtils.detectSourceType(file))
            .isInstanceOf(InvalidRequestException.class);
    }

    @Test
    void rejectsTooLargeFile() {
        byte[] bytes = new byte[5 * 1024 * 1024 + 1];
        bytes[0] = (byte) 0x89; bytes[1] = 0x50; bytes[2] = 0x4E; bytes[3] = 0x47;
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", bytes);

        assertThatThrownBy(() -> ImportFileUtils.detectSourceType(file))
            .isInstanceOf(InvalidRequestException.class)
            .hasMessageContaining("5MB");
    }
}
