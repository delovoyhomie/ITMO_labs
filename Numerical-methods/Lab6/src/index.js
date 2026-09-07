import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { EQUATIONS, solve } from './ode.js';
import { parseProblem, formatSolution, equationChoices } from './io.js';
import { parseNumber } from './utils.js';
import { createGraphSvg, createErrorSvg } from './plotting-core.js';

export const DEMO = { equation: 'bernoulli', x0: 1, y0: -1, xn: 1.5, h: 0.1, epsilon: 1e-6 };

const HELP = `ЛР №6, вариант 19 (методы 1, 3, 4). Node.js 20+.
Без аргументов: интерактивный ввод с клавиатуры.
  --demo                       Пример 1 из лекции: y' = y + (1+x)y², y(1) = −1, [1; 1.5], h = 0.1
  --input FILE                 JSON или текстовый файл с описанием задачи
  --equation ID                ${EQUATIONS.map(e => e.id).join(' | ')}
  --x0 NUMBER --y0 NUMBER --xn NUMBER --h NUMBER --eps NUMBER
  --output FILE                Сохранить текст результатов
  --graph FILE.svg             Сохранить график решений
  --error-graph FILE.svg       Сохранить график погрешности
  --help                       Справка
Пример: npm start -- --equation sum --x0 0 --y0 1 --xn 1 --h 0.1 --eps 1e-5`;

function options(args) {
  const flags = {};
  const unary = new Set(['--demo', '--help']);
  const valued = new Set(['--input', '--equation', '--x0', '--y0', '--xn', '--h', '--eps', '--output', '--graph', '--error-graph']);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg in flags) throw new Error(`Повторный параметр ${arg}.`);
    if (unary.has(arg)) flags[arg] = true;
    else if (valued.has(arg)) {
      if (args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(`Нет значения ${arg}.`);
      flags[arg] = args[++i];
    } else throw new Error(`Неизвестный параметр ${arg}. Используйте --help.`);
  }
  if (['--demo', '--input', '--equation'].filter(key => flags[key]).length > 1) throw new Error('Выберите один источник данных.');
  return flags;
}

// Построчный ввод через асинхронный итератор: работает и с терминалом, и с перенаправленным stdin.
function prompter() {
  const rl = readline.createInterface({ input: process.stdin });
  const lines = rl[Symbol.asyncIterator]();
  return {
    async ask(question) {
      process.stdout.write(question);
      const { value, done } = await lines.next();
      if (done) throw new Error('Ввод прерван: данные закончились.');
      return value.trim();
    },
    close: () => rl.close(),
  };
}

async function askNumber(rl, question, label, fallback) {
  for (;;) {
    const answer = await rl.ask(question);
    if (!answer && fallback !== undefined) return fallback;
    try { return parseNumber(answer, label); } catch (error) { console.log(error.message); }
  }
}

async function interactive() {
  const rl = prompter();
  try {
    console.log('Выберите уравнение y\' = f(x, y):');
    console.log(equationChoices());
    let equation;
    for (;;) {
      const answer = await rl.ask(`Номер уравнения [1..${EQUATIONS.length}]: `);
      const index = Number(answer);
      if (Number.isInteger(index) && index >= 1 && index <= EQUATIONS.length) { equation = EQUATIONS[index - 1].id; break; }
      console.log(`Введите целое число от 1 до ${EQUATIONS.length}.`);
    }
    const note = EQUATIONS.find(item => item.id === equation).note;
    if (note) console.log(note);
    const x0 = await askNumber(rl, 'x₀: ', 'x₀');
    const y0 = await askNumber(rl, 'y₀ = y(x₀): ', 'y₀');
    const xn = await askNumber(rl, 'xₙ: ', 'xₙ');
    const h = await askNumber(rl, 'Шаг h: ', 'Шаг h');
    const epsilon = await askNumber(rl, 'Точность ε [1e-6]: ', 'Точность ε', 1e-6);
    return { equation, x0, y0, xn, h, epsilon };
  } finally { rl.close(); }
}

async function main() {
  const flags = options(process.argv.slice(2));
  if (flags['--help']) { console.log(HELP); return; }

  let problem;
  if (flags['--demo']) problem = { ...DEMO };
  else if (flags['--input']) problem = parseProblem(await fs.readFile(flags['--input'], 'utf8'));
  else if (flags['--equation']) {
    problem = { equation: flags['--equation'], x0: flags['--x0'], y0: flags['--y0'], xn: flags['--xn'], h: flags['--h'], epsilon: flags['--eps'] ?? 1e-6 };
    for (const [key, value] of Object.entries({ '--x0': problem.x0, '--y0': problem.y0, '--xn': problem.xn, '--h': problem.h })) {
      if (value === undefined) throw new Error(`Не задан параметр ${key}.`);
    }
  } else problem = await interactive();

  const solution = solve(problem);
  const text = formatSolution(solution);
  console.log(text);

  for (const [flag, content] of [['--output', text], ['--graph', createGraphSvg(solution)], ['--error-graph', createErrorSvg(solution)]]) {
    if (!flags[flag]) continue;
    await fs.mkdir(path.dirname(path.resolve(flags[flag])), { recursive: true });
    await fs.writeFile(flags[flag], content.endsWith('\n') ? content : `${content}\n`);
    console.log(`Сохранено: ${flags[flag]}`);
  }
}

main().catch(error => { console.error(`Ошибка: ${error.message}`); process.exitCode = 1; });
