package com.monargent.backend.dto.group;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupExpenseItemResponse {

    private Long id;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private String title;
    private BigDecimal amount;
}
