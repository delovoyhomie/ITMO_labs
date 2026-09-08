import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { VARIANT19, FUNCTIONS, generatePoints, solve } from './interpolation.js';
import { parseDataset, formatSolution } from './io.js';
import { parseNumber } from './utils.js';
import { createGraphSvg } from './plotting-core.js';

const HELP = `ЛР №5, вариант 19. Node.js 20+.
Без аргументов: интерактивный ввод.
  --variant19                  Таблица 1.4, X1=1.573, X2=1.375
  --input FILE                 JSON или текстовая таблица
  --function sin|exp|cubic      Табулирование функции
  --a NUMBER --b NUMBER --count INTEGER
  --x NUMBER                   Аргумент; без него запрашивается с клавиатуры
  --output FILE                Сохранить текст результатов
  --graph FILE.svg             Сохранить график для первого аргумента
  --help                       Справка
Пример: npm start -- --input examples/variant19.json --x 1.375`;

function options(args) {
  const flags = {};
  const unary = new Set(['--variant19', '--help']);
  const valued = new Set(['--input', '--function', '--a', '--b', '--count', '--x', '--output', '--graph']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg in flags) throw new Error(`Повторный параметр ${arg}.`);
    if (unary.has(arg)) flags[arg] = true;
    else if (valued.has(arg)) {
      if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`Нет значения ${arg}.`);
      flags[arg] = args[++i];
    } else throw new Error(`Неизвестный параметр ${arg}. Используйте --help.`);
  }
  if (['--variant19', '--input', '--function'].filter(k => flags[k]).length > 1) throw new Error('Выберите один источник данных.');
  return flags;
}

async function main() {
  const flags = options(process.argv.slice(2));
  if (flags['--help']) { console.log(HELP); return; }
  let rl, iterator;
  async function ask(prompt) {
    if (!rl) {
      rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
      iterator = rl[Symbol.asyncIterator]();
    }
    process.stdout.write(prompt);
    const next = await iterator.next();
    if (next.done) throw new Error('Ввод завершён. Укажите недостающие параметры или повторите ввод.');
    return next.value;
  }
  try {
    let dataset;
    if (flags['--variant19']) dataset = VARIANT19;
    else if (flags['--input']) dataset = parseDataset(await fs.readFile(flags['--input'], 'utf8'));
    else if (flags['--function']) {
      const a = flags['--a'] ?? await ask('Начало интервала a: ');
      const b = flags['--b'] ?? await ask('Конец интервала b: ');
      const count = flags['--count'] ?? await ask('Количество точек: ');
      dataset = { points: generatePoints(flags['--function'], a, b, count), functionId: flags['--function'], targets: [] };
    } else {
      console.log('ЛР №5. Вариант 19.\n1 — клавиатура; 2 — файл; 3 — функция; 4 — вариант 19');
      const mode = (await ask('Источник данных: ')).trim();
      if (mode === '1') {
        const count = parseNumber(await ask('Количество точек (2–50): '));
        if (!Number.isInteger(count) || count < 2 || count > 50) throw new Error('Нужно целое число от 2 до 50.');
        const rows = [];
        for (let i = 0; i < count; i++) rows.push(await ask(`Точка ${i + 1} (x y): `));
        dataset = parseDataset(rows.join('\n'));
      } else if (mode === '2') dataset = parseDataset(await fs.readFile(await ask('Путь к файлу: '), 'utf8'));
      else if (mode === '3') {
        console.log(FUNCTIONS.map(f => `${f.id}: ${f.label}`).join('\n'));
        const id = (await ask('Функция: ')).trim();
        const a = await ask('Начало интервала a: '), b = await ask('Конец интервала b: '), count = await ask('Количество точек: ');
        dataset = { points: generatePoints(id, a, b, count), functionId: id, targets: [] };
      } else if (mode === '4') dataset = VARIANT19;
      else throw new Error('Неизвестный режим.');
    }
    let targets = flags['--x'] === undefined ? dataset.targets : [parseNumber(flags['--x'])];
    if (!targets?.length) targets = [parseNumber(await ask('Аргумент интерполяции x: '))];
    const solutions = targets.map(x => solve(dataset.points, x, dataset.functionId));
    const result = solutions.map(formatSolution).join('\n\n' + '='.repeat(72) + '\n\n') + '\n';
    console.log(result);
    for (const [file, content] of [[flags['--output'], result], [flags['--graph'], createGraphSvg(solutions[0])]]) {
      if (!file) continue;
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, content);
    }
  } finally { rl?.close(); }
}

main().catch(error => { console.error(`Ошибка: ${error.message}`); process.exitCode = 1; });
