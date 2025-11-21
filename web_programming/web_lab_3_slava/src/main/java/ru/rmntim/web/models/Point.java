package ru.rmntim.web.models;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;

@Data
@NoArgsConstructor
public class Point implements Serializable {
    private long id;

    private BigDecimal x;
    private BigDecimal y;
    private BigDecimal r;
    private boolean insideArea;
    private Date timestamp;
    private long executionTime;

    public Point(BigDecimal x, BigDecimal y, BigDecimal r) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    public void calc() {
        long now = System.nanoTime();

        double dx = x.doubleValue();
        double dy = y.doubleValue();
        double dr = r.doubleValue();

        boolean square = dx <= 0 && dx >= -dr && dy >= 0 && dy <= dr;
        boolean triangle = dx <= 0 && dy <= 0 && dy >= -dx - dr;
        double circleRadius = dr / 2.0;
        boolean quarterCircle = dx >= 0 && dy >= 0 && (dx * dx + dy * dy) <= Math.pow(circleRadius, 2);

        insideArea = square || triangle || quarterCircle;

        timestamp = new Date(System.currentTimeMillis());
        executionTime = System.nanoTime() - now;
    }
}
