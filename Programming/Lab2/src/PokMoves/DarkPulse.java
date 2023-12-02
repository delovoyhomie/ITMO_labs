package PokMoves;

import ru.ifmo.se.pokemon.*;

public class DarkPulse extends SpecialMove {
    public DarkPulse(){
        super(Type.DARK, 80, 100);
    }
    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

    @Override
    protected void applyOppEffects(Pokemon pokemon) {
        if (0.2 >= Math.random())
            Effect.flinch(pokemon);
    }
}
