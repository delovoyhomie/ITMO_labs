package PokMoves;

import ru.ifmo.se.pokemon.*;

public class Thunder extends SpecialMove {
    public Thunder(){
        super(Type.ELECTRIC, 110, 70);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

    @Override
    protected void applyOppEffects(Pokemon pokemon) {
        if (0.3 >= Math.random())
            Effect.paralyze(pokemon);
    }
}
