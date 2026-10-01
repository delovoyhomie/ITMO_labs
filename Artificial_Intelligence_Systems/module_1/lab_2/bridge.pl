% Запросы DSS используют факты и правила первой лабораторной.
:- consult('../lab_1/games.pl').
:- use_module(library(http/json)).

% Жанры хранятся в has_genre/2; indie — отдельный признак, а не жанр.
matches(G, indie) :- indie(G).
matches(G, Tag) :- has_genre(G, Tag).

mode_fits(_, any).
mode_fits(G, solo) :- single_player(G).
mode_fits(G, multi) :- multiplayer(G).

experience_fits(_, any).
experience_fits(G, beginner) :- recommended_for_beginner(G).

% Score — число совпавших предпочтений, все фильтры обязательны.
candidate(Tags, Mode, Experience, G, Score, Matched) :-
    game(G), mode_fits(G, Mode), experience_fits(G, Experience),
    findall(T, (member(T, Tags), matches(G, T)), Raw),
    sort(Raw, Matched), length(Matched, Score), Score > 0.

% JSON передаёт только данные. Пользовательская строка не выполняется как Prolog.
main :-
    json_read_dict(current_input, Input),
    maplist(atom_string, Tags, Input.tags),
    atom_string(Mode, Input.mode), atom_string(Experience, Input.experience),
    findall(_{game:G, score:S, matched:M},
            candidate(Tags, Mode, Experience, G, S, M), Results),
    json_write_dict(current_output, Results), nl.

:- initialization(main, main).
