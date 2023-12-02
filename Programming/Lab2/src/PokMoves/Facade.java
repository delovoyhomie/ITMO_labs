package PokMoves;

import ru.ifmo.se.pokemon.*;

public class Facade extends PhysicalMove {
    public Facade(){
        super(Type.NORMAL, 70, 100);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

}
