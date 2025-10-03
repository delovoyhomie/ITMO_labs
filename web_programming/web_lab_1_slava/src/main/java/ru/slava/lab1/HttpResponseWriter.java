package ru.slava.lab1;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Builds HTTP responses for the FastCGI bridge.
 */
final class HttpResponseWriter {
    private static final String OK_TEMPLATE = "HTTP/1.1 200 OK\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: %d\r\n\r\n%s\r\n";

    private static final String BAD_REQUEST_TEMPLATE = "HTTP/1.1 400 Bad Request\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: %d\r\n\r\n%s\r\n";

    private static final String INTERNAL_ERROR_TEMPLATE = "HTTP/1.1 500 Internal Server Error\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: %d\r\n\r\n%s\r\n";

    String success(String payload) {
        return format(OK_TEMPLATE, payload);
    }

    String badRequest(String payload) {
        return format(BAD_REQUEST_TEMPLATE, payload);
    }

    String internalError(String payload) {
        return format(INTERNAL_ERROR_TEMPLATE, payload);
    }

    private String format(String template, String payload) {
        var contentLength = payload.getBytes(StandardCharsets.UTF_8).length;
        return String.format(Locale.US, template, contentLength, payload);
    }
}
