# Примеры запросов

Перед выполнением запросов необходимо загрузить базу знаний командой
`[games].` в интерактивной среде SWI-Prolog.

## 1. Простой запрос факта

Проверить, является ли `minecraft` игрой:

```prolog
?- game(minecraft).
true.
```

## 2. Простой запрос к отношению

Проверить разработчика игры `portal_2`:

```prolog
?- developed_by(portal_2, valve).
true.
```

## 3. Запрос с переменной

Найти все игры, разработанные Valve:

```prolog
?- developed_by(Game, valve).
Game = portal_2 ;
Game = counter_strike_2.
```

## 4. Запрос с логическим И

Найти игры, которые одновременно поддерживают одиночный режим и имеют
важный сюжет:

```prolog
?- single_player(Game), story_driven(Game).
Game = the_witcher_3 ;
Game = cyberpunk_2077 ;
Game = portal_2 ;
Game = hades ;
Game = hollow_knight ;
Game = celeste ;
Game = baldurs_gate_3.
```

## 5. Запрос с И, ИЛИ и НЕ

Найти спокойные или бесплатные игры, исключив соревновательные:

```prolog
?- game(Game), (relaxing(Game) ; free_to_play(Game)), \+ competitive(Game).
Game = minecraft ;
Game = stardew_valley.
```

Здесь `,` — логическое И, `;` — логическое ИЛИ, `\+` — отрицание.

## 6. Запрос к правилу с отрицанием

Найти многопользовательские игры без соревновательной составляющей:

```prolog
?- friendly_multiplayer(Game).
Game = portal_2 ;
Game = minecraft ;
Game = stardew_valley ;
Game = baldurs_gate_3.
```

## 7. Запрос к правилу с логическим ИЛИ

Получить уникальный список сложных или соревновательных игр:

```prolog
?- setof(Game, intense_game(Game), Games).
Games = [celeste, civilization_vi, counter_strike_2, doom_eternal, hades, hollow_knight].
```

`setof/3` собирает решения и удаляет повторение `civilization_vi`, которое
подходит сразу по двум условиям правила.

## 8. Запрос к правилу из нескольких условий

Найти сюжетные игры независимых разработчиков:

```prolog
?- indie_gem(Game).
Game = hades ;
Game = hollow_knight ;
Game = celeste.
```

## 9. Запрос к правилу с двумя отрицаниями

Найти одиночные игры, которые не отмечены как сложные или соревновательные:

```prolog
?- recommended_for_beginner(Game).
Game = the_witcher_3 ;
Game = cyberpunk_2077 ;
Game = portal_2 ;
Game = minecraft ;
Game = stardew_valley ;
Game = baldurs_gate_3.
```

## 10. Запрос с двумя переменными

Найти все известные пары «игра — студия» с помощью правила:

```prolog
?- studio_game(Game, Studio).
Game = the_witcher_3, Studio = cd_projekt_red ;
Game = cyberpunk_2077, Studio = cd_projekt_red ;
Game = portal_2, Studio = valve ;
Game = minecraft, Studio = mojang ;
Game = stardew_valley, Studio = concernedape ;
Game = hades, Studio = supergiant_games ;
Game = doom_eternal, Studio = id_software ;
Game = civilization_vi, Studio = firaxis_games ;
Game = hollow_knight, Studio = team_cherry ;
Game = counter_strike_2, Studio = valve.
```
