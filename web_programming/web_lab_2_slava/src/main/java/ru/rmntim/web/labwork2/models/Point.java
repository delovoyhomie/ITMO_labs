package ru.rmntim.web.labwork2.models;

public record Point(double x, double y, double r, boolean isInside) {
    public Point(double x, double y, double r) {
        this(x, y, r, isInside(x, y, r));
    }

    private static boolean isInside(double x, double y, double r) {
        if (x <= 0 && y <= 0) {
            return x >= -r && y >= -r / 2;
        }

        if (x <= 0 && y >= 0) {
            return y <= r / 2 && y <= x + r / 2;
        }

        if (x >= 0 && y <= 0) {
            return x * x + y * y <= (r * r) / 4;
        }

        return false;
    }
}
