package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Masquerain extends Pokemon{
    public Masquerain(){
        super("Masquerain", 0);
            setType(Type.BUG, Type.FLYING);
        setStats(70, 60, 62, 100, 82, 80);

        Move[] moves = new Move[]{new Blizzard(), new Scald(), new QuickAttack(), new StunSpore()};
        setMove(moves);
        setLevel(30);
    }
}