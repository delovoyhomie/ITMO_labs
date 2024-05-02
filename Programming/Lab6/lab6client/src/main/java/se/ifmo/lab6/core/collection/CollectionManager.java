package se.ifmo.lab6.core.collection;

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
        return collection;
    }
}
