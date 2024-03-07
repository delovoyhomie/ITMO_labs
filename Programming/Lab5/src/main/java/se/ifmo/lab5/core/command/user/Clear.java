package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;

/**
 * Class of command Clear
 * @name clear
 * @help clear - clear collection
 */
public class Clear extends Command {
    public Clear() {
        super("clear", "очистить коллекцию");
    }

    @Override
    public Response execute(Request request) {
        CollectionManager.getInstance().getCollection().clear();
        return new Response("коллекция успешно очищена!");
    }
}
