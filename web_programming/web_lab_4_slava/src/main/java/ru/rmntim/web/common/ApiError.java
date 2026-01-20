package ru.rmntim.web.common;

import java.time.Instant;

public class ApiError {
    private final String message;
    private final Instant timestamp;

    public ApiError(String message) {
        this.message = message;
        this.timestamp = Instant.now();
    }

    public String getMessage() {
        return message;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
