package se.ifmo.lab6;

import se.ifmo.lab6.core.collection.CollectionManager;
import se.ifmo.lab6.core.command.user.*;
import se.ifmo.lab6.core.handler.Handler;
import se.ifmo.lab6.core.io.console.ConsoleWorker;
import se.ifmo.lab6.core.socket.Server;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * Main class to start the program
 *
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
        Thread serverThread = getServerThread();

        new Thread(new Runnable() {
            private final BufferedReader inputStream = new BufferedReader(new InputStreamReader(System.in));

            @Override
            public void run() {
                String line;
                while (true) {
                    try {
                        if ((line=inputStream.readLine()) == null) break;

                        switch (line) {
                            case "save":
                                CollectionManager.getInstance().save();
                                System.out.println("saved");
                                break;
                            case "exit":
                                serverThread.interrupt();
                                System.out.println("goodbye!");
                                System.exit(0);
                                break;
                            default:
                                System.out.println("incorrect command");
                                break;
                        }

                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                }
            }
        }).start();
    }

    /**
     * Get server thread
     * @return server thread
     */
    private static Thread getServerThread() {
        Handler handler = new Handler(List.of(
                new Info(),
                new Insert(),
                new Show(),
                new Update(),
                new RemoveKey(),
                new Clear(),
//                new Save(),
                new ExecuteScript(),
                new Exit(),
                new RemoveGreater(),
                new History(),
                new RemoveGreaterKey(),
                new SumOfEnginePower(),
                new FilterStartsWithName(),
                new PrintUniqueType()
        ));

        Server server = new Server(handler);
        Thread serverThread = new Thread(server);
        serverThread.start();
        return serverThread;
    }
}