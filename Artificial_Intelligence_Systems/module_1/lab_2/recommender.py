import json
import re
import shutil
import subprocess
from pathlib import Path

# слова пользователя -> атомы из games.pl
ALIASES = {
    'rpg': 'role_playing_game', 'рпг': 'role_playing_game',
    'ролевая игра': 'role_playing_game',
    'инди': 'indie', 'инди-игры': 'indie',
    'головоломка': 'puzzle', 'puzzle': 'puzzle',
    'шутер': 'first_person_shooter', 'fps': 'first_person_shooter',
    'стратегия': 'turn_based_strategy', 'пошаговая стратегия': 'turn_based_strategy',
}


def parse_preferences(line):
    text = line.strip()
    m = re.fullmatch(r'Мне нравятся:\s*(.*)', text, re.IGNORECASE)
    if m:
        text = m.group(1).strip()
    if not text:
        raise ValueError('пустой ввод')
    words = [w.strip().casefold() for w in text.split(',')]
    if any(w not in ALIASES for w in words):
        bad = ', '.join(repr(w) for w in words if w not in ALIASES)
        raise ValueError('не знаю: ' + bad)
    return sorted({ALIASES[w] for w in words})


def recommend(tags, mode, experience):
    if not tags or not all(t in ALIASES.values() for t in tags):
        raise ValueError('плохие tags')
    if mode not in ('solo', 'multi', 'any'):
        raise ValueError('плохой mode')
    if experience not in ('beginner', 'any'):
        raise ValueError('плохой experience')

    swipl = shutil.which('swipl')
    if swipl is None:
        raise RuntimeError('swipl не найден')

    payload = {'tags': sorted(set(tags)), 'mode': mode, 'experience': experience}
    try:
        result = subprocess.run(
            [swipl, '-q', '-s', str(Path(__file__).with_name('bridge.pl'))],
            input=json.dumps(payload),
            text=True,
            encoding='utf-8',
            capture_output=True,
            timeout=15,
            check=True,
        )
        rows = json.loads(result.stdout)
    except subprocess.TimeoutExpired as e:
        raise RuntimeError('prolog завис') from e
    except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
        raise RuntimeError('ошибка prolog') from e

    return sorted(rows, key=lambda r: (-r['score'], r['game']))


def explanation(row, mode, experience):
    parts = ['совпало: ' + ', '.join(row['matched'])]
    if mode == 'solo':
        parts.append('solo')
    if mode == 'multi':
        parts.append('multi')
    if experience == 'beginner':
        parts.append('для новичка')
    return '; '.join(parts)


def ask(prompt, choices):
    while True:
        ans = input(prompt).strip().casefold()
        if ans in choices:
            return choices[ans]
        print('варианты:', ', '.join(choices))


def main():
    print('подбор игр')
    print('можно: RPG, инди, головоломка, шутер, стратегия')
    try:
        while True:
            try:
                tags = parse_preferences(input('предпочтения: '))
                break
            except ValueError as e:
                print(e)

        mode = ask('режим (один/вместе/любой): ',
                   {'один': 'solo', 'вместе': 'multi', 'любой': 'any'})
        experience = ask('для новичка? (да/нет): ',
                         {'да': 'beginner', 'нет': 'any'})

        rows = recommend(tags, mode, experience)
        print(json.dumps({'tags': tags, 'mode': mode, 'experience': experience},
                         ensure_ascii=False))
        if not rows:
            print('ничего не нашлось')
        for row in rows:
            print(f"{row['game']} ({row['score']}): {explanation(row, mode, experience)}")
    except (EOFError, KeyboardInterrupt):
        print()
    except RuntimeError as e:
        print('ошибка:', e)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
