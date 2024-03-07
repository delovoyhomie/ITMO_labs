package se.ifmo.lab5.core.io.transfer;

import se.ifmo.lab5.core.collection.objects.Vehicle;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

public class Response {
    private final String message;
    private final List<Vehicle> vehicles;

    private final Deque<String> inboundRequests = new ArrayDeque<>();

    public Response(String message, List<Vehicle> vehicles) {
        this.message = message;
        this.vehicles = vehicles;
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
}
