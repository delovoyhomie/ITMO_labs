package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Shiftry extends Pokemon{
    public Shiftry(){
        super("Staraptor", 0);
        setType(Type.GRASS, Type.DARK);
        setStats(90, 100, 60, 90, 60, 80);

        Move[] moves = new Move[]{new Facade(), new Rest(), new Pound(), new DarkPulse()};
        setMove(moves);
        setLevel(35);
    }
}