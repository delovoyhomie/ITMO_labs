package se.ifmo.lab6.core.command.user;

import se.ifmo.lab6.core.command.Command;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

import java.io.BufferedReader;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Class of command ExecuteScript
 * @name execute_script
 * @help execute_script file_name - read and execute script from file
 */
public class ExecuteScript extends Command {
    public ExecuteScript() {
        super("execute_script", "execute_script file_name - считать и исполнить скрипт из указанного файла.");
    }

    @Override
    public Response execute(Request request) {
        // validate request
        if (request.getText() == null || request.getText().isEmpty())
            return new Response("ошибка! в запросе отсутствуют данные!");

        Path path = Paths.get(request.getText());

        if (Files.notExists(path))
            return new Response("ошибка! введенный файл не существует");
        if (!Files.isReadable(path))
            return new Response("ошибка! введенный файл не доступен для чтения");

        // read and execute script from file
        Deque<String> inboundRequests = new ArrayDeque<>();

        try(BufferedReader fileReader = new BufferedReader(new FileReader(request.getText()))) {
            while (fileReader.ready())
                inboundRequests.push(fileReader.readLine());
        } catch (Exception e) {
            System.err.println(e.getMessage());
        }

        Response response = new Response(null);
        response.addInboundRequests(inboundRequests);

        return response;
    }
}
