import path from "node:path";

import { verifySingleRoot } from "./analysis.js";
import { equations, getEquationById, variant19EquationMethods } from "./data/equations.js";
import { getSystemById, systems, variant19SystemMethods } from "./data/systems.js";
import { chordFixed, newton, simpleIterationEquation } from "./methods/equations.js";
import { newtonSystem } from "./methods/systems.js";
import { createEquationGraph, createSystemGraph } from "./plotting.js";
import {
  formatNumber,
  normalizeBounds,
  parseNumber,
  resultHeader,
} from "./utils.js";
import { createPrompt, readJsonFile, writeTextFile } from "./io.js";

async function askUntilValid(prompt, question, parser) {
  for (;;) {
    const raw = (await prompt.question(question)).trim();
    try {
      return parser(raw);
    } catch (error) {
      console.log(`Ошибка ввода: ${error.message}`);
    }
  }
}

async function askChoice(prompt, question, allowedValues, defaultValue) {
  const allowed = new Set(allowedValues);
  return askUntilValid(prompt, question, (raw) => {
    const value = raw || defaultValue;
    if (!value) {
      throw new Error("Значение не введено.");
    }
    if (!allowed.has(value)) {
      throw new Error(`Допустимые значения: ${allowedValues.join(", ")}.`);
    }
    return value;
  });
}

async function askExistingId(prompt, question, items, itemType) {
  const existingIds = items.map((item) => item.id);
  return askUntilValid(prompt, question, (raw) => {
    if (!existingIds.includes(raw)) {
      throw new Error(`Неизвестный ${itemType}. Используйте один из: ${existingIds.join(", ")}.`);
    }
    return raw;
  });
}

async function askPositiveNumber(prompt, question, fieldName) {
  return askUntilValid(prompt, question, (raw) => {
    const value = parseNumber(raw, fieldName);
    if (!(value > 0)) {
      throw new Error(`Поле "${fieldName}" должно быть положительным.`);
    }
    return value;
  });
}

async function askEquationInterval(prompt, equation) {
  for (;;) {
    const a = await askUntilValid(prompt, "Левая граница интервала a: ", (raw) => parseNumber(raw, "a"));
    const b = await askUntilValid(prompt, "Правая граница интервала b: ", (raw) => {
      const value = parseNumber(raw, "b");
      if (!(a < value)) {
        throw new Error("Правая граница должна быть больше левой.");
      }
      return value;
    });

    try {
      verifySingleRoot(equation, a, b);
      return { a, b };
    } catch (error) {
      console.log(`Ошибка ввода: ${error.message}`);
      console.log("Введите границы интервала заново.");
    }
  }
}

async function askGraphBounds(prompt) {
  const xMin = await askUntilValid(prompt, "Граница графика xMin: ", (raw) => parseNumber(raw, "xMin"));
  const xMax = await askUntilValid(prompt, "Граница графика xMax: ", (raw) => {
    const value = parseNumber(raw, "xMax");
    if (!(xMin < value)) {
      throw new Error("xMax должен быть больше xMin.");
    }
    return value;
  });
  const yMin = await askUntilValid(prompt, "Граница графика yMin: ", (raw) => parseNumber(raw, "yMin"));
  const yMax = await askUntilValid(prompt, "Граница графика yMax: ", (raw) => {
    const value = parseNumber(raw, "yMax");
    if (!(yMin < value)) {
      throw new Error("yMax должен быть больше yMin.");
    }
    return value;
  });

  return normalizeBounds({ xMin, xMax, yMin, yMax });
}

async function askOutputConfig(prompt) {
  const outputMode = await askChoice(prompt, "Куда вывести результат? [console/file]: ", ["console", "file"], "console");
  const outputFile = outputMode === "file"
    ? await askUntilValid(prompt, "Путь к файлу результата: ", (raw) => {
        if (!raw) {
          throw new Error("Путь к файлу не должен быть пустым.");
        }
        return raw;
      })
    : undefined;

  return {
    output: outputMode,
    outputFile,
  };
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }
  return process.argv[index + 1];
}

