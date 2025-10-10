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

        // Quadrant I: triangle with vertices (0, R/2), (R, 0), (0, 0)
        if (x >= 0 && y >= 0) {
            if (x > r) {
                return false;
            }
            double maxY = -0.5 * x + r / 2.0;
            return y <= maxY;
        }

        // Quadrant II: quarter circle of radius R/2 centered at (0, R/2)
        if (x <= 0 && y >= 0) {
            double radius = r / 2.0;
            double dy = y - radius;
            return x * x + dy * dy <= radius * radius;
        }

        // Quadrant III: rectangle width R/2 and height R
        if (x <= 0 && y <= 0) {
            return x >= -r / 2.0 && x <= 0 && y >= -r && y <= 0;
        }

        return false;
    }
}
