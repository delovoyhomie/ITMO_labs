package PokMoves;

import ru.ifmo.se.pokemon.StatusMove;
import ru.ifmo.se.pokemon.Type;

public class Rest extends StatusMove {
    public Rest(){
        super(Type.PSYCHIC, 0, 0);
    }
    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }
}
