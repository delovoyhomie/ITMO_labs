package se.ifmo.lab6.core.collection;

import se.ifmo.lab6.core.collection.format.FormatWorker;
import se.ifmo.lab6.core.collection.format.json.JSONFormatWorker;

import java.nio.file.Path;

public class FileManager {
    private static final FormatWorker<UserCollection> formatWorker = new JSONFormatWorker();

    public static UserCollection loadCollection(Path path) {
        return formatWorker.readFile(path);
    }

    public static void saveCollection(Path path, UserCollection collection) {
        formatWorker.writeFile(collection, path);
    }
}
