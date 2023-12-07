package Characters;

import Base.DoAction;

import java.util.Objects;

public abstract class SomeCharacter {
    protected String Name;
    public SomeCharacter(String name) {
        Name = name;
    }

    public void setName(String dname) {
        Name = dname;
    }

    public String getName() {
        return Name;
    }

    public void doAction(DoAction a, String what){
        String s = a.doSmth();
        boolean is_person_correct = (a.PersonName().toString().toLowerCase().equals(getClass().getSimpleName().toString().toLowerCase())) ? true : false;
        if (is_person_correct)
            System.out.println(this.Name + " " + s + " " + what);
        else
            System.out.println("incorerect person!");
    }

    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SomeCharacter that = (SomeCharacter) o;
        return Objects.equals(Name, that.Name);
    }

    abstract String Gender();


    public String toString() {
        return "SomeCharacter{" +
                "Name='" + Name + '\'' +
                '}';
    }


    public int hashCode() {
        return Objects.hash(Name);
    }
}
