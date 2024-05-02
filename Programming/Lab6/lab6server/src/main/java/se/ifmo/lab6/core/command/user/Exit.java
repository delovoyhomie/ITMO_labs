package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

/**
 * Class of command Exit
 * @name exit
 * @help exit - end the program (without saving to file)
 */
public class Exit extends Command {
    public Exit() {
        super("exit", "завершить программу (без сохранения в файл)");
    }

    @Override
    public Response execute(Request request) {
        System.exit(0);
        return new Response("goodbye!");
    }
}
