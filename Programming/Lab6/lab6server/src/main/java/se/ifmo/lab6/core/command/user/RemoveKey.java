package se.ifmo.lab6.core.command.user;


import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;
import se.ifmo.lab6.core.collection.CollectionManager;

/**
 * Class of command RemoveKey
 * @name remove_key
 * @help remove_key {id} - delete element from collection by its key
 */
public class RemoveKey extends Command {
    public RemoveKey() {
        super("remove_key", "{id} - удалить элемент из коллекции по его ключу");
    }

    @Override
    public Response execute(Request request) {
        // validate request
        if (request.getText() == null || request.getText().isBlank())
            return new Response("ошибка! необходимо ввести ключ!");
        if (!request.getText().matches("\\d+"))
            return new Response("ошибка! ключ должен быть числом!");

        // get id
        int id;
        try {
            id = Integer.parseInt(request.getText());
        } catch (NumberFormatException e) {
            return new Response(String.format("ошибка при обработке ключа: %s", e.getMessage()));
        }

        boolean removed = CollectionManager.getInstance().getCollection().remove(id) != null;

        // remove element from collection
        return new Response(String.format("Элемент с id %d %s", id, removed ? "успешно удален" : "не найден"));
    }
}
