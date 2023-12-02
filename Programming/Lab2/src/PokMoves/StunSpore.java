package PokMoves;

import ru.ifmo.se.pokemon.Effect;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.StatusMove;
import ru.ifmo.se.pokemon.Type;

public class StunSpore extends StatusMove {
    public StunSpore(){
        super(Type.GRASS, 0, 75);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

    @Override
    protected void applyOppEffects(Pokemon pokemon) {
        Effect.paralyze(pokemon);
    }
}
