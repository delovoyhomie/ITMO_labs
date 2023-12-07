package Characters;

import Base.Astronaut;

public class Neznaika extends SomeCharacter implements Astronaut {
    public Neznaika(){
        super("Незнайка");
    }

    public void fly(){
        System.out.println(this.Name + " Я полетел");
    }
    @Override
    public String Gender() {
        return "Male";
    }
}

