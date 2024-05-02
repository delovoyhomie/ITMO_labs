package se.ifmo.lab6.core.collection.objects;

import se.ifmo.lab6.core.collection.UserCollection;

import java.io.Serializable;

public class Root implements Serializable {
    private UserCollection vehicles;

    public UserCollection getVehicles() {
        return vehicles;
    }

    public void setVehicles(UserCollection vehicles) {
        this.vehicles = vehicles;
    }

    public Root(UserCollection vehicles) {
        this.vehicles = vehicles;
    }
}
