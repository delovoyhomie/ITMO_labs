package ru.slava.lab1;

import com.fastcgi.FCGIInterface;
import com.fastcgi.FCGIRequest;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public final class FastCgiApp {

    private FastCgiApp() {
    }

    public static void main(String[] args) throws InterruptedException {
        var fcgi = new FCGIInterface();
        var http = new HttpResponseWriter();
        // Пул потоков обрабатывает несколько запросов параллельно
        ExecutorService executor = Executors.newFixedThreadPool(
                Math.max(2, Runtime.getRuntime().availableProcessors())
        );

        // При завершении процесса корректно гасим пул
        Runtime.getRuntime().addShutdownHook(new Thread(() -> shutdownExecutor(executor)));

        try {
            // Основной цикл приёма запросов FastCGI
            while (fcgi.FCGIaccept() >= 0) {
                // Захватываем объект запроса до следующего accept()
                FCGIRequest request = FCGIInterface.request;
                // Передаём обработку в пул потоков
                executor.submit(() -> handleRequest(request, http));
            }
        } finally {
            shutdownExecutor(executor);
        }
    }

    private static void handleRequest(FCGIRequest request, HttpResponseWriter http) {
        try {
            // Получаем query string из параметров конкретного запроса
            String query = request.params.getProperty("QUERY_STRING", "");
            PointRequest point = QueryParser.parse(query);

            // Измеряем время вычисления попадания точки
            Instant start = Instant.now();
            boolean hit = HitAreaChecker.isInside(point);
            Duration processing = Duration.between(start, Instant.now());

            String payload = JsonResponseFactory.success(point, hit, processing);
            // Отправляем успешный ответ в поток FastCGI
            writeResponse(request, http.success(payload));
        } catch (ValidationException ex) {
            String payload = JsonResponseFactory.error(ex.getMessage());
            writeResponse(request, http.badRequest(payload));
        } catch (Exception unexpected) {
            String payload = JsonResponseFactory.error("Unexpected server error");
            writeResponse(request, http.internalError(payload));
        } finally {
            try {
                request.outStream.flush();
            } catch (Exception ignored) {
            }
        }
    }

    private static void writeResponse(FCGIRequest request, String response) {
        try {
            // Пишем HTTP-ответ непосредственно в FastCGI-канал
            request.outStream.write(response.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
        }
    }

    private static void shutdownExecutor(ExecutorService executor) {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException interrupted) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
