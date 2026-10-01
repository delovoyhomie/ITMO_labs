# Модуль 1 — Базы знаний и онтологии

Нумерация соответствует выданному заданию «Системы ИИ.docx»:
ЛР1 = Prolog + OWL/Protégé, ЛР2 = диалоговая DSS.
В учебном пособии 3308.pdf эти этапы имеют номера 1, 2 и 3.

- `lab_1/` — 51 унарный факт, 15 бинарных, 7 правил, запросы и тесты.
- `lab_1/part_2_ontology/` — TTL/OWL, HermiT/SWRL-проверки, запросы.
- `lab_2/` — консольный диалог Python + SWI-Prolog.
- `reports/` — два отчёта по лабораторным и расширенный отчёт модуля,
  исходники LaTeX, шрифты с лицензией и результаты запусков.
- `AUDIT.md` — замечания аудита и исправления.

```sh
swipl -q -s lab_1/run_examples.pl
swipl -q -s lab_1/test_games.pl -g run_tests -t halt
python3 lab_2/recommender.py
python3 -m unittest discover -s lab_2 -v
```

Для OWL-проверок установите зависимости `requirements-checks.txt`, Java и
выполните `python3 lab_1/part_2_ontology/verify_ontology.py`.
OWL можно открыть в Protégé → File → Open, затем Reasoner → HermiT → Start reasoner.

Отчёты собираются из `reports/` командой `tectonic lab1-report.tex`, аналогично
`lab2-report.tex` и `module1-report.tex`. Стиль заимствован из Numerical-methods/Lab6.
Перед сборкой после изменения кода выполните `python3 reports/collect_evidence.py`.
