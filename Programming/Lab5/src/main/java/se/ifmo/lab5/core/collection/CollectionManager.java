package se.ifmo.lab5.core.collection;

import se.ifmo.lab5.Main;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Class for managing the collection.
 * Singleton. Use {@link #getInstance()} to get the instance.
 */
public class CollectionManager {
    private UserCollection collection = null;

    private CollectionManager() {}

    private static CollectionManager instance = null;

    /**
     * @return the instance of the collection manager
     */
    public static CollectionManager getInstance() {
        if (instance == null) instance = new CollectionManager();
        return instance;
    }

    /**
     * @return current collection
     */
    public UserCollection getCollection() {
        if (collection == null) load(Main.ROOT_FILE);
        return collection;
    }

    /**
     * Saves the collection to the file. Uses the default file. {@link Main#ROOT_FILE}
     */
    public void save() {
        save(Main.ROOT_FILE);
    }

    /**
     * Saves the collection to the file.
     * @param path the path to the file
     */
    public void save(Path path) {
        FileManager.saveCollection(path, collection);
    }

    /**
     * Loads the collection from the file. Uses the default file. {@link Main#ROOT_FILE}
     * @return the loaded collection
     */
    public UserCollection load() {
        return load(Main.ROOT_FILE);
    }

    /**
     * Loads the collection from the file.
     * @param filePath the path to the file
     * @return the loaded collection
     */
    public UserCollection load(Path filePath) {
        return load(filePath, false);
    }

    /**
     * Loads the collection from the file.
     * @param filePath the path to the file
     * @param append if true, the loaded collection will be appended to the current one
     * @return the loaded collection
     */
    public UserCollection load(Path filePath, boolean append) {
        UserCollection loaded = FileManager.loadCollection(filePath);

        // validate elements
        List<Integer> unvalidatedIds = loaded.entrySet()
                .stream().filter(e -> {
                    try {
                        e.getValue().validate();
                        return false;
                    } catch (Exception ex) {
                        System.out.println(ex.getMessage());
                        return true;
                    }
                }).map(Map.Entry::getKey).toList();

        unvalidatedIds.forEach(loaded::remove);

        if (append) collection.putAll(loaded);
        else collection = loaded;

        return collection;
    }
}
