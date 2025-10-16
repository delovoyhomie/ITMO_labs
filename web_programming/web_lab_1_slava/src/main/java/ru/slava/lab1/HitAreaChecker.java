package ru.slava.lab1;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Calculates whether the requested point is inside the allowed composite area.
 */
final class HitAreaChecker {
    private static final BigDecimal TWO = BigDecimal.valueOf(2);
    private static final int SCALE = 200;

    private HitAreaChecker() {
    }

    static boolean isInside(PointRequest request) {
        BigDecimal x = BigDecimal.valueOf(request.x());
        BigDecimal y = request.y();
        BigDecimal r = request.r();

        BigDecimal zero = BigDecimal.ZERO;

        boolean insideTriangle = false;
        if (x.compareTo(zero) >= 0 && y.compareTo(zero) >= 0 && x.compareTo(r) <= 0) {
            BigDecimal halfR = divide(r, TWO);
            BigDecimal halfX = divide(x, TWO);
            BigDecimal maxY = halfR.subtract(halfX);
            insideTriangle = y.compareTo(maxY) <= 0;
        }

        boolean insideQuarterCircle = false;
        if (x.compareTo(zero) <= 0 && y.compareTo(zero) >= 0) {
            BigDecimal radius = divide(r, TWO);
            BigDecimal xSquared = x.pow(2);
            BigDecimal ySquared = y.pow(2);
            BigDecimal distanceSquared = xSquared.add(ySquared);
            BigDecimal radiusSquared = radius.pow(2);
            insideQuarterCircle = distanceSquared.compareTo(radiusSquared) <= 0;
        }

        boolean insideRectangle = false;
        if (x.compareTo(zero) <= 0 && y.compareTo(zero) <= 0) {
            BigDecimal negativeHalfR = divide(r, TWO).negate();
            BigDecimal negativeR = r.negate();
            insideRectangle = x.compareTo(negativeHalfR) >= 0 && y.compareTo(negativeR) >= 0;
        }

        return insideTriangle || insideQuarterCircle || insideRectangle;
    }

    private static BigDecimal divide(BigDecimal value, BigDecimal divisor) {
        return value.divide(divisor, SCALE, RoundingMode.HALF_UP);
    }
}
