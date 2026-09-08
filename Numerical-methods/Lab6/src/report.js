import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { solve } from './ode.js';
import { parseProblem, formatSolution } from './io.js';
import { createGraphSvg, createErrorSvg } from './plotting-core.js';
import { formatNumber as f } from './utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VALID = ['variant19', 'exponential', 'linear-sum', 'gaussian', 'stiff-euler-diverges'];
const INVALID = ['invalid-step', 'invalid-interval', 'invalid-equation', 'invalid-epsilon'];

await fs.mkdir(path.join(root, 'output/graphs'), { recursive: true });
const lines = ['# Лабораторная работа №6. Численное решение ОДУ', '',
  'Вариант 19: метод Эйлера (1), метод Рунге-Кутта 4-го порядка (3), метод Адамса (4).', '',
  'Одношаговые методы оценены правилом Рунге, метод Адамса — по точному решению.',
  'Подробные формулы, листинг и выводы приведены в `lab6-variant19-report.tex` / PDF.', ''];

async function run(name, { graphs = false } = {}) {
  const problem = parseProblem(await fs.readFile(path.join(root, `examples/${name}.json`), 'utf8'));
  const solution = solve(problem);
  const text = formatSolution(solution);
  await fs.writeFile(path.join(root, `output/${name}-result.txt`), `${text}\n`);
  await fs.writeFile(path.join(root, `output/graphs/${name}.svg`), createGraphSvg(solution));
  if (graphs) {
    await fs.writeFile(path.join(root, 'docs/graph-variant19.svg'), createGraphSvg(solution));
    await fs.writeFile(path.join(root, 'docs/graph-variant19-error.svg'), createErrorSvg(solution));
  }
  await fs.writeFile(path.join(root, `output/graphs/${name}-error.svg`), createErrorSvg(solution));
  lines.push(`## ${name}`, '', '```text', text, '```', '');
  return solution;
}

const variant = await run('variant19', { graphs: true });
for (const name of VALID.slice(1)) await run(name);

const keyboard = solve(parseProblem(await fs.readFile(path.join(root, 'examples/keyboard-like.txt'), 'utf8')));
await fs.writeFile(path.join(root, 'output/keyboard-like-result.txt'), `${formatSolution(keyboard)}\n`);
await fs.writeFile(path.join(root, 'output/graphs/keyboard-like.svg'), createGraphSvg(keyboard));
lines.push('## keyboard-like (текстовый формат, десятичная запятая)', '', '```text', formatSolution(keyboard), '```', '');

lines.push('## Некорректные наборы', '');
for (const name of INVALID) {
  try {
    parseProblem(await fs.readFile(path.join(root, `examples/${name}.json`), 'utf8'));
    lines.push(`- ${name}: ошибка не обнаружена (это дефект).`);
  } catch (error) { lines.push(`- ${name}: ${error.message}`); }
}
lines.push('');

// Сходимость метода Эйлера и Рунге-Кутта при дроблении шага на задаче варианта.
lines.push('## Порядок сходимости на примере варианта', '', '| h | Эйлер: max\\|Δ\\| | Рунге-Кутта: max\\|Δ\\| |', '|---|---|---|');
const convergence = [];
for (const h of [0.1, 0.05, 0.025, 0.0125]) {
  const s = solve({ equation: 'bernoulli', x0: 1, y0: -1, xn: 1.5, h, epsilon: 1e-6 });
  const pick = id => s.results.find(r => r.id === id).base.error.value;
  convergence.push({ h, euler: pick('euler'), rk4: pick('rk4') });
  lines.push(`| ${h} | ${f(pick('euler'), 10)} | ${f(pick('rk4'), 12)} |`);
}
lines.push('', 'Отношение соседних погрешностей:', '');
for (let i = 1; i < convergence.length; i++) {
  lines.push(`- h = ${convergence[i - 1].h} → ${convergence[i].h}: Эйлер ${f(convergence[i - 1].euler / convergence[i].euler, 3)}×, `
    + `Рунге-Кутта ${f(convergence[i - 1].rk4 / convergence[i].rk4, 3)}×`);
}
lines.push('', 'Ожидаемые множители: 2 для первого порядка и 16 для четвёртого.', '');

await fs.writeFile(path.join(root, 'variant19-report.md'), `${lines.join('\n')}\n`);
console.log('Обновлены variant19-report.md, output/*.txt и SVG-графики.');
console.log(`Задача варианта: узлов ${variant.nodes.length}, погрешность Адамса ${f(variant.results.find(r => r.id === 'adams').error.value, 10)}.`);
console.log('PDF собирается отдельно: npm run pdf');
