package ru.rmntim.web.points;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.rmntim.web.auth.User;
import ru.rmntim.web.common.ValidationException;

@Service
public class PointService {
    private static final BigDecimal X_MIN = new BigDecimal("-2");
    private static final BigDecimal X_MAX = new BigDecimal("2");
    private static final BigDecimal Y_MIN = new BigDecimal("-3");
    private static final BigDecimal Y_MAX = new BigDecimal("5");
    private static final BigDecimal HALF = new BigDecimal("0.5");
    private static final Set<BigDecimal> ALLOWED_R = Set.of(
            new BigDecimal("-2"),
            new BigDecimal("-1.5"),
            new BigDecimal("-1"),
            new BigDecimal("-0.5"),
            new BigDecimal("0"),
            new BigDecimal("0.5"),
            new BigDecimal("1"),
            new BigDecimal("1.5"),
            new BigDecimal("2")
    ).stream().map(BigDecimal::stripTrailingZeros).collect(Collectors.toSet());

    private final PointRepository pointRepository;

    public PointService(PointRepository pointRepository) {
        this.pointRepository = pointRepository;
    }

    @Transactional
    public PointResult addPoint(User user, BigDecimal x, BigDecimal y, BigDecimal r) {
        validate(x, y, r);
        long start = System.nanoTime();
        boolean inside = isInside(x, y, r);
        long executionTime = System.nanoTime() - start;

        PointResult result = new PointResult();
        result.setX(x);
        result.setY(y);
        result.setR(r);
        result.setInsideArea(inside);
        result.setCheckedAt(Instant.now());
        result.setExecutionTime(executionTime);
        result.setUser(user);

        return pointRepository.save(result);
    }

    public List<PointResult> getAll(User user) {
        return pointRepository.findAllByUserOrderByIdAsc(user);
    }

    @Transactional
    public void clearAll(User user) {
        pointRepository.deleteByUserId(user.getId());
    }

    private void validate(BigDecimal x, BigDecimal y, BigDecimal r) {
        if (x == null || y == null || r == null) {
            throw new ValidationException("All coordinates must be provided");
        }

        if (x.compareTo(X_MIN) < 0 || x.compareTo(X_MAX) > 0) {
            throw new ValidationException("X must be between -2 and 2");
        }

        if (y.compareTo(Y_MIN) < 0 || y.compareTo(Y_MAX) > 0) {
            throw new ValidationException("Y must be between -3 and 5");
        }

        BigDecimal normalizedR = r.stripTrailingZeros();
        if (!ALLOWED_R.contains(normalizedR)) {
            throw new ValidationException("R must be selected from the allowed list");
        }

        if (r.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("R must be greater than 0");
        }
    }

    private boolean isInside(BigDecimal x, BigDecimal y, BigDecimal r) {
        BigDecimal halfR = r.multiply(HALF);
        BigDecimal zero = BigDecimal.ZERO;

        boolean square = x.compareTo(zero) <= 0
                && x.compareTo(r.negate()) >= 0
                && y.compareTo(zero) >= 0
                && y.compareTo(r) <= 0;

        boolean triangle = x.compareTo(zero) >= 0
                && y.compareTo(zero) >= 0
                && x.add(y).compareTo(halfR) <= 0;

        boolean quarterCircle = x.compareTo(zero) >= 0
                && y.compareTo(zero) <= 0
                && x.multiply(x).add(y.multiply(y)).compareTo(halfR.multiply(halfR)) <= 0;

        return square || triangle || quarterCircle;
    }
}
