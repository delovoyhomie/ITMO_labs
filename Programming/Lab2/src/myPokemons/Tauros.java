package myPokemons;

import PokMoves.*;
import ru.ifmo.se.pokemon.Move;
import ru.ifmo.se.pokemon.Pokemon;
import ru.ifmo.se.pokemon.Type;

public class Tauros extends Pokemon{
    public Tauros(){
        super("Tauros", 0);
        setType(Type.NORMAL);
        setStats(75, 100, 95, 40, 70, 110);

        Move[] moves = new Move[]{new HornAttack(), new RockSlide(), new Rest(), new Thunder()};
        setMove(moves);
        setLevel(10);
    }
}