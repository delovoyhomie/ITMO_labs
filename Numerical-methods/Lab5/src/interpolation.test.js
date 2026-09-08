import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { VARIANT19, solve, generatePoints, uniformStep, validatePoints, lagrange } from './interpolation.js';
import { parseDataset } from './io.js';
import { parseNumber } from './utils.js';
import { createGraphSvg } from './plotting-core.js';

const near = (actual, expected, tolerance = 2e-10) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

// Constants independently obtained using rational arithmetic on the original table.
test('variant 19: both target values and finite differences', () => {
  for (const [x, expected] of [[1.573, 5.421616273003943], [1.375, 3.406628713989258]]) {
    const s = solve(VARIANT19.points, x);
    for (const m of s.models.filter(m => m.applicable)) near(m.value, expected, 1e-13);
    near(s.finite[6][0], -0.1478);
    assert.equal(s.preferred, 'II (назад)');
    assert.match(createGraphSvg(s), /Табличные данные/);
  }
});
for (const count of [2, 3, 4, 5, 6, 7, 8, 9]) {
  test(`all applicable schemes reproduce degree ${count - 1}, ${count} nodes`, () => {
    const fn = x => Array.from({ length: count }, (_, k) => ((k % 2 ? -1 : 1) / (k + 1)) * x ** k).reduce((a, b) => a + b, 0);
    const points = Array.from({ length: count }, (_, i) => { const x = -1 + i * 2 / (count - 1); return { x, y: fn(x) }; });
    for (const x of [-1, -.93, -.4, 0, .17, .5, .94, 1, 1.1]) {
      const s = solve(points, x);
      for (const m of s.models.filter(m => m.applicable)) near(m.value, fn(x));
      assert.equal(s.models.find(m => m.id === 'bessel').applicable, count % 2 === 0);
      assert.equal(s.models.find(m => m.id === 'stirling').applicable, count % 2 === 1);
    }
  });
}
test('every method recovers every node of variant 19', () => {
  for (const p of VARIANT19.points) for (const m of solve(VARIANT19.points, p.x).models.filter(m => m.applicable)) near(m.value, p.y);
});
test('unequal nodes: divided forward/backward are valid, finite schemes unavailable', () => {
  const fn = x => 2 * x ** 3 - x ** 2 + 4;
  const points = [-2, -.5, .3, 1.9, 3].map(x => ({ x, y: fn(x) }));
  const s = solve(points, .75);
  assert.equal(s.h, null);
  assert.equal(s.models.filter(m => m.applicable).length, 3);
  for (const m of s.models.filter(m => m.applicable)) near(m.value, fn(.75));
});
test('sorting preserves point pairs without mutating input', () => {
  const input = [{ x: 3, y: 9 }, { x: 1, y: 1 }, { x: 2, y: 4 }];
  near(solve(input, 1.5).models[0].value, 2.25);
  assert.equal(input[0].x, 3);
});
test('decimal comma, semicolon, scientific notation and BOM', () => {
  const s = parseDataset('\ufeffx;y\n0,0;1e0\n0,5;1,25\n1,0;2,0\n');
  near(lagrange(s.points, .25), 1.0625);
  assert.equal(parseNumber('-1,2e-3'), -.0012);
});
test('JSON supports points and x/y arrays', () => {
  assert.deepEqual(parseDataset('{"x":[0,1],"y":[1,2],"targets":[0.5]}').points, [{x:0,y:1},{x:1,y:2}]);
  assert.equal(parseDataset('[[0,1],[1,2]]').points.length, 2);
});
test('malformed and nonfinite values are rejected', () => {
  for (const bad of ['', ' ', null, true, [], {}, 'Infinity', 'NaN', '0x10', '1 2', '1e999']) assert.throws(() => parseNumber(bad));
  for (const bad of ['', '{}', '{bad', '{"x":[0,1],"y":[1]}', '0 1 2\n1 2', '[[0,1],[0,2]]', '[[0,1]]', '[[0,1],[1,null]]', '[[0,1],[1,2,3]]']) assert.throws(() => parseDataset(bad));
  assert.throws(() => solve(VARIANT19.points, NaN));
});
test('near-duplicate x and excessive point counts rejected', () => {
  assert.throws(() => validatePoints([{x:1,y:0},{x:1+Number.EPSILON,y:1}]));
  assert.throws(() => validatePoints(Array.from({length:51},(_,x)=>({x,y:x}))));
});
test('uniform-grid test works for small scales', () => {
  assert.equal(uniformStep([{x:0,y:0},{x:1e-12,y:1},{x:3e-12,y:2}]), null);
  near(uniformStep([{x:0,y:0},{x:1e-12,y:1},{x:2e-12,y:2}]) / 1e-12, 1);
});
test('function mode tabulates interval endpoints, reports exact value', () => {
  for (const id of ['sin', 'exp', 'cubic']) {
    const points = generatePoints(id, 0, 1, 7);
    assert.equal(points[0].x, 0); assert.equal(points.at(-1).x, 1);
    assert.equal(typeof solve(points, .4, id).exact, 'number');
    assert.match(createGraphSvg(solve(points, .4, id)), /f\(x\) =/);
  }
  near(solve(generatePoints('cubic', -1, 1, 6), .25, 'cubic').models[0].value, .515625);
});
test('invalid generated functions/intervals/counts and stale metadata', () => {
  for (const args of [['bad',0,1,7],['sin',1,0,7],['sin',0,1,2.5],['sin',0,1,1],['exp',1000,1001,3]]) assert.throws(() => generatePoints(...args));
  assert.throws(() => parseDataset('{"points":[[0,100],[1,200]],"functionId":"sin"}'));
});
test('extrapolation and high degree produce warnings', () => {
  assert.ok(solve(VARIANT19.points, 2).warnings.some(w=>w.includes('экстраполяция')));
  assert.ok(solve(generatePoints('sin',0,1,16),.5).warnings.some(w=>w.includes('Высокая степень')));
});
test('CLI: flags, file input, failure exit code and piped keyboard input', () => {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const run = (args, input) => spawnSync(process.execPath, ['src/index.js', ...args], { cwd, input, encoding:'utf8' });
  const valid = run(['--input','examples/variant19.json']);
  assert.equal(valid.status, 0); assert.match(valid.stdout,/5\.421616273004/);
  const invalid = run(['--input','examples/invalid-duplicate.json']);
  assert.equal(invalid.status, 1); assert.match(invalid.stderr,/различными/);
  assert.equal(run(['--x']).status, 1);
  const interactive = run([], '1\n3\n0 1\n1 2\n2 5\n0.5\n');
  assert.equal(interactive.status, 0, interactive.stderr); assert.match(interactive.stdout,/Лагранж: 1\.25/);
  const fn = run([], '3\nsin\n0\n1\n5\n0.4\n');
  assert.equal(fn.status, 0, fn.stderr); assert.match(fn.stdout,/Исходная функция/);
});
