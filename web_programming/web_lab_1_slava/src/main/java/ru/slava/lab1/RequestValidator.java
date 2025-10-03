package ru.slava.lab1;

import java.util.Set;

/**
 * Validates individual query parameters.
 */
final class RequestValidator {
    private static final Set<Integer> ALLOWED_X = Set.of(-4, -3, -2, -1, 0, 1, 2, 3, 4);
    private static final double MIN_Y = -3.0;
    private static final double MAX_Y = 5.0;
    private static final double MIN_R = 1.0;
    private static final double MAX_R = 4.0;

    private RequestValidator() {
    }

    static int parseX(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Parameter x is missing");
        }
        try {
            int x = Integer.parseInt(raw.trim());
            if (!ALLOWED_X.contains(x)) {
                throw new IllegalArgumentException("Parameter x must be one of " + ALLOWED_X);
            }
            return x;
        } catch (NumberFormatException exc) {
            throw new IllegalArgumentException("Parameter x must be an integer");
        }
    }

    static double parseY(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Parameter y is missing");
        }
        try {
            double y = Double.parseDouble(raw.trim().replace(',', '.'));
            if (y < MIN_Y || y > MAX_Y) {
                throw new IllegalArgumentException("Parameter y must be between -3 and 5");
            }
            return y;
        } catch (NumberFormatException exc) {
            throw new IllegalArgumentException("Parameter y must be a number");
        }
    }

    static double parseR(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Parameter r is missing");
        }
        try {
            double r = Double.parseDouble(raw.trim().replace(',', '.'));
            if (r < MIN_R || r > MAX_R) {
                throw new IllegalArgumentException("Parameter r must be between 1 and 4");
            }
            return r;
        } catch (NumberFormatException exc) {
            throw new IllegalArgumentException("Parameter r must be a number");
        }
    }
}
