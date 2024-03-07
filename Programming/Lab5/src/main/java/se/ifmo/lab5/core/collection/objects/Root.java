package se.ifmo.lab5.core.collection.objects;

import se.ifmo.lab5.core.collection.UserCollection;

public class Root {
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
