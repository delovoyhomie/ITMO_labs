import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VARIANT19, generatePoints, solve } from './interpolation.js';
import { parseDataset, formatSolution } from './io.js';
import { createGraphSvg } from './plotting-core.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await fs.mkdir(path.join(root, 'output/graphs'), { recursive: true });
const variant = VARIANT19.targets.map(x => solve(VARIANT19.points, x));
const lines = ['# Лабораторная работа №5. Интерполяция функции', '', 'Вариант 19. Таблица 1.4. Все вычисления используют семь узлов.', '',
  'Для X₁ = 1.573: вторая формула Ньютона, t = (1.573 − 1.65)/0.1 = −0.77.',
  'Для X₂ = 1.375: первая формула Гаусса, t = (1.375 − 1.35)/0.1 = 0.25.', '',
  'Подробные ручные вычисления, рабочие формулы, листинг и выводы приведены в lab5-variant19-report.tex / PDF.', ''];
for (const s of variant) lines.push(`## Аргумент ${s.x}`, '', '```text', formatSolution(s), '```', '');
await fs.writeFile(path.join(root, 'output/variant19-result.txt'), variant.map(formatSolution).join('\n\n') + '\n');
await fs.writeFile(path.join(root, 'output/graphs/variant19-interpolation.svg'), createGraphSvg(variant[0]));
await fs.writeFile(path.join(root, 'docs/graph-computational.svg'), createGraphSvg(variant[0]));
for (const name of ['uneven-quadratic', 'cubic-even', 'sin']) {
  const d = parseDataset(await fs.readFile(path.join(root, `examples/${name}.json`), 'utf8'));
  const s = solve(d.points, d.targets[0], d.functionId);
  await fs.writeFile(path.join(root, `output/${name}-result.txt`), formatSolution(s) + '\n');
  await fs.writeFile(path.join(root, `output/graphs/${name}.svg`), createGraphSvg(s));
  lines.push(`## Тест: ${name}`, '', '```text', formatSolution(s), '```', '');
}
for (const name of ['invalid-duplicate','invalid-too-few-points']) {
  try { parseDataset(await fs.readFile(path.join(root, `examples/${name}.json`), 'utf8')); }
  catch (error) { lines.push(`## Тест: ${name}`, '', `Ошибка: ${error.message}`, ''); }
}
const sine = solve(generatePoints('sin', 0, Math.PI, 5), .7, 'sin');
await fs.writeFile(path.join(root, 'docs/graph-sin.svg'), createGraphSvg(sine));
await fs.writeFile(path.join(root, 'output/sin-five-result.txt'), formatSolution(sine)+'\n');
await fs.writeFile(path.join(root, 'variant19-report.md'), lines.join('\n'));
console.log('Обновлены variant19-report.md, текстовые результаты и SVG-графики. PDF: tectonic lab5-variant19-report.tex');
