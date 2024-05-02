package se.ifmo.lab6.core.socket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import se.ifmo.lab6.Configuration;
import se.ifmo.lab6.Main;
import se.ifmo.lab6.core.collection.CollectionManager;
import se.ifmo.lab6.core.handler.Handler;
import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.util.HashMap;

public class Server implements Runnable {
    // log
    Logger log = LoggerFactory.getLogger(this.getClass());

    // chat handler
    private final Handler handler;

    private final HashMap<String, Integer> commandsUsage = new HashMap<>();

    public Server(Handler handler) {
        this.handler = handler;

        handler.getCommands().forEach(command -> {
            commandsUsage.put(command.getName(), command.getElementsRequired());
        });

        init();
    }

    /**
     * Initialize server
     */
    private void init() {
        // try to load collection
        CollectionManager.getInstance().getCollection();

        // check file permissions
        if (!Files.isWritable(Main.ROOT_FILE))
            log.warn("file {} is not writable", Main.ROOT_FILE.getFileName());
        if (!Files.isReadable(Main.ROOT_FILE))
            log.warn("file {} is not readable", Main.ROOT_FILE.getFileName());
    }

    /**
     * Run server
     */
    @Override
    public void run() {
        try (ServerSocket server = new ServerSocket(Configuration.SERVER_PORT)) { // Auto-Closable
            log.info("server started on port {}", Configuration.SERVER_PORT);

            while (!server.isClosed()) {
                Socket client = server.accept();

                new Thread(() -> {
                    try (Socket autoCloseableClient = client;
                         ObjectInputStream objectInputStream = new ObjectInputStream(client.getInputStream());
                         ObjectOutputStream objectOutputStream = new ObjectOutputStream(client.getOutputStream())) {

                        log.info("client connected: {}", client.getInetAddress());

                        while (!client.isClosed()) {
                            Request request = (Request) objectInputStream.readObject();
                            log.info("request from client ({}): {}", client.getInetAddress(), request.toString());

                            if (request.getCommand().equalsIgnoreCase("CONNECT")) {
                                log.info("connect request from client({})", client.getInetAddress());
                                Response connectResponse = new Response("CONNECTED");
                                connectResponse.setCommands(commandsUsage);

                                objectOutputStream.writeObject(connectResponse);
                                continue;
                            }

//                            CollectionManager.getInstance().save();

                            Response response = handleClient(request);
                            response.setCommands(commandsUsage);
                            log.info("response for client ({}): {}", client.getInetAddress(), response.toString());

                            objectOutputStream.writeObject(response);
                        }

                        log.info("client {} disconnected", client.getInetAddress());
                    } catch (Exception e) {
                        log.error("Error handling client {}: {}", client.getInetAddress(), e.getMessage());
                    }
                }).start();
            }
        } catch (IOException e) {
            log.error("Server exception: {}", e.getMessage());
        }
    }

    /**
     * Handle client request
     * @param request client request
     * @return response
     */
    private Response handleClient(Request request) {
        return handler.handle(request);
    }
}
