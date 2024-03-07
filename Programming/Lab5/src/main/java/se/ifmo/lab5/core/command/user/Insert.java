package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;

/**
 * Class of command Insert
 * @name insert
 * @help insert {id} {element} - add new element with given key
 */
public class Insert extends Command {
    public Insert() {
        super("insert", "insert {id} {element} - добавить новый элемент с заданным ключом");
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
        int id;
        try {
            id = Integer.parseInt(request.getText());
        } catch (NumberFormatException e) {
            return new Response(String.format("ошибка при обработке ключа: %s", e.getMessage()));
        }

        if (CollectionManager.getInstance().getCollection().containsKey(id))
            return new Response(String.format("Элемент с id %d уже существует!\nИспользуйте команду 'update', чтобы обновить уже созданный элемент\nподробнее в help", id));

        // add element to collection
        CollectionManager.getInstance().getCollection().put(id, request.getCollection().get(request.getCollection().keySet().iterator().next()));
        return new Response(String.format("элемент с id %d успешно добавлен!", id));
    }
}
