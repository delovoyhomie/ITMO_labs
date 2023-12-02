package PokMoves;

import ru.ifmo.se.pokemon.*;

public class Scald extends SpecialMove {
    public Scald(){
        super(Type.WATER, 80, 100);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

    @Override
    protected void applyOppEffects(Pokemon pokemon) {
        if (0.3 >= Math.random())
            Effect.burn(pokemon);
    }
}
