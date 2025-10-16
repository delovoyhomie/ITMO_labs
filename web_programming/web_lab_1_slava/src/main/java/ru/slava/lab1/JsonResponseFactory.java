package ru.slava.lab1;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Utility class that produces lightweight JSON responses without third-party dependencies.
 */
final class JsonResponseFactory {
    private static final DateTimeFormatter ISO_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private JsonResponseFactory() {
    }

    static String success(PointRequest request, boolean hit, Duration processingTime) {
        return String.format(Locale.US,
                "{\"request\":{\"x\":%s,\"y\":%s,\"r\":%s}," +
                        "\"hit\":%s,\"meta\":{\"timestamp\":\"%s\",\"processingNanos\":%d}}",
                formatNumber(request.x()),
                formatNumber(request.y()),
                formatNumber(request.r()),
                Boolean.toString(hit),
                ISO_FORMAT.format(LocalDateTime.now()),
                processingTime.toNanos());
    }

    static String error(String message) {
        return String.format(Locale.US,
                "{\"error\":{\"timestamp\":\"%s\",\"message\":\"%s\"}}",
                ISO_FORMAT.format(LocalDateTime.now()),
                escape(message));
    }

    private static String formatNumber(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static String formatNumber(int value) {
        return Integer.toString(value);
    }

    private static String escape(String message) {
        return message
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
