package exceptions;
// this is checked error
public class EmptyActionException extends RuntimeException{
    private final String error;
    public EmptyActionException (){
        this.error = "Incorrect structure do doAction method, use \"\" except null";
    }
    @Override
    public String getMessage() {
        return error;
    }
}