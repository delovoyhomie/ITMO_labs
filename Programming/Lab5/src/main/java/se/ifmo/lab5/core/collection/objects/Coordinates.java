package se.ifmo.lab5.core.collection.objects;

import se.ifmo.lab5.core.collection.objects.exceptions.NullableFieldException;

import java.util.Objects;

/**
 * Class for describing coordinates
 */
public class Coordinates implements Validatable {
    /**
     * no requirements
     */
    private long x;

    /**
     * set x of the coordinates with validation
     * @param x - x of the coordinates
     */
    public void setX(long x) {
        this.x = x;
    }

    /**
     * get x of the coordinates
     * @return x of the coordinates
     */
    public long getX() {
        return x;
    }

    /**
     * Поле не может быть null
     */
    private Integer y;

    /**
     * set y of the coordinates with validation
     * @param y - y of the coordinates
     * @throws NullableFieldException when y is null
     */
    public void setY(Integer y) {
        if (y == null) throw new NullableFieldException("y");

        this.y = y;
    }

    /**
     * get y of the coordinates
     * @return y of the coordinates
     */
    public Integer getY() {
        return y;
    }

    @Override
    public String toString() {
        return "x: " + x +
                ", y: " + y;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Coordinates that = (Coordinates) o;
        return x == that.x && Objects.equals(y, that.y);
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }

    @Override
    public void validate() {
        if (y == null) throw new NullableFieldException("y");
    }
}
