package ru.slava.lab1;

/**
 * Immutable holder for a single point check request.
 */
final class PointRequest {
    private final int x;
    private final double y;
    private final double r;

    PointRequest(int x, double y, double r) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    int x() {
        return x;
    }

    double y() {
        return y;
    }

    double r() {
        return r;
    }
}
