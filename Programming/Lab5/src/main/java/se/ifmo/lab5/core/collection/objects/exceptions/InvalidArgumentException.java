package se.ifmo.lab5.core.collection.objects.exceptions;

public class InvalidArgumentException extends RuntimeException {
    public InvalidArgumentException(String fieldName, String requirements) {
        super(String.format("Ошибка при инициализации поля %s: %s", fieldName, requirements));
    }

    public InvalidArgumentException(String fieldName) {
        super(String.format("Ошибка при инициализации поля %s", fieldName));
    }
}
