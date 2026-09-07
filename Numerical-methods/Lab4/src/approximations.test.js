import assert from "node:assert/strict";
import test from "node:test";

import {
  createVariant19Points,
  leastSquaresPolynomial,
  parsePointsInput,
  solveApproximations,
} from "./approximations.js";

test("variant 19 has 11 tabulation points", () => {
  const points = createVariant19Points();
  assert.equal(points.length, 11);
  assert.equal(points[0].x, 0);
  assert.equal(points.at(-1).x, 2);
});

test("polynomial least squares restores exact quadratic data", () => {
  const points = Array.from({ length: 8 }, (_, index) => {
    const x = index - 3;
    return { x, y: 2 * x ** 2 - 3 * x + 5 };
  });
  const coefficients = leastSquaresPolynomial(points, 2);
  assert.ok(Math.abs(coefficients[0] - 5) < 1e-9);
  assert.ok(Math.abs(coefficients[1] + 3) < 1e-9);
  assert.ok(Math.abs(coefficients[2] - 2) < 1e-9);
});

test("variant 19 solution marks positive-domain models as invalid", () => {
  const solution = solveApproximations(createVariant19Points());
  assert.equal(solution.best.id, "cubic");
  assert.equal(solution.models.find((model) => model.id === "exponential").applicable, false);
  assert.equal(solution.models.find((model) => model.id === "logarithmic").applicable, false);
  assert.equal(solution.models.find((model) => model.id === "power").applicable, false);
});

test("text input supports decimal commas separated by whitespace", () => {
  const points = parsePointsInput(`x y
0 0
0,2 0,1
0,4 0,2
0,6 0,3
0,8 0,4
1,0 0,5
1,2 0,6
1,4 0,7`);
  assert.equal(points.length, 8);
  assert.equal(points[1].x, 0.2);
});
