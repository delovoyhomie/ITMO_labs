package ru.slava.lab1;

/**
 * Immutable holder for a single point check request.
 */
final class PointRequest {
    private final int x;
    private final java.math.BigDecimal y;
    private final java.math.BigDecimal r;

    PointRequest(int x, java.math.BigDecimal y, java.math.BigDecimal r) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    int x() {
        return x;
    }

    java.math.BigDecimal y() {
        return y;
    }

    java.math.BigDecimal r() {
        return r;
    }
}
