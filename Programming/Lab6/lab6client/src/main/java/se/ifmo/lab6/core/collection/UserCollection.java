package se.ifmo.lab6.core.collection;

import se.ifmo.lab6.core.collection.objects.Vehicle;

import java.util.Date;
import java.util.LinkedHashMap;

public class UserCollection extends LinkedHashMap<Long, Vehicle> {
    private final Date initializedDate = new Date();

    public Date getInitializedDate() {
        return initializedDate;
    }

    @Override
    public Vehicle put(Long key, Vehicle value) {
        if (key < 0) {
            System.out.println("невозможно добавить элемент, id должен быть > 0");
            return null;
        }

        value.setId(key);
        return super.put(key, value);
    }

    public String getName() {
        return super.getClass().getSimpleName();
    }
}
