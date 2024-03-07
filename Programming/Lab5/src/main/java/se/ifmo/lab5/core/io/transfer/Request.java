package se.ifmo.lab5.core.io.transfer;

import se.ifmo.lab5.core.collection.UserCollection;

public class Request {
    private String command;

    private UserCollection collection = new UserCollection();
    private String text;

    public Request(String command, UserCollection collection, String text) {
        this.command = command;
        this.collection = collection;
        this.text = text;
    }

    public Request(String command, UserCollection collection) {
        this(command, collection, null);
    }

    public Request(String command, String text) {
        this(command, null, text);
    }

    public Request(String command) {
        this(command, null, null);
    }

    public Request() {}

    public String getCommand() {
        return command;
    }

    public UserCollection getCollection() {
        return collection;
    }

    public String getText() {
        return text;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public void setCollection(UserCollection collection) {
        this.collection = collection;
    }

    public void setText(String text) {
        this.text = text;
    }
}
