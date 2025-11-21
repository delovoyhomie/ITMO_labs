package ru.rmntim.web.models;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Date;

@Data
@NoArgsConstructor
public class Point implements Serializable {
    private long id;

    private double x;
    private double y;
    private double r;
    private boolean insideArea;
    private Date timestamp;
    private long executionTime;

    public Point(double x, double y, double r) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    public void calc() {
        long now = System.nanoTime();

        boolean square = x <= 0 && x >= -r && y >= 0 && y <= r;
        boolean triangle = x <= 0 && y <= 0 && y >= -x - r;
        double circleRadius = r / 2.0;
        boolean quarterCircle = x >= 0 && y >= 0 && (x * x + y * y) <= Math.pow(circleRadius, 2);

        insideArea = square || triangle || quarterCircle;

        timestamp = new Date(System.currentTimeMillis());
        executionTime = System.nanoTime() - now;
    }
}
