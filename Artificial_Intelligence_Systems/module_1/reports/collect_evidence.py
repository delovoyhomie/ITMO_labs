"""Записывает фактические ответы SWI-Prolog и DSS для воспроизводимого отчёта."""
import json
from pathlib import Path
import subprocess
import sys
import textwrap

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / 'lab_2'))
from recommender import parse_preferences, recommend

QUERIES = [
    'game(minecraft)',
    'developed_by(portal_2,valve)',
    'findall(G,developed_by(G,valve),L)',
    'findall(G,(single_player(G),story_driven(G)),L)',
    'findall(G,(game(G),(relaxing(G);free_to_play(G)),\\+ competitive(G)),L)',
    'findall(G,friendly_multiplayer(G),L)',
    'setof(G,intense_game(G),L)',
    'findall(G,indie_gem(G),L)',
    'findall(G,recommended_for_beginner(G),L)',
    'findall(G,relaxing_solo_game(G),L)',
]


def main():
    evidence = {'queries': [], 'scenarios': []}
    tex = []
    for i, query in enumerate(QUERIES, 1):
        answer = 'L' if i > 2 else 'true'
        goal = f'({query}->writeln({answer});writeln(false)),halt'
        actual = subprocess.check_output(['swipl','-q','-s',str(ROOT.parent/'lab_1/games.pl'),'-g',goal], text=True).strip()
        evidence['queries'].append(dict(query=query, answer=actual))
        # Только фактический stdout; переносы не меняют токены.
        wrapped = actual.replace(',', ', ')
        tex.append('\\noindent\\begin{minipage}{\\linewidth}\n\\textbf{Запрос ' + str(i) + '}\n\\begin{lstlisting}\n?- ' + query + '.\n' + '\n'.join(textwrap.wrap(wrapped, 70, break_long_words=False, break_on_hyphens=False)) + '\n\\end{lstlisting}\n\\end{minipage}\\par\\smallskip\n')
    scenarios = [('RPG','solo','beginner'),('инди','multi','beginner'),
                 ('головоломка','multi','any'),('шутер','solo','any'),
                 ('стратегия','any','any'),('RPG','multi','any'),
                 ('шутер','solo','beginner'),('RPG, инди','solo','beginner')]
    for prefs, mode, experience in scenarios:
        line = 'Мне нравятся: ' + prefs
        tags = parse_preferences(line)
        evidence['scenarios'].append(dict(input=line,tags=tags,mode=mode,
                                         experience=experience,results=recommend(tags,mode,experience)))
    (ROOT/'evidence.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'query-results.tex').write_text('\n'.join(tex))
    print('10 Prolog queries and 8 DSS scenarios recorded.')


if __name__ == '__main__':
    main()
