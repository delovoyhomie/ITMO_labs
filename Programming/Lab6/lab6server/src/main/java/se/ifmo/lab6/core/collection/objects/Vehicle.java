package se.ifmo.lab6.core.collection.objects;

import se.ifmo.lab6.core.collection.IdGenerator;
import se.ifmo.lab6.core.collection.objects.exceptions.InvalidArgumentException;
import se.ifmo.lab6.core.collection.objects.exceptions.NullableFieldException;

import java.io.Serializable;
import java.time.ZonedDateTime;
import java.util.Objects;

/**
 * Class for describing vehicle
 */
public class Vehicle implements Comparable<Vehicle>, Validatable, Serializable {
    /**
     * Значение поля должно быть больше 0
     * Значение этого поля должно быть уникальным
     * Значение этого поля должно генерироваться автоматически
     */
    private Long id = IdGenerator.getInstance().generateId();

    /**
     * set id of the vehicle with validation
     * @param id - id of the vehicle
     * @throws InvalidArgumentException when argument invalid (less or equals 0)
     */
    public void setId(long id) {
        if (id <= 0) throw new InvalidArgumentException("id", "значение поля должно быть больше 0");

        this.id = id;
    }

    /**
     * get id of the vehicle
     * @return id of the vehicle
     */
    public long getId() {
        return id;
    }

    /**
     * Поле не может быть null
     * Строка не может быть пустой
     */
    private String name;

    /**
     * set name of the vehicle with validation
     * @param name - name of the vehicle
     */
    public void setName(String name) {
        if (name == null) throw new NullableFieldException("name");
        if (name.isBlank()) throw new InvalidArgumentException("name", "строка не может быть пустой");

        this.name = name;
    }

    /**
     * get name of the vehicle
     * @return name of the vehicle
     */
    public String getName() {
        return name;
    }

    /**
     * Поле не может быть null
     */
    private Coordinates coordinates;

    /**
     * set coordinates of the vehicle with validation
     * @param coordinates - coordinates of the vehicle
     * @throws InvalidArgumentException when argument invalid (null)
     */
    public void setCoordinates(Coordinates coordinates) {
        if (coordinates == null) throw new NullableFieldException("coordinates");

        this.coordinates = coordinates;
    }

    /**
     * get coordinates of the vehicle
     * @return coordinates of the vehicle
     */
    public Coordinates getCoordinates() {
        return coordinates;
    }

    /**
     * Поле не может быть null
     * Значение этого поля должно генерироваться автоматически
     */
    private ZonedDateTime creationDate = ZonedDateTime.now();

    /**
     * set creation date of the vehicle with validation
     * @param creationDate - creation date of the vehicle
     * @throws InvalidArgumentException when argument invalid (null)
     */
    public void setCreationDate(ZonedDateTime creationDate) {
        if (creationDate == null) throw new NullableFieldException("creationDate");

        this.creationDate = creationDate;
    }

    /**
     * get creation date of the vehicle
     * @return creation date of the vehicle
     */
    public ZonedDateTime getCreationDate() {
        return creationDate;
    }

    /**
     * Значение поля должно быть больше 0
     */
    private int enginePower;

    /**
     * set engine power of the vehicle with validation
     * @param enginePower - engine power of the vehicle
     * @throws InvalidArgumentException when argument invalid (less or equals 0)
     */
    public void setEnginePower(int enginePower) {
        if (enginePower <= 0) throw new InvalidArgumentException("enginePower", "значение поля должно быть больше 0");

        this.enginePower = enginePower;
    }

    /**
     * get engine power of the vehicle
     * @return engine power of the vehicle
     */
    public int getEnginePower() {
        return enginePower;
    }

    /**
     * Значение поля должно быть больше 0
     */
    private float capacity;

    /**
     * set capacity of the vehicle with validation
     * @param capacity - capacity of the vehicle
     * @throws InvalidArgumentException when argument invalid (less or equals 0)
     */
    public void setCapacity(float capacity) {
        if (capacity <= 0) throw new InvalidArgumentException("capacity", "значение поля должно быть больше 0");

        this.capacity = capacity;
    }

    /**
     * get capacity of the vehicle
     * @return capacity of the vehicle
     */
    public float getCapacity() {
        return capacity;
    }

    /**
     * Поле не может быть null
     */
    private VehicleType type;

    /**
     * set type of the vehicle with validation
     * @param type - type of the vehicle
     * @throws InvalidArgumentException when argument invalid (null)
     */
    public void setType(VehicleType type) {
        if (type == null) throw new NullableFieldException("type");

        this.type = type;
    }

    /**
     * get type of the vehicle
     * @return type of the vehicle
     */
    public VehicleType getType() {
        return type;
    }

    /**
     * Поле может быть null
     */
    private FuelType fuelType;

    /**
     * set fuel type of the vehicle with validation
     * @param fuelType - fuel type of the vehicle
     */
    public void setFuelType(FuelType fuelType) {
        this.fuelType = fuelType;
    }

    /**
     * get fuel type of the vehicle
     * @return fuel type of the vehicle
     */
    public FuelType getFuelType() {
        return fuelType;
    }

    @Override
    public int compareTo(Vehicle o) {
        return Integer.compare(this.enginePower, o.enginePower);
    }

    @Override
    public String toString() {
        return "# Транспортное средство '" + name + "' ID{" + id + "}: \n" +
                " > координаты: " + coordinates + '\n' +
                " > дата создания: " + creationDate + '\n' +
                " > мощность: " + enginePower + '\n' +
                " > объем: " + capacity + '\n' +
                " > тип: " + type + '\n' +
                " > тип топлива: " + fuelType + "\n";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Vehicle vehicle = (Vehicle) o;
        return enginePower == vehicle.enginePower && Float.compare(capacity, vehicle.capacity) == 0 && Objects.equals(name, vehicle.name) && Objects.equals(coordinates, vehicle.coordinates) && Objects.equals(creationDate, vehicle.creationDate) && type == vehicle.type && fuelType == vehicle.fuelType;
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, coordinates, creationDate, enginePower, capacity, type, fuelType);
    }

    @Override
    public void validate() {
        if (id <= 0) throw new InvalidArgumentException("id", "значение поля должно быть больше 0");

        if (name == null) throw new NullableFieldException("name");
        if (name.isBlank()) throw new InvalidArgumentException("name", "строка не может быть пустой");

        if (coordinates == null) throw new NullableFieldException("coordinates");
        coordinates.validate();

        if (creationDate == null) throw new NullableFieldException("creationDate");

        if (enginePower <= 0) throw new InvalidArgumentException("enginePower", "значение поля должно быть больше 0");

        if (capacity <= 0) throw new InvalidArgumentException("capacity", "значение поля должно быть больше 0");

        if (type == null) throw new NullableFieldException("type");
    }
}
