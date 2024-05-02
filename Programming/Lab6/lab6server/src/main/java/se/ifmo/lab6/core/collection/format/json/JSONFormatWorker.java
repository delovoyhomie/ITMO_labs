package se.ifmo.lab6.core.collection.format.json;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import se.ifmo.lab6.core.collection.UserCollection;
import se.ifmo.lab6.core.collection.format.FormatWorker;
import se.ifmo.lab6.core.collection.format.json.adapter.IgnoreFailureTypeAdapterFactory;
import se.ifmo.lab6.core.collection.format.json.adapter.ZoneDateTimeTypeAdapter;
import se.ifmo.lab6.core.collection.objects.Root;

import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZonedDateTime;

public class JSONFormatWorker implements FormatWorker<UserCollection> {
    private static final Gson gson = new GsonBuilder()
            .setLenient()
            .registerTypeAdapterFactory(new IgnoreFailureTypeAdapterFactory())
            .registerTypeAdapter(ZonedDateTime.class, new ZoneDateTimeTypeAdapter())
            .create();

    @Override
    public UserCollection readFile(Path filePath) {
        // check if file exists
        if (Files.notExists(filePath)) {
            System.out.printf("Файл %s не найден%n", filePath.getFileName());
            return new UserCollection();
        }

        // check if file is readable
        if (!Files.isReadable(filePath)) {
            System.out.printf("Файл %s не доступен для чтения%n", filePath.getFileName());
            return new UserCollection();
        }

        StringBuilder data = new StringBuilder();

        try(InputStreamReader inputStreamReader = new InputStreamReader(Files.newInputStream(filePath))) {
            char[] buffer = new char[1024];

            int bytesRead;

            while ((bytesRead = inputStreamReader.read(buffer)) != -1)
                data.append(new String(buffer, 0, bytesRead));
        } catch (Exception e) {
            System.out.printf("Ошибка чтения файла %s: %s%n", filePath.getFileName(), e.getMessage());
            return new UserCollection();
        }

        // parse file
        try {
            Root root =  gson.fromJson(data.toString(), Root.class);

            if (root == null || root.getVehicles() == null) {
                System.out.println("кажется, введенный файл пустой. будет инициализирована пустая коллекция.");
                return new UserCollection();
            }

            System.out.println("коллекция успешно проинициализирована! размер: " + root.getVehicles().size());
            return root.getVehicles();

        } catch (Exception e) {
            System.out.printf("Ошибка обработки файла %s%n%s%n", filePath.getFileName(), e.getMessage());
            return new UserCollection();
        }
    }

    @Override
    public void writeFile(UserCollection values, Path filePath) {
        // check if file exists
        if (Files.notExists(filePath)) {
            System.out.printf("Файл %s не найден%n", filePath.getFileName());
            return;
        }

        // check if file is writable
        if (!Files.isWritable(filePath)) {
            System.out.printf("Файл %s не доступен для чтения%n", filePath.getFileName());
            return;
        }

        // write to file
        try(PrintWriter printWriter = new PrintWriter(filePath.toFile())) {
            printWriter.write(gson.toJson(new Root(values)));
        } catch (Exception e) {
            System.out.printf("Ошибка записи в файл %s: %s%n", filePath.getFileName(), e.getMessage());
            return;
        }
    }
}
