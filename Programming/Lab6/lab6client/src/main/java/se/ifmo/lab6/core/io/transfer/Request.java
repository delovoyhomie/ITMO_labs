package se.ifmo.lab6.core.io.transfer;

import se.ifmo.lab6.core.collection.UserCollection;

import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

public class Request implements Serializable {
    @Serial
    private static final long serialVersionUID = 777L;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Request request = (Request) o;
        return Objects.equals(command, request.command) && Objects.equals(collection, request.collection) && Objects.equals(text, request.text);
    }

    @Override
    public int hashCode() {
        return Objects.hash(command, collection, text);
    }

    @Override
    public String toString() {
        return "Request{" +
                "command='" + command + '\'' +
                ", collection=" + collection +
                ", text='" + text + '\'' +
                '}';
    }
}
