package Characters;

import Base.DoAction;
import exceptions.EmptyActionException;
import exceptions.IncorectPersonException;
import java.util.Objects;

public abstract class SomeCharacter {
    protected String name;
    public SomeCharacter(String name) {
        this.name = name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void doAction(DoAction a, String what) throws IncorectPersonException, EmptyActionException
    {
        if (what != null) {
            String s = a.doSmth();
            boolean is_person_correct = (a.PersonName().toString().toLowerCase().equals(getClass().getSimpleName().toString().toLowerCase())) ? true : false;
            if (is_person_correct)
                System.out.println(this.name + " " + s + " " + what);
            else
                throw new IncorectPersonException();
        }
        else throw new EmptyActionException();
    }

//    public void doAction(DoAction a) throws IncorectPersonException {
//        try {
//            doAction(a, "");
//        }
//        catch (IncorectPersonException e) {
//
//        }
//    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SomeCharacter that = (SomeCharacter) o;
        return Objects.equals(name, that.name);
    }

    protected abstract String Gender();


    public String toString() {
        return "SomeCharacter{" +
                "Name='" + name + '\'' +
                '}';
    }


    public int hashCode() {
        return Objects.hash(name);
    }
}
