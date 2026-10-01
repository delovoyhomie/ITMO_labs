% Демонстрационный сценарий с запросами к базе знаний.
% Запуск: swipl -q -s run_examples.pl

:- consult('games.pl').
:- initialization(main, main).

main :-
    % 1. Простой запрос конкретного факта.
    (game(minecraft) -> writeln('1. Minecraft is a game: true')
                     ;  writeln('1. Minecraft is a game: false')),

    % 2. Запрос с переменной к фактам с двумя аргументами.
    findall(Game, developed_by(Game, valve), ValveGames),
    format('2. Games developed by Valve: ~w~n', [ValveGames]),

    % 3. Сложный запрос с логическим И.
    findall(Game,
            (single_player(Game), story_driven(Game)),
            StoryGames),
    format('3. Story-driven single-player games: ~w~n', [StoryGames]),

    % 4. Сложный запрос с логическим И, ИЛИ и отрицанием.
    findall(Game,
            (game(Game),
             (relaxing(Game) ; free_to_play(Game)),
             \+ competitive(Game)),
            CalmGames),
    format('4. Relaxing or free, but not competitive: ~w~n', [CalmGames]),

    % 5. Запрос, который требует применения правила.
    findall(Game, friendly_multiplayer(Game), FriendlyGames),
    format('5. Friendly multiplayer games: ~w~n', [FriendlyGames]).
