package Characters;

import Base.Astronaut;

public class Moon extends SomeCharacter {
    public Moon(){
        super("Луна");
    }

    @Override
    public String Gender() {
        return "Female";
    }
}
