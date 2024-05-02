package se.ifmo.lab6.core.command;

import se.ifmo.lab6.core.io.transfer.Request;
import se.ifmo.lab6.core.io.transfer.Response;

public abstract class Command {
    private final String name;
    private final String help;
    private final int elementsRequired;

    public Command(String name, String help) {
        this.name = name;
        this.help = help;
        this.elementsRequired = 0;
    }

    public Command(String name, String help, int elementsRequired) {
        this.name = name;
        this.help = help;
        this.elementsRequired = elementsRequired;
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

    public int getElementsRequired() {
        return elementsRequired;
    }

    public abstract Response execute(Request request);
}
