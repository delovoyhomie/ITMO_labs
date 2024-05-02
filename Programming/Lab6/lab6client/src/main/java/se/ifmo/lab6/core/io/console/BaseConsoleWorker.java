package se.ifmo.lab6.core.io.console;

import java.util.Date;
import java.util.Scanner;

public class BaseConsoleWorker extends ConsoleWorker {
    private Scanner sc = new Scanner(System.in);

    @Override
    public void send(String message) {
        System.out.println(message);
    }

    @Override
    public void error(String message) {
        System.err.println(message);
    }

    @Override
    public String get(String label) {
        final Date currentDate = new Date();
        System.out.print(String.format(label, currentDate, currentDate, currentDate) + ": ");
        try {
            return sc.nextLine();
        } catch (Exception ex) {

            return null;
        }
    }
}
