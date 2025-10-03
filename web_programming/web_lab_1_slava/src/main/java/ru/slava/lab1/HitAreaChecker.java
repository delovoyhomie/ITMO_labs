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

        // Quadrant I: triangle with vertices (R/2, R/2), (R, 0), (R/2, 0)
        if (x >= 0 && y >= 0) {
            double minX = r / 2.0;
            if (x < minX || x > r) {
                return false;
            }
            return y <= (-x + r) && y >= 0;
        }

        // Quadrant II: quarter circle of radius R/2 centered at (-R/2, 0)
        if (x <= 0 && y >= 0) {
            double radius = r / 2.0;
            double dx = x + radius;
            return dx * dx + y * y <= radius * radius;
        }

        // Quadrant III: rectangle width R/2 and height R
        if (x <= 0 && y <= 0) {
            return x >= -r && x <= -r / 2.0 && y >= -r && y <= 0;
        }

        return false;
    }
}
