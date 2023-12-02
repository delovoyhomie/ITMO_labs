package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Nuzleaf extends Pokemon{
    public Nuzleaf(){
        super("Nuzleaf", 0);
        setType(Type.GRASS, Type.DARK);
        setStats(70, 70, 40, 60, 40, 60);

        Move[] moves = new Move[]{new Facade(), new Rest(), new Pound()};
        setMove(moves);
        setLevel(35);
    }
}