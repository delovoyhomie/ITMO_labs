package ru.rmntim.web.points;

import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.rmntim.web.auth.User;
import ru.rmntim.web.common.SessionService;
import ru.rmntim.web.common.ValidationException;
import ru.rmntim.web.points.dto.PointRequest;
import ru.rmntim.web.points.dto.PointResponse;

@RestController
@RequestMapping("/api/points")
public class PointController {
    private final PointService pointService;
    private final SessionService sessionService;

    public PointController(PointService pointService, SessionService sessionService) {
        this.pointService = pointService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<PointResponse> list(HttpSession session) {
        User user = sessionService.requireUser(session);
        return pointService.getAll(user).stream().map(PointController::toResponse).collect(Collectors.toList());
    }

    @PostMapping
    public PointResponse create(@RequestBody PointRequest request, HttpSession session) {
        User user = sessionService.requireUser(session);
        BigDecimal x = parseDecimal(request.getX(), "X");
        BigDecimal y = parseDecimal(request.getY(), "Y");
        BigDecimal r = parseDecimal(request.getR(), "R");
        PointResult result = pointService.addPoint(user, x, y, r);
        return toResponse(result);
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(HttpSession session) {
        User user = sessionService.requireUser(session);
        pointService.clearAll(user);
        return ResponseEntity.noContent().build();
    }

    private static PointResponse toResponse(PointResult result) {
        return PointResponse.builder()
                .id(result.getId())
                .x(result.getX())
                .y(result.getY())
                .r(result.getR())
                .insideArea(result.isInsideArea())
                .checkedAt(result.getCheckedAt())
                .executionTime(result.getExecutionTime())
                .build();
    }

    private static BigDecimal parseDecimal(String raw, String field) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationException(field + " must be provided");
        }
        try {
            return new BigDecimal(raw.trim().replace(',', '.'));
        } catch (NumberFormatException ex) {
            throw new ValidationException(field + " must be a number");
        }
    }
}
