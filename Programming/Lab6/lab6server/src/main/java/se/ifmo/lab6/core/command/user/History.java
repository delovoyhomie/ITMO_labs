package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.handler.Handler;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

import java.util.stream.Collectors;

/**
 * Class of command History
 * @name history
 * @help history - print last 5 commands (without their arguments)
 */
public class History extends Command {
    public History() {
        super("history", "вывести последние 5 команд (без их аргументов)");
    }

    @Override
    public Response execute(Request request) {
        return new Response(Handler.requests.stream().limit(5)
                .map(temp -> "\n" + temp.getCommand()).collect(Collectors.joining()));
    }
}
