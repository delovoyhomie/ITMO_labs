"""Консольная DSS: фиксированный ввод, два уточнения, запрос в SWI-Prolog."""
import json
import re
import shutil
import subprocess
from pathlib import Path

ALIASES = {
    'rpg': 'role_playing_game', 'рпг': 'role_playing_game',
    'ролевая игра': 'role_playing_game',
    'инди': 'indie', 'инди-игры': 'indie',
    'головоломка': 'puzzle', 'puzzle': 'puzzle',
    'шутер': 'first_person_shooter', 'fps': 'first_person_shooter',
    'стратегия': 'turn_based_strategy', 'пошаговая стратегия': 'turn_based_strategy',
}


def parse_preferences(line):
    """Принимает всю строку; неизвестные слова не пропускаются молча."""
    match = re.fullmatch(r'Мне нравятся:\s*(.+)', line.strip(), re.IGNORECASE)
    if not match:
        raise ValueError('Формат: Мне нравятся: RPG, инди')
    words = [word.strip().casefold() for word in match.group(1).split(',')]
    if any(word not in ALIASES for word in words):
        unknown = ', '.join(repr(w) for w in words if w not in ALIASES)
        raise ValueError('Неизвестное или пустое предпочтение: ' + unknown)
    return sorted({ALIASES[word] for word in words})


def recommend(tags, mode, experience):
    """Валидация API и обращение к настоящему интерпретатору Prolog."""
    if not tags or not all(t in ALIASES.values() for t in tags):
        raise ValueError('Недопустимый набор предпочтений')
    if mode not in ('solo', 'multi', 'any'):
        raise ValueError('Недопустимый режим')
    if experience not in ('beginner', 'any'):
        raise ValueError('Недопустимый уровень опыта')
    swipl = shutil.which('swipl')
    if swipl is None:
        raise RuntimeError('Установите SWI-Prolog и добавьте swipl в PATH.')
    payload = dict(tags=sorted(set(tags)), mode=mode, experience=experience)
    try:
        result = subprocess.run(
            [swipl, '-q', '-s', str(Path(__file__).with_name('bridge.pl'))],
            input=json.dumps(payload), text=True, encoding='utf-8',
            capture_output=True, timeout=15, check=True,
        )
        rows = json.loads(result.stdout)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError('Превышено время ожидания Prolog.') from exc
    except (subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        raise RuntimeError('Не удалось выполнить запрос к базе знаний.') from exc
    return sorted(rows, key=lambda row: (-row['score'], row['game']))


def explanation(row, mode, experience):
    reasons = ['совпали предпочтения: ' + ', '.join(row['matched'])]
    if mode == 'solo':
        reasons.append('есть одиночный режим')
    if mode == 'multi':
        reasons.append('есть многопользовательский режим')
    if experience == 'beginner':
        reasons.append('выполнено правило recommended_for_beginner/1')
    return '; '.join(reasons)


def ask(prompt, choices):
    while True:
        answer = input(prompt).strip().casefold()
        if answer in choices:
            return choices[answer]
        print('Допустимые ответы: ' + ', '.join(choices))


def main():
    print('Подбор видеоигр по учебной базе знаний.')
    print('Предпочтения: RPG, инди, головоломка, шутер, стратегия.')
    print('Введите: Мне нравятся: RPG, инди')
    try:
        while True:
            try:
                tags = parse_preferences(input('> '))
                break
            except ValueError as exc:
                print(exc)
        mode = ask('Режим (один / вместе / любой): ',
                   {'один': 'solo', 'вместе': 'multi', 'любой': 'any'})
        experience = ask('Нужна игра для новичка (да / нет): ',
                         {'да': 'beginner', 'нет': 'any'})
        rows = recommend(tags, mode, experience)
        print('Параметры запроса: ' + json.dumps(dict(tags=tags, mode=mode,
              experience=experience), ensure_ascii=False))
        if not rows:
            print('Совпадений в БЗ нет. Попробуйте другой режим или снимите фильтр новичка.')
        for row in rows:
            print(f"{row['game']} (балл {row['score']}): " + explanation(row, mode, experience))
    except (EOFError, KeyboardInterrupt):
        print('\nДиалог завершён.')
    except RuntimeError as exc:
        print('Ошибка: ' + str(exc))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
