package se.ifmo.lab6.core.socket;

import se.ifmo.lab6.Configuration;
import se.ifmo.lab6.core.collection.objects.Coordinates;
import se.ifmo.lab6.core.collection.objects.FuelType;
import se.ifmo.lab6.core.collection.objects.Vehicle;
import se.ifmo.lab6.core.collection.objects.VehicleType;
import se.ifmo.lab6.core.io.console.ConsoleWorker;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.Socket;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import java.util.function.Function;

public class Client implements Runnable {
    public static final int MAX_RECURSION_DEPTH = 10;
    private int currentRecursionDepth = 0;

    private final ConsoleWorker consoleWorker;

    private Socket server;
    private ObjectOutputStream objectOutputStream;
    private ObjectInputStream objectInputStream;

    private int reconnectCount = 0;

    private HashMap<String, Integer> serverCommands = new HashMap<>();

    private final Deque<String> inboundQueries = new ArrayDeque<>();

    public Client(ConsoleWorker consoleWorker) {
        this.consoleWorker = consoleWorker;
    }

    @Override
    public void run() {
        consoleWorker.send("Команды для управления подключением:\n'reconnect' - переподключиться к серверу\n'exit' - завершить работу");

        consoleWorker.send("Попытка подключения к серверу...");
        connect();

        String input;
        while ((input = consoleWorker.get("[%tl:%tM:%tS] ~ ")) != null) {
            handle(input);
            while (!inboundQueries.isEmpty()) handle(inboundQueries.pollLast());
        }
    }

    // + разделить на разные jar'ники server и client
    // + корректно выводить попытки

    private void handle(String input) {
        // check system commands
        switch (input) {
            case "reconnect": // reconnect to server
                shutdownGracefully();
                connect();
                break;
            case "exit": // exit
                shutdownGracefully();
                System.exit(0);
                break;
            default: // send request and get response
                Request request = parseString(input);
                if (request == null) return;

                Response response = sendAndGet(request);

                if (response == null) {
                    consoleWorker.send("Сервер вернул пустой запрос");
                    return;
                }

                if (!response.getInboundRequests().isEmpty()) {
                    currentRecursionDepth++;
                    inboundQueries.addAll(response.getInboundRequests());
                    return;
                }

                if (currentRecursionDepth > MAX_RECURSION_DEPTH) {
                    consoleWorker.send("Глубина рекурсии не может быть > " + MAX_RECURSION_DEPTH);
                    inboundQueries.clear();
                    return;
                }

                serverCommands = Optional.ofNullable(response.getCommands()).orElse(new HashMap<>());

                if (response.getMessage() != null) consoleWorker.send(response.getMessage());
                if (response.getVehicles() != null) response.getVehicles()
                        .forEach((k) -> consoleWorker.send(k.toString()));

                break;
        }
    }

    private Request parseString(String input) {
        Request request = new Request();

        String[] parts = input.trim().split(" ", 2);
        request.setCommand(parts[0]);

        int requiredElements = serverCommands.getOrDefault(request.getCommand(), 0);

        while (requiredElements-- > 0) {
            try {
                if (inboundQueries.isEmpty())
                    request.getCollection().put(System.currentTimeMillis(), inputVehicle());
                else request.getCollection().put(System.currentTimeMillis(), inputVehicleFromInboundRequests());
            } catch (Throwable t) {
                consoleWorker.send("выход из команды: " + t.getMessage());
                return null;
            }
        }

        if (parts.length == 2) request.setText(parts[1].trim());

        return request;
    }

    private Response sendAndGet(Request request) {
        sendRequest(request);
        try {
            return (Response) objectInputStream.readObject();
        } catch (IOException | ClassNotFoundException e) {
            consoleWorker.error("Ошибка получения ответа: " + e.getMessage());
            return null;
        }
    }

    private void sendRequest(Request request) {
        try {
            objectOutputStream.writeObject(request);
        } catch (IOException e) {
            consoleWorker.error("Ошибка отправки запроса: " + e.getMessage());
            consoleWorker.error("Используйте 'reconnect' для переподключения");
        }
    }

    private void shutdownGracefully() {
        try {
            if (objectInputStream != null) objectInputStream.close();
            if (objectOutputStream != null) objectOutputStream.close();
            if (server != null) server.close();

            objectInputStream = null;
            objectOutputStream = null;
            server = null;

            consoleWorker.send("Соединение с сервером разорвано");
        } catch (IOException e) {
            consoleWorker.error("Ошибка закрытия потоков:" + e.getMessage());
        }
    }

