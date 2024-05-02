package se.ifmo.lab6.core.collection.objects.exceptions;

public class NullableFieldException extends RuntimeException {
    public NullableFieldException(String fieldName) {
        super(String.format("Ошибка при инициализации поля %s: поле не может быть null", fieldName));
    }
}
