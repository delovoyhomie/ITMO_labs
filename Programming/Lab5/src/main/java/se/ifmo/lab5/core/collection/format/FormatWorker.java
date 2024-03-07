package se.ifmo.lab5.core.collection.format;

import java.nio.file.Path;

public interface FormatWorker<K> {
    K readFile(Path filePath);
    void writeFile(K values, Path filePath);
}
