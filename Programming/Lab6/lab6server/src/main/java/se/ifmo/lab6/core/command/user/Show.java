package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;
import se.ifmo.lab6.core.collection.CollectionManager;

/**
 * Class of command Show
 * @name show
 * @help show - get all elements in collection (in string representation)
 */
public class Show extends Command {
    public Show() {
        super("show", "вывести все элементы в коллекции (в строковом представлении)");
    }

    @Override
    public Response execute(Request request) {
        return new Response("элементы коллекции", CollectionManager.getInstance().getCollection().values().stream().toList());
    }
}
