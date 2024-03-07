package se.ifmo.lab5.core.handler;

import se.ifmo.lab5.core.command.Command;
import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Class of handler

 * {@link Handler#commands} - list of commands
 * {@link Handler#requests} - deque of requests
 */
public class Handler {
    private final List<Command> commands;

    public static volatile Deque<Request> requests = new ArrayDeque<>();

    public Handler(List<Command> commands) {
        this.commands = commands;
    }

    /**
     * Handle request and return response
     *
     * @param request - request to handle
     * @return response to request or error message
     */
    public Response handle(Request request) {
        requests.push(request);

        // validate query
        if (request == null)
            return new Response("ошибка! запрос не может быть пустым.");

        if (request.getCommand() == null || request.getCommand().isBlank())
            return new Response("ошибка! команда не может быть пустой.");

        // check if user wants help
        if (request.getCommand().equals("help"))
            return getHelp();

        // find suitable command
        List<Command> suitableCommands = commands.stream()
                .filter(command -> command.getName().equals(request.getCommand()))
                .toList();

        // validate suitable commands
        if (suitableCommands.isEmpty())
            return new Response("ошибка! неизвестная команда: " + request.getCommand() + "\nвведите 'help' для справки.");
        if (suitableCommands.size() > 1)
            System.out.println("WARN! найдено несколько подходящих команд: " + suitableCommands);

        // execute command
        return suitableCommands.get(0).execute(request);
    }

    /**
     * Get help message for all commands
     * @return help message
     */
    public Response getHelp() {
        final int maxCommandNameLength = commands.stream()
                .map(Command::getName)
                .mapToInt(String::length).max().orElse(0);

        return new Response(commands.stream()
                .map(command -> String.format("%n * %" + maxCommandNameLength + "s - %s", command.getName(), command.getHelp()))
                .collect(Collectors.joining()));
    }
}
