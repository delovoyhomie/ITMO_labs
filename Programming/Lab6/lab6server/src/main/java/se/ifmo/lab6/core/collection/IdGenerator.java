package se.ifmo.lab6.core.collection;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;
import java.util.concurrent.atomic.AtomicLong;

public class IdGenerator {
    private static IdGenerator instance = null;

    private IdGenerator() {
        try {
            if (!Files.isWritable(ID_STORAGE_PATH)) throw new IOException("ID file is not writable");
            if (!Files.isReadable(ID_STORAGE_PATH) && Files.size(ID_STORAGE_PATH) == 0) Files.delete(ID_STORAGE_PATH);
            if (Files.notExists(ID_STORAGE_PATH)) Files.createFile((ID_STORAGE_PATH));
            String lastId = new String(Files.readAllBytes(ID_STORAGE_PATH));
            currentId = new AtomicLong(Long.parseLong(lastId.trim()));
        } catch (IOException | NumberFormatException e) {
            currentId = new AtomicLong(0);
        }
    }

    public static IdGenerator getInstance() {
        if (instance == null) instance = new IdGenerator();
        return instance;
    }


    private static final Path ID_STORAGE_PATH = Path.of("ID");
    private AtomicLong currentId;

    public synchronized long generateId() {
        long id = currentId.incrementAndGet();
        try {
            Files.write(ID_STORAGE_PATH, String.valueOf(id).getBytes());
        } catch (IOException e) {
            System.err.println(e.getMessage());
        }
        return id;
    }
}
