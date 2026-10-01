# Часть 2. Онтология видеоигр в Protégé

Файл `games_ontology.owl` переводит базу знаний из `games.pl` в
OWL-онтологию формата RDF/XML. Он открывается и редактируется в Protégé без
дополнительного импорта. Файл `games_ontology.ttl` содержит ту же онтологию в
более компактном и удобном для чтения формате Turtle.

В онтологии 21 именованный класс, 3 объектных свойства, 1 свойство данных,
24 именованных индивида, 7 аксиом эквивалентности и одно правило SWRL.
Файлы OWL и TTL — две сериализации; автоматической синхронизации в Protégé нет.
После изменения TTL скрипт проверки пересобирает OWL. Изменения через Protégé
нужно отдельно сохранить в Turtle, прежде чем запускать этот скрипт.

## Соответствие Prolog и OWL

| Prolog | Представление в онтологии |
|---|---|
| `game(Game)` | индивид класса `VideoGame` |
| `single_player(Game)` | класс `SinglePlayerGame` |
| `multiplayer(Game)` | класс `MultiplayerGame` |
| `story_driven(Game)` | класс `StoryDrivenGame` |
| `difficult(Game)` | класс `DifficultGame` |
| `indie(Game)` | класс `IndieGame` |
| `relaxing(Game)` | класс `RelaxingGame` |
| `competitive(Game)` | класс `CompetitiveGame` |
| `free_to_play(Game)` | класс `FreeToPlayGame` |
| `developed_by(Game, Studio)` | объектное свойство `developedBy` |
| `has_genre(Game, Genre)` | объектное свойство `hasGenre` |

Семь правил Prolog сопоставлены выводимым классам с условиями
`Equivalent To`: `SoloStoryGame`, `FriendlyMultiplayerGame`, `IntenseGame`,
`IndieGem`, `StudioGame`, `RelaxingSoloGame` и `BeginnerRecommendedGame`.
`StudioGame` представляет только проекцию `studio_game(Game, Studio)` на игру:
для получения самой студии нужно запросить `developedBy`. Это не полный
эквивалент двухаргументного отношения. Минимальная кардинальность в OWL
допускает существование неназванного разработчика.

## Почему добавлены отрицательные классы

Prolog использует отрицание как неудачу: если факт не найден, условие `\+`
считается выполненным. OWL работает в предположении открытого мира: отсутствие
факта не доказывает его отрицание. Поэтому в онтологии явно введены классы
`NonCompetitiveGame` и `NonDifficultGame`. Они объявлены несовместимыми с
`CompetitiveGame` и `DifficultGame` соответственно.
Это явно зафиксированное дополнение к конечному набору игр, а не автоматическое
правило «не найдено — ложно». При расширении БЗ эти утверждения нужно пересмотреть.

## Дополнения после аудита

`title` имеет domain VideoGame, range xsd:string и ровно одно значение на игру.
`StudioGame` имеет минимум одного разработчика; SoloStoryGame — подкласс
SinglePlayerGame (иерархия VideoGame → SinglePlayerGame → SoloStoryGame).
SWRL `SinglePlayerGame(?g) ^ StoryDrivenGame(?g) -> RuleVerifiedStoryGame(?g)`
проверяется отдельно от Equivalent To; ожидаются семь игр.

Из `module_1`:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements-checks.txt
.venv/bin/python lab_1/part_2_ontology/verify_ontology.py
```

Нужны Java в PATH и SWI-Prolog. При необходимости задайте `JAVA_EXE` полным
путём к Java (на macOS с Protégé: `/Applications/Protégé.app/Contents/jre/bin/java`).
Проверяется эквивалентность сериализаций, консистентность HermiT, семь наборов
выведенных типов, инверсия, наследование и SPARQL. Три негативных опыта
нарушают disjoint, тип данных и кардинальность в памяти и должны дать
противоречие. Фактические результаты: `verification.json`.

## Проверка в Protégé

1. Открыть `games_ontology.owl` через **File → Open**.
2. Выбрать **Reasoner → HermiT → Start reasoner**.
3. Убедиться, что в нижней строке состояния нет сообщения о противоречиях.
4. Открыть **Window → Tabs → DL Query**.
5. Выполнить запросы из файла `dl_queries.txt`.

Для визуализации открыть **Window → Tabs → OntoGraf**, выбрать класс
`VideoGame` и раскрыть связанные узлы.

## Ожидаемые выводы reasoner-а

- `FriendlyMultiplayerGame`: Portal 2, Minecraft, Stardew Valley,
  Baldur's Gate 3;
- `IntenseGame`: Hades, Doom Eternal, Civilization VI, Hollow Knight,
  Counter-Strike 2, Celeste;
- `IndieGem`: Hades, Hollow Knight, Celeste;
- `BeginnerRecommendedGame`: The Witcher 3, Cyberpunk 2077, Portal 2,
  Minecraft, Stardew Valley, Baldur's Gate 3.
