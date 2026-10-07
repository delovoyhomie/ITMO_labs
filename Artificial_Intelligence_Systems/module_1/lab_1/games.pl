

% Game является видеоигрой.
game(the_witcher_3).
game(cyberpunk_2077).
game(portal_2).
game(minecraft).
game(stardew_valley).
game(hades).
game(doom_eternal).
game(civilization_vi).
game(hollow_knight).
game(counter_strike_2).
game(celeste).
game(baldurs_gate_3).

% в игре есть одиночный режим.
single_player(the_witcher_3).
single_player(cyberpunk_2077).
single_player(portal_2).
single_player(minecraft).
single_player(stardew_valley).
single_player(hades).
single_player(doom_eternal).
single_player(civilization_vi).
single_player(hollow_knight).
single_player(celeste).
single_player(baldurs_gate_3).

% в игре есть многопользовательский режим.
multiplayer(portal_2).
multiplayer(minecraft).
multiplayer(stardew_valley).
multiplayer(civilization_vi).
multiplayer(counter_strike_2).
multiplayer(baldurs_gate_3).

%  сюжет играет важную роль.
story_driven(the_witcher_3).
story_driven(cyberpunk_2077).
story_driven(portal_2).
story_driven(hades).
story_driven(hollow_knight).
story_driven(celeste).
story_driven(baldurs_gate_3).

%  игра считается сложной для освоения или прохождения.
difficult(hades).
difficult(doom_eternal).
difficult(civilization_vi).
difficult(hollow_knight).
difficult(celeste).

%  игра создана независимой студией или разработчиком.
indie(stardew_valley).
indie(hades).
indie(hollow_knight).
indie(celeste).

% relaxing(Game) — игра подходит для спокойной игровой сессии.
relaxing(minecraft).
relaxing(stardew_valley).
relaxing(civilization_vi).

% в игре выражена соревновательная составляющая.
competitive(civilization_vi).
competitive(counter_strike_2).

%  базовая версия игры распространяется бесплатно.
free_to_play(counter_strike_2).

% Факты


% игра Game разработана студией Studio.
developed_by(the_witcher_3, cd_projekt_red).
developed_by(cyberpunk_2077, cd_projekt_red).
developed_by(portal_2, valve).
developed_by(minecraft, mojang).
developed_by(stardew_valley, concernedape).
developed_by(hades, supergiant_games).
developed_by(doom_eternal, id_software).
developed_by(civilization_vi, firaxis_games).
developed_by(hollow_knight, team_cherry).
developed_by(counter_strike_2, valve).

% игра Game относится к жанру Genre.
has_genre(the_witcher_3, role_playing_game).
has_genre(cyberpunk_2077, role_playing_game).
has_genre(portal_2, puzzle).
has_genre(doom_eternal, first_person_shooter).
has_genre(civilization_vi, turn_based_strategy).


% Правила


% сюжетная игра, доступная для одиночного прохождения.

solo_story_game(Game) :-
    game(Game),
    single_player(Game),
    story_driven(Game).

% многопользовательская, но не соревновательная

friendly_multiplayer(Game) :-
    game(Game),
    multiplayer(Game),
    \+ competitive(Game).

% сложная ИЛИ соревновательная игра.

intense_game(Game) :-
    game(Game),
    (difficult(Game) ; competitive(Game)).

%  сюжетная игра от независимого разработчика.
indie_gem(Game) :-
    game(Game),
    indie(Game),
    story_driven(Game).

%  связывает игру с указанной студией.
studio_game(Game, Studio) :-
    game(Game),
    developed_by(Game, Studio).

% спокойная игра с одиночным режимом.
relaxing_solo_game(Game) :-
    game(Game),
    relaxing(Game),
    single_player(Game).


recommended_for_beginner(Game) :-
    game(Game),
    single_player(Game),
    \+ difficult(Game),
    \+ competitive(Game).
