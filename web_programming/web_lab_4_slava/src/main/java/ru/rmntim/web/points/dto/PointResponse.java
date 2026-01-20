package ru.rmntim.web.points.dto;

import java.math.BigDecimal;
import java.time.Instant;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PointResponse {
    private Long id;
    private BigDecimal x;
    private BigDecimal y;
    private BigDecimal r;
    private boolean insideArea;
    private Instant checkedAt;
    private long executionTime;
}
