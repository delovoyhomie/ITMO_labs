package se.ifmo.lab6.core.io.transfer;

import se.ifmo.lab6.core.collection.objects.Vehicle;

import java.io.Serial;
import java.io.Serializable;
import java.util.*;

public class Response implements Serializable {
    @Serial
    private static final long serialVersionUID = 777L;

    private final String message;
    private final List<Vehicle> vehicles;

    private final Deque<String> inboundRequests = new ArrayDeque<>();

    private HashMap<String, Integer> commands;

    public Response(String message, List<Vehicle> vehicles) {
        this.message = message;
        this.vehicles = vehicles;
    }

    public HashMap<String, Integer> getCommands() {
        return commands;
    }

    public void setCommands(HashMap<String, Integer> commands) {
        this.commands = commands;
    }

    public Response(String message) {
        this(message, null);
    }

    public void addInboundRequest(String request) {
        inboundRequests.add(request);
    }

    public void addInboundRequests(Deque<String> requests) {
        inboundRequests.addAll(requests);
    }

    public Deque<String> getInboundRequests() {
        return inboundRequests;
    }

    public String getMessage() {
        return message;
    }

    public List<Vehicle> getVehicles() {
        return vehicles;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Response response = (Response) o;
        return Objects.equals(message, response.message) && Objects.equals(vehicles, response.vehicles) && Objects.equals(inboundRequests, response.inboundRequests) && Objects.equals(commands, response.commands);
    }

    @Override
    public int hashCode() {
        return Objects.hash(message, vehicles, inboundRequests, commands);
    }

    @Override
    public String toString() {
        return "Response{" +
                "message='" + message + '\'' +
                ", vehicles=" + vehicles +
                ", inboundRequests=" + inboundRequests +
                ", commands=" + commands +
                '}';
    }
}
