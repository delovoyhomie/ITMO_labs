package ru.slava.lab1;

/**
 * Calculates whether the requested point is inside the allowed composite area.
 */
final class HitAreaChecker {
    private HitAreaChecker() {
    }

    static boolean isInside(PointRequest request) {
        double x = request.x();
        double y = request.y();
        double r = request.r();

        boolean insideTriangle = false;
        if (x >= 0 && y >= 0 && x <= r) {
            double maxY = -0.5 * x + r / 2.0;
            insideTriangle = y <= maxY;
        }

        boolean insideQuarterCircle = false;
        if (x <= 0 && y >= 0) {
            double radius = r / 2.0;
            insideQuarterCircle = x * x + y * y <= radius * radius;
        }

        boolean insideRectangle = false;
        if (x <= 0 && y <= 0) {
            insideRectangle = x >= -r / 2.0 && y >= -r;
        }

        return insideTriangle || insideQuarterCircle || insideRectangle;
    }
}
