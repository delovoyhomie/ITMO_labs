package se.ifmo.lab5.core.command;

import se.ifmo.lab5.core.io.transfer.Request;
import se.ifmo.lab5.core.io.transfer.Response;

public abstract class Command {
    private final String name;
    private final String help;

    public Command(String name, String help) {
        this.name = name;
        this.help = help;
    }
    public Command(String name) {
        this(name, String.format("помощь по команде %s отсутствует", name));
    }

    public String getName() {
        return name;
    }
    public String getHelp() {
        return help;
    }

    public abstract Response execute(Request request);
}
