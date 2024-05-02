package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.collection.CollectionManager;
import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

import java.util.List;

/**
 * Class of command RemoveGreaterKey
 * @name remove_greater_key
 * @help remove_greater_key null - delete from the collection all elements whose key exceeds the specified one
 */
public class RemoveGreaterKey extends Command {
    public RemoveGreaterKey() {
        super("remove_greater_key", "{id} - удалить из коллекции все элементы, ключ которых превышает заданный");
    }

    @Override
    public Response execute(Request request) {
        // validate request
        if (request.getText() == null || request.getText().isBlank())
            return new Response("ошибка! необходимо ввести ключ!");
        if (!request.getText().matches("\\d+"))
            return new Response("ошибка! ключ должен быть числом!");

        int id;
        try {
            id = Integer.parseInt(request.getText());
        } catch (NumberFormatException e) {
            return new Response(String.format("ошибка при обработке ключа: %s", e.getMessage()));
        }

        List<Long> idsToRemove = request.getCollection().keySet().stream()
                .filter(k -> k > Integer.parseInt(request.getText()))
                .toList();

        // fix here
        idsToRemove.forEach(CollectionManager.getInstance().getCollection()::remove);

        return new Response(String.format("ID's %s успешно удалены", idsToRemove));
    }
}
