package se.ifmo.lab5.core.command.user;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;
import se.ifmo.lab5.core.collection.objects.Vehicle;

public class SumOfEnginePower extends Command {
    public SumOfEnginePower() {
        super("sum_of_engine_power", "вывести сумму значений поля enginePower для всех элементов коллекции");
    }

    @Override
    public Response execute(Request request) {
        if (CollectionManager.getInstance().getCollection().isEmpty())
            return new Response("Коллекция пуста!");

        return new Response(String.format("Суммарная мощность всех элементов коллекции: %d", CollectionManager.getInstance().getCollection().values()
                .stream().mapToInt(Vehicle::getEnginePower).sum()));
    }
}