function formatEquationResult(result, equation, interval, graphPath) {
  const lines = [
    resultHeader("Результат для нелинейного уравнения"),
    `Уравнение: ${equation.name}`,
    `Метод: ${result.method}`,
    `Интервал: [${formatNumber(interval[0], 6)}, ${formatNumber(interval[1], 6)}]`,
    `Корень: ${formatNumber(result.root, 10)}`,
    `f(x): ${formatNumber(result.fx, 10)}`,
    `Число итераций: ${result.iterations}`,
  ];

  if (result.metadata?.fixedEndpoint !== undefined) {
    lines.push(`Фиксированный конец хорды: ${formatNumber(result.metadata.fixedEndpoint, 6)}`);
  }
  if (result.metadata?.q !== undefined) {
    lines.push(`Коэффициент сжатия q: ${formatNumber(result.metadata.q, 6)}`);
    lines.push(`Параметр lambda: ${formatNumber(result.metadata.lambda, 6)}`);
  }

  lines.push(`График сохранён: ${graphPath}`);
  return lines.join("\n");
}

function formatSystemResult(result, system, graphPath) {
  return [
    resultHeader("Результат для системы нелинейных уравнений"),
    `Система: ${system.name}`,
    `Метод: ${result.method}`,
    `x = ${formatNumber(result.solution.x, 10)}`,
    `y = ${formatNumber(result.solution.y, 10)}`,
    `F1(x, y) = ${formatNumber(result.residuals[0], 10)}`,
    `F2(x, y) = ${formatNumber(result.residuals[1], 10)}`,
    `Число итераций: ${result.iterations}`,
    `График сохранён: ${graphPath}`,
  ].join("\n");
}

function runEquationTask(config) {
  const equation = getEquationById(config.equationId);
  const a = Number(config.interval.a);
  const b = Number(config.interval.b);
  const epsilon = Number(config.epsilon);

  if (!(a < b)) {
    throw new Error("Левая граница интервала должна быть меньше правой.");
  }
  if (!(epsilon > 0)) {
    throw new Error("Точность должна быть положительной.");
  }

  const isolationInterval = verifySingleRoot(equation, a, b);
  const methodMap = {
    chord: chordFixed,
    newton,
    simpleIteration: simpleIterationEquation,
  };
  const solver = methodMap[config.method];
  if (!solver) {
    throw new Error(`Метод "${config.method}" не поддерживается для варианта 19.`);
  }

  const result = solver(equation, isolationInterval[0], isolationInterval[1], epsilon);
  const graphPath = path.resolve(
    config.graphFile ?? `output/graphs/equation-${equation.id}-${config.method}.svg`,
  );
  createEquationGraph(equation, {
    a,
    b,
    marker: {
      x: result.root,
      y: result.fx,
      label: `(${formatNumber(result.root, 4)}, ${formatNumber(result.fx, 4)})`,
    },
    outputFile: graphPath,
  });

  const output = formatEquationResult(result, equation, isolationInterval, graphPath);
  if (config.output === "file") {
    const targetFile = path.resolve(config.outputFile ?? "output/result-equation.txt");
    writeTextFile(targetFile, output);
    return `${output}\nРезультат также сохранён: ${targetFile}`;
  }
  return output;
}

function runSystemTask(config) {
  const system = getSystemById(config.systemId);
  const epsilon = Number(config.epsilon);
  if (!(epsilon > 0)) {
    throw new Error("Точность должна быть положительной.");
  }

  const initial = {
    x: Number(config.initial.x),
    y: Number(config.initial.y),
  };
  const bounds = normalizeBounds({
    xMin: Number(config.bounds.xMin),
    xMax: Number(config.bounds.xMax),
    yMin: Number(config.bounds.yMin),
    yMax: Number(config.bounds.yMax),
  });

  if (config.method !== "newtonSystem") {
    throw new Error(`Метод "${config.method}" не поддерживается для варианта 19.`);
  }

  const result = newtonSystem(system, initial, epsilon);
  const graphPath = path.resolve(
    config.graphFile ?? `output/graphs/system-${system.id}-${config.method}.svg`,
  );
  createSystemGraph(system, {
    bounds,
    marker: {
      x: result.solution.x,
      y: result.solution.y,
      label: `(${formatNumber(result.solution.x, 4)}, ${formatNumber(result.solution.y, 4)})`,
    },
    outputFile: graphPath,
  });

  const output = formatSystemResult(result, system, graphPath);
  if (config.output === "file") {
    const targetFile = path.resolve(config.outputFile ?? "output/result-system.txt");
    writeTextFile(targetFile, output);
    return `${output}\nРезультат также сохранён: ${targetFile}`;
  }
  return output;
}

