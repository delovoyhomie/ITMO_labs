package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;
import se.ifmo.lab6.core.collection.CollectionManager;

/**
 * Class of command Update
 * @name update
 * @help update id {element} - update value of collection element by id
 */
public class Update extends Command {
    public Update() {
        super("update", "{id} {element} - обновить значение элемента коллекции по id", 1);
    }

    @Override
    public Response execute(Request request) {
        // validate request
        if (request.getText() == null || request.getText().isBlank())
            return new Response("ошибка! необходимо ввести ключ!");
        if (!request.getText().matches("\\d+"))
            return new Response("ошибка! ключ должен быть числом!");
        if (request.getCollection().isEmpty())
            return new Response("ошибка! в запросе отсутствуют элементы!");
        if (request.getCollection().size()>1)
            return new Response("ошибка! в запросе присутствует более одного элемента!");

        // get id
        long id;
        try {
            id = Long.parseLong(request.getText());
        } catch (NumberFormatException e) {
            return new Response(String.format("ошибка при обработке ключа: %s", e.getMessage()));
        }

        if (!CollectionManager.getInstance().getCollection().containsKey(id))
            return new Response(String.format("Элемента с id %d не существует!", id));

        // update element in collection
        CollectionManager.getInstance().getCollection().put(id, request.getCollection().get(request.getCollection().keySet().iterator().next()));

        return new Response(String.format("элемент с id %d успешно обновлен!", id));
    }
}
