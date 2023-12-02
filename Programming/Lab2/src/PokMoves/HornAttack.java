package PokMoves;

import ru.ifmo.se.pokemon.*;

public class HornAttack extends PhysicalMove {
    public HornAttack(){
        super(Type.NORMAL, 65, 100);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

}