async function collectEquationConfig(prompt) {
  console.log("Доступные уравнения:");
  equations.forEach((equation, index) => {
    console.log(`${index + 1}. ${equation.id} :: ${equation.name}`);
  });

  console.log("Методы варианта 19:");
  variant19EquationMethods.forEach((method, index) => {
    console.log(`${index + 1}. ${method.id} :: ${method.label}`);
  });

  const equationId = await askExistingId(prompt, "Введите id уравнения: ", equations, "id уравнения");
  const equation = getEquationById(equationId);
  const method = await askExistingId(prompt, "Введите id метода: ", variant19EquationMethods, "id метода");
  const interval = await askEquationInterval(prompt, equation);
  const epsilon = await askPositiveNumber(prompt, "Точность epsilon: ", "epsilon");
  const outputConfig = await askOutputConfig(prompt);

  return {
    taskType: "equation",
    equationId,
    method,
    interval,
    epsilon,
    ...outputConfig,
  };
}

async function collectSystemConfig(prompt) {
  console.log("Доступные системы:");
  systems.forEach((system, index) => {
    console.log(`${index + 1}. ${system.id} :: ${system.name}`);
  });

  console.log("Методы варианта 19:");
  variant19SystemMethods.forEach((method, index) => {
    console.log(`${index + 1}. ${method.id} :: ${method.label}`);
  });

  const systemId = await askExistingId(prompt, "Введите id системы: ", systems, "id системы");
  const method = await askExistingId(prompt, "Введите id метода: ", variant19SystemMethods, "id метода");
  const x = await askUntilValid(prompt, "Начальное приближение x0: ", (raw) => parseNumber(raw, "x0"));
  const y = await askUntilValid(prompt, "Начальное приближение y0: ", (raw) => parseNumber(raw, "y0"));
  const epsilon = await askPositiveNumber(prompt, "Точность epsilon: ", "epsilon");
  const bounds = await askGraphBounds(prompt);
  const outputConfig = await askOutputConfig(prompt);

  return {
    taskType: "system",
    systemId,
    method,
    initial: { x, y },
    epsilon,
    bounds,
    ...outputConfig,
  };
}

async function collectInteractiveConfig() {
  const prompt = createPrompt();
  try {
    const source = await askChoice(prompt, "Источник данных [keyboard/file]: ", ["keyboard", "file"], "keyboard");
    if (source === "file") {
      const filePath = await askUntilValid(prompt, "Путь к JSON-файлу: ", (raw) => {
        if (!raw) {
          throw new Error("Путь к JSON-файлу не должен быть пустым.");
        }
        return raw;
      });
      return readJsonFile(path.resolve(filePath));
    }

    const taskType = await askChoice(prompt, "Что решаем? [equation/system]: ", ["equation", "system"]);
    if (taskType === "equation") {
      return await collectEquationConfig(prompt);
    }
    if (taskType === "system") {
      return await collectSystemConfig(prompt);
    }
    throw new Error("Неизвестный тип задачи.");
  } finally {
    prompt.close();
  }
}

async function main() {
  const inputFile = getArgValue("--input");
  const config = inputFile ? readJsonFile(path.resolve(inputFile)) : await collectInteractiveConfig();
  const output =
    config.taskType === "equation" ? runEquationTask(config) : runSystemTask(config);
  console.log(output);
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});
