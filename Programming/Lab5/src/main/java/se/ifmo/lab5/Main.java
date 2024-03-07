package se.ifmo.lab5;

import se.ifmo.lab5.core.command.user.*;
import se.ifmo.lab5.core.handler.Handler;
import se.ifmo.lab5.core.io.console.BaseConsoleWorker;
import se.ifmo.lab5.core.io.console.ConsoleWorker;
import se.ifmo.lab5.core.runner.ConsoleRunner;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Main class to start the program
 *
 * @see ConsoleRunner
 * @see Handler
 * @see ConsoleWorker
 */
public class Main {
    public static Path ROOT_FILE;

    /**
     * main method to start the program
     * @param args - arguments from command line
     */
    public static void main(String[] args) {
        // validate arguments
        if (args.length == 0) {
            System.out.println("для использования программы необходимо ввести файл, с которым будет производиться работа.");
            return;
        }

        // set root file from arguments
        ROOT_FILE = Paths.get(args[0]);

        // if file doesn't exist, create it
        if (Files.notExists(ROOT_FILE)) {
            try {
                Files.createFile(ROOT_FILE);
                System.out.printf("Файл %s успешно был создан%n", ROOT_FILE.getFileName());
            } catch (IOException e) {
                System.out.printf("невозможно создать файл! %s%n", e.getMessage());
                return;
            }
        }

        // create & start console runner
        ConsoleRunner consoleRunner = getConsoleRunner();

        new Thread(consoleRunner).start();
    }

    /**
     * method to get {@link ConsoleRunner} with all necessary handlers
     * @return {@link ConsoleRunner}
     */
    private static ConsoleRunner getConsoleRunner() {
        Handler handler = new Handler(List.of(
                new Info(),
                new Insert(),
                new Show(),
                new Update(),
                new RemoveKey(),
                new Clear(),
                new Save(),
                new ExecuteScript(),
                new Exit(),
                new RemoveGreater(),
                new History(),
                new RemoveGreaterKey(),
                new SumOfEnginePower(),
                new FilterStartsWithName(),
                new PrintUniqueType()
        ));

        ConsoleWorker bufferedConsoleWorker = new BaseConsoleWorker();

        return new ConsoleRunner(handler, bufferedConsoleWorker);
    }
}