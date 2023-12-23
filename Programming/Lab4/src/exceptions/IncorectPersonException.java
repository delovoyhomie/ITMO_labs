package exceptions;

public class IncorectPersonException extends Exception {
    public final String error;
    public IncorectPersonException () {
        this.error = "incorect person";
    }

    @Override
    public String getMessage () {
        return error;
    }
}
