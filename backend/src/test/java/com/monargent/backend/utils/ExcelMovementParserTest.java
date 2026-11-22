package com.monargent.backend.utils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ExcelMovementParserTest {

    @Test
    void rejectsTooManyRows() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("description");
            header.createCell(1).setCellValue("amount");
            for (int i = 1; i <= 1002; i++) {
                Row row = sheet.createRow(i);
                row.createCell(0).setCellValue("Item " + i);
                row.createCell(1).setCellValue(10);
            }
            workbook.write(out);
        }
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "big.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            out.toByteArray()
        );

        assertThatThrownBy(() -> ExcelMovementParser.parse(file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("filas");
    }
}
