package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;
import se.ifmo.lab5.core.collection.UserCollection;

/**
 * Class of command Info
 * @name info
 * @help info - get information about collection (type, initialization date, number of elements)
 */
public class Info extends Command {
    public Info() {
        super("info", "получить информацию о коллекции (тип, дата инициализации, количество элементов)");
    }

    @Override
    public Response execute(Request request) {
        UserCollection collection = CollectionManager.getInstance().getCollection();

        return new Response(String.format("Коллекция:%nТип: %s%nДата инициализации: %s%nКоличество элементов: %d",
                collection.getClass().getName(), collection.getInitializedDate(), collection.size()));
    }
}
