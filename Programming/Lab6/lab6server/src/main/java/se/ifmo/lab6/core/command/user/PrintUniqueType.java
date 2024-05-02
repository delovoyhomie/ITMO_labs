package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;
import se.ifmo.lab6.core.collection.CollectionManager;

/**
 * Class of command PrintUniqueType
 * @name print_unique_type
 * @help print_unique_type - print unique values of type field of all elements in collection
 */
public class PrintUniqueType extends Command {
    public PrintUniqueType() {
        super("print_unique_type", "вывести уникальные значения поля type всех элементов в коллекции");
    }

    @Override
    public Response execute(Request request) {
        if (CollectionManager.getInstance().getCollection().isEmpty())
            return new Response("Коллекция пуста!");

        return new Response("Уникальные значения поля type всех элементов в коллекции: \n" +
                CollectionManager.getInstance().getCollection().values().stream()
                        .map(vehicle -> vehicle.getType().toString())
                        .distinct().toList());
    }
}
