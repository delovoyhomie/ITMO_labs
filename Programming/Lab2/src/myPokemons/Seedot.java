package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Seedot extends Pokemon{
    public Seedot(){
        super("Seedot", 0);
        setType(Type.GRASS);
        setStats(40, 40, 50, 30, 30, 30);

        Move[] moves = new Move[]{new Facade(), new Rest()};
        setMove(moves);
        setLevel(20);
    }
}