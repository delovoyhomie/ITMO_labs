package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Surskit extends Pokemon{
    public Surskit(){
        super("Surskit", 0);
        setType(Type.BUG, Type.WATER);
        setStats(40, 30, 32, 50, 52, 65);

        Move[] moves = new Move[]{new Blizzard(), new Scald(), new QuickAttack()};
        setMove(moves);
        setLevel(30);
    }
}