    private void connect() {
        try {
            server = new Socket(Configuration.SERVER_ADDRESS, Configuration.SERVER_PORT);
            server.setSoTimeout(1000);
            objectOutputStream = new ObjectOutputStream(server.getOutputStream());
            objectInputStream = new ObjectInputStream(server.getInputStream());

            Response connectResponse = sendAndGet(new Request("CONNECT"));

            Optional.ofNullable(connectResponse).ifPresent((presentResponse) ->
                    serverCommands = presentResponse.getCommands());

            consoleWorker.send(String.format("Подключение к серверу (%s:%d) прошло успешно", Configuration.SERVER_ADDRESS, Configuration.SERVER_PORT));
        } catch (IOException e) {
            consoleWorker.error("Ошибка подключения к серверу. Попытка переподключения через " + Configuration.CLIENT_RECONNECT_DELAY + " секунд | попыток: " + reconnectCount + "/" + Configuration.CLIENT_MAX_CONNECTION_TRIES);
            shutdownGracefully();

            try {
                TimeUnit.SECONDS.sleep(Configuration.CLIENT_RECONNECT_DELAY);

                if (reconnectCount++ > Configuration.CLIENT_MAX_CONNECTION_TRIES) {
                    System.exit(1);
                }

                connect();
            } catch (InterruptedException ex) {
                consoleWorker.error("Ошибка ожидания переподключения");
                return;
            }
        }
    }

    private Vehicle inputVehicleFromInboundRequests() throws Throwable {
        Vehicle vehicle = new Vehicle();
        while (!input("название", vehicle::setName, str -> str, inboundQueries.pollLast())) ;
        while (!input("мощность", vehicle::setEnginePower, Integer::parseInt, inboundQueries.pollLast())) ;
        while (!input("вместимость", vehicle::setCapacity, Float::parseFloat, inboundQueries.pollLast())) ;
        while (!input("тип транспорта " + Arrays.toString(VehicleType.values()), vehicle::setType, VehicleType::valueOf, inboundQueries.pollLast())) ;
        while (!input("тип топлива " + Arrays.toString(FuelType.values()), vehicle::setFuelType, FuelType::valueOf, inboundQueries.pollLast())) ;

        Coordinates coordinates = new Coordinates();

        while (!input("x", coordinates::setX, Long::parseLong, inboundQueries.pollLast())) ;
        while (!input("y", coordinates::setY, Integer::parseInt, inboundQueries.pollLast())) ;

        vehicle.setCoordinates(coordinates);

        return vehicle;
    }

    private Vehicle inputVehicle() throws Throwable {
        consoleWorker.skip();
        consoleWorker.send("Новая транспортное средство:");
        consoleWorker.skip();
        consoleWorker.send("> Введите основную информацию: ");

        Vehicle vehicle = new Vehicle();
        while (!input("название", vehicle::setName, str -> str)) ;
        while (!input("мощность", vehicle::setEnginePower, Integer::parseInt)) ;
        while (!input("вместимость", vehicle::setCapacity, Float::parseFloat)) ;
        while (!input("тип транспорта " + Arrays.toString(VehicleType.values()), vehicle::setType, VehicleType::valueOf)) ;
        while (!input("тип топлива " + Arrays.toString(FuelType.values()), vehicle::setFuelType, FuelType::valueOf)) ;

        consoleWorker.skip();
        consoleWorker.send("> Введите информацию о координатах: ");

        Coordinates coordinates = new Coordinates();

        while (!input("x", coordinates::setX, Long::parseLong)) ;
        while (!input("y", coordinates::setY, Integer::parseInt)) ;

        vehicle.setCoordinates(coordinates);

        return vehicle;
    }

    private <K> boolean input(String fieldName, Consumer<K> setter, Function<String, K> parser, String line) throws Throwable {
        try {
            if (line.equals("return")) throw new Throwable("остановка return'ом");

            setter.accept(parser.apply(line));
            return true;
        } catch (Exception ex) {
            consoleWorker.error(ex.getMessage());
            return false;
        }
    }

    private <K> boolean input(String fieldName, Consumer<K> setter, Function<String, K> parser) throws Throwable {
        try {
            String line = consoleWorker.get(" - " + fieldName);
            if (line == null || line.equals("return")) throw new Throwable("вызван return");

            setter.accept(parser.apply(line));
            return true;
        } catch (Exception ex) {
            consoleWorker.send(ex.getMessage());
            return false;
        }
    }
}
