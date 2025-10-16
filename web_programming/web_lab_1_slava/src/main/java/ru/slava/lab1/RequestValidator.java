package ru.slava.lab1;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Validates individual query parameters.
 */
final class RequestValidator {
    private static final Set<Integer> ALLOWED_X = Set.of(-4, -3, -2, -1, 0, 1, 2, 3, 4);
    private static final BigDecimal MIN_Y = new BigDecimal("-3");
    private static final BigDecimal MAX_Y = new BigDecimal("5");
    private static final BigDecimal MIN_R = new BigDecimal("1");
    private static final BigDecimal MAX_R = new BigDecimal("4");

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

    static BigDecimal parseY(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Parameter y is missing");
        }
        try {
            String normalized = raw.trim().replace(',', '.');
            BigDecimal y = new BigDecimal(normalized);
            if (y.compareTo(MIN_Y) < 0 || y.compareTo(MAX_Y) > 0) {
                throw new IllegalArgumentException("Parameter y must be between -3 and 5");
            }
            return y;
        } catch (NumberFormatException exc) {
            throw new IllegalArgumentException("Parameter y must be a number");
        }
    }

    static BigDecimal parseR(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Parameter r is missing");
        }
        try {
            String normalized = raw.trim().replace(',', '.');
            BigDecimal r = new BigDecimal(normalized);
            if (r.compareTo(MIN_R) < 0 || r.compareTo(MAX_R) > 0) {
                throw new IllegalArgumentException("Parameter r must be between 1 and 4");
            }
            return r;
        } catch (NumberFormatException exc) {
            throw new IllegalArgumentException("Parameter r must be a number");
        }
    }
}
