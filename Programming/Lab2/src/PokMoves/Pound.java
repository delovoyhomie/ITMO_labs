package PokMoves;

import ru.ifmo.se.pokemon.PhysicalMove;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.SpecialMove;
import ru.ifmo.se.pokemon.Type;

public class Pound extends PhysicalMove {
    public Pound(){
        super(Type.NORMAL, 40, 100);
    }

    @Override
    protected String describe(){
        return "does " + getClass().getSimpleName();
    }

}