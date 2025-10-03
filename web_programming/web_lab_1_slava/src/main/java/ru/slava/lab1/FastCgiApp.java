package ru.slava.lab1;

import com.fastcgi.FCGIInterface;

import java.time.Duration;
import java.time.Instant;

/**
 * Entry point for the FastCGI application. Reads incoming requests, validates parameters
 * and writes JSON responses back to the web server.
 */
public final class FastCgiApp {

    private FastCgiApp() {
    }

    public static void main(String[] args) {
        var fcgi = new FCGIInterface();
        var http = new HttpResponseWriter();

        while (fcgi.FCGIaccept() >= 0) {
            try {
                var rawQuery = System.getProperty("QUERY_STRING");
                if (rawQuery == null || rawQuery.isBlank()) {
                    rawQuery = System.getenv().getOrDefault("QUERY_STRING", "");
                }

                var request = QueryParser.parse(rawQuery);

                var start = Instant.now();
                var hit = HitAreaChecker.isInside(request);
                var processingTime = Duration.between(start, Instant.now());

                var payload = JsonResponseFactory.success(request, hit, processingTime);
                System.out.print(http.success(payload));
                System.out.flush();
            } catch (ValidationException validationException) {
                var payload = JsonResponseFactory.error(validationException.getMessage());
                System.out.print(http.badRequest(payload));
                System.out.flush();
            } catch (Exception unexpected) {
                var payload = JsonResponseFactory.error("Unexpected server error");
                System.out.print(http.internalError(payload));
                System.out.flush();
            }
        }
    }
}
