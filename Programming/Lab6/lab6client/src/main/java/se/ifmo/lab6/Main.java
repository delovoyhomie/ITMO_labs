package se.ifmo.lab6;

import se.ifmo.lab6.core.io.console.BaseConsoleWorker;
import se.ifmo.lab6.core.io.console.ConsoleWorker;
import se.ifmo.lab6.core.socket.Client;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        ConsoleWorker bufferedConsoleWorker = new BaseConsoleWorker();
        Client client = new Client(bufferedConsoleWorker);
        new Thread(client).start();
    }
}