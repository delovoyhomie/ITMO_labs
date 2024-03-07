package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;
import se.ifmo.lab5.core.collection.objects.Vehicle;

import java.util.List;
import java.util.Map;

/**
 * Class of command RemoveGreater
 * @name remove_greater
 * @help remove_greater {element} - delete from collection all elements greater than the specified one
 */
public class RemoveGreater extends Command {
    public RemoveGreater() {
        super("remove_greater", "remove_greater {element} - удалить из коллекции все элементы, превышающие заданный");
    }

    @Override
    public Response execute(Request request) {
        // validate request
        if (request.getText() == null || request.getText().isEmpty())
            return new Response("ошибка! в запросе отсутствуют данные!");
        if (!request.getText().matches("\\d+"))
            return new Response("ошибка! запрос должен быть вида | insert ID {element}");
        if (request.getCollection().isEmpty()) return new Response("ошибка! должен быть введен хотя бы один элемент");

        // get collection manager
        CollectionManager collectionManager = CollectionManager.getInstance();

        // get element to compare
        Vehicle inputElement = request.getCollection().values().iterator().next();

        // list of ids to remove
        List<Integer> idsToRemove = collectionManager.getCollection().entrySet().stream()
                .filter(e -> e.getValue().compareTo(inputElement) >= 0)
                .map(Map.Entry::getKey).toList();

        // delete elements from collection
        idsToRemove.forEach(collectionManager.getCollection()::remove);

        // return response
        return new Response(String.format("ID %s успешно удалены", idsToRemove));
    }
}
