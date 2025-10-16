package ru.slava.lab1;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Parses raw query strings produced by Apache when forwarding requests to FastCGI.
 */
final class QueryParser {
    private QueryParser() {
    }

    static PointRequest parse(String rawQuery) throws ValidationException {
        if (rawQuery == null || rawQuery.isBlank()) {
            throw new ValidationException("Query string is empty");
        }

        try {
            Map<String, String> params = new LinkedHashMap<>();
            Arrays.stream(rawQuery.split("&"))
                    .filter(part -> !part.isBlank())
                    .forEach(part -> {
                        var kv = part.split("=", 2);
                        if (kv.length != 2) {
                            throw new IllegalArgumentException("Malformed query chunk: " + part);
                        }
                        var key = URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
                        var value = URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
                        params.put(key, value);
                    });

            int x = RequestValidator.parseX(params.get("x"));
            var y = RequestValidator.parseY(params.get("y"));
            var r = RequestValidator.parseR(params.get("r"));
            return new PointRequest(x, y, r);
        } catch (IllegalArgumentException parseProblem) {
            throw new ValidationException(parseProblem.getMessage());
        }
    }
}
