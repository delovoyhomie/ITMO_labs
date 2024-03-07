package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;

/**
 * Class of command FilterStartsWithName
 * @name filter_starts_with_name
 * @help filter_starts_with_name name - print elements, value of name field of which starts with given substring
 */
public class FilterStartsWithName extends Command {
    public FilterStartsWithName() {
        super("filter_starts_with_name", "filter_starts_with_name name - вывести элементы, значение поля name которых начинается с заданной подстроки");
    }

    @Override
    public Response execute(Request request) {
        if (CollectionManager.getInstance().getCollection().isEmpty())
            return new Response("Коллекция пуста!");

        return new Response("Все элементы, начинающиеся на " + request.getText(),
                CollectionManager.getInstance().getCollection().values()
                        .stream().filter(vehicle -> vehicle.getName().startsWith(request.getText()))
                        .toList());
    }
}
