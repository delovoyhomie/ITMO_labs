package se.ifmo.lab5.core.runner;

import se.ifmo.lab5.core.handler.Handler;
import se.ifmo.lab5.core.io.console.ConsoleWorker;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;
import se.ifmo.lab5.core.collection.CollectionManager;
import se.ifmo.lab5.core.collection.objects.Coordinates;
import se.ifmo.lab5.core.collection.objects.FuelType;
import se.ifmo.lab5.core.collection.objects.Vehicle;
import se.ifmo.lab5.core.collection.objects.VehicleType;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.function.Consumer;
import java.util.function.Function;

public class ConsoleRunner implements Runnable {
    public static final int MAX_RECURSION_DEPTH = 10;

    private final Handler handler;
    private final ConsoleWorker consoleWorker;

    private int currentRecursionDepth = 0;
    private final Deque<String> inboundQueries = new ArrayDeque<>();

    public ConsoleRunner(Handler handler, ConsoleWorker consoleWorker) {
        this.handler = handler;
        this.consoleWorker = consoleWorker;
    }

    @Override
    public void run() {
        // try load collection
        CollectionManager.getInstance().getCollection();

        String input;

        while ((input = consoleWorker.get("[%tl:%tM:%tS] ~ ")) != null) {
            currentRecursionDepth = 0;
            process(input);
        }

        consoleWorker.send("goodbye!");
    }

    private void process(String input) {
        if (currentRecursionDepth > MAX_RECURSION_DEPTH) {
            consoleWorker.send("Глубина рекурсии не может быть > " + MAX_RECURSION_DEPTH);
            inboundQueries.clear();
            return;
        }

        Request request = new Request();

        while (input.contains("element")) {
            input = input.replaceFirst("element", "");
            Vehicle inputVehicle = inputVehicle();

            System.out.println(CollectionManager.getInstance().getCollection().keySet()
                    .stream()
                    .max(Integer::compare).orElse(0) + 1);

            request.getCollection().put(CollectionManager.getInstance().getCollection().keySet()
                    .stream()
                    .max(Integer::compare).orElse(0) + 1, inputVehicle);
        }

        String[] parts = input.trim().split(" ", 2);

        request.setCommand(parts[0].trim());

        if (parts.length == 2) request.setText(parts[1].trim());

        Response response = handler.handle(request);

        if (!inboundQueries.isEmpty()) currentRecursionDepth++;
        inboundQueries.addAll(response.getInboundRequests());
        while (!inboundQueries.isEmpty()) process(inboundQueries.pollLast());

        if (response.getMessage() != null) consoleWorker.send(response.getMessage());

        if (response.getVehicles() != null)
            response.getVehicles().stream().map(Vehicle::toString).forEach(consoleWorker::send);

        consoleWorker.skip();
    }

    private Vehicle inputVehicle() {
        consoleWorker.skip();
        consoleWorker.send("Новая транспортное средство:");
        consoleWorker.skip();
        consoleWorker.send("> Введите основную информацию: ");

        Vehicle vehicle = new Vehicle();
        while (!input("название", vehicle::setName, str -> str)) ;
        while (!input("мощность", vehicle::setEnginePower, Integer::parseInt)) ;
        while (!input("вместимость", vehicle::setCapacity, Float::parseFloat)) ;
        while (!input("тип транспорта " + Arrays.toString(VehicleType.values()), vehicle::setType, VehicleType::valueOf))
            ;
        while (!input("тип топлива " + Arrays.toString(FuelType.values()), vehicle::setFuelType, FuelType::valueOf)) ;

        consoleWorker.skip();
        consoleWorker.send("> Введите информацию о координатах: ");

        Coordinates coordinates = new Coordinates();

        while (!input("x", coordinates::setX, Long::parseLong)) ;
        while (!input("y", coordinates::setY, Integer::parseInt)) ;

        vehicle.setCoordinates(coordinates);

        return vehicle;
    }

    private <K> boolean input(String fieldName, Consumer<K> setter, Function<String, K> parser) {
        try {
            setter.accept(parser.apply(consoleWorker.get(" - " + fieldName)));
            return true;
        } catch (Exception ex) {
            consoleWorker.send(ex.getMessage());
            return false;
        }
    }

}
