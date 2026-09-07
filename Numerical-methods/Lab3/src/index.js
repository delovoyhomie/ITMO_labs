import path from "node:path";

import { properFunctions, improperFunctions, integrationMethods } from "./data/functions.js";
import { solveProperIntegral, solveImproperIntegral } from "./solver.js";
import { createPrompt, readJsonFile, writeTextFile } from "./io.js";
import { parseNumber } from "./utils.js";

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
    if (!allowed.has(value)) {
      throw new Error(`Допустимые значения: ${allowedValues.join(", ")}.`);
    }
    return value;
  });
}

async function askExistingId(prompt, question, items) {
  const ids = items.map((item) => item.id);
  return askUntilValid(prompt, question, (raw) => {
    if (!ids.includes(raw)) {
      throw new Error(`Используйте один из: ${ids.join(", ")}.`);
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

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }
  return process.argv[index + 1];
}

function printFunctions(list, title) {
  console.log(title);
  list.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.id} :: f(x) = ${item.name} — ${item.description}`);
  });
}

function printMethods() {
  console.log("Методы интегрирования:");
  integrationMethods.forEach((method, index) => {
    console.log(`  ${index + 1}. ${method.id} :: ${method.label}`);
  });
}

async function collectConfig(prompt) {
  const taskType = await askChoice(
    prompt,
    "Тип интеграла [proper/improper] (по умолчанию proper): ",
    ["proper", "improper"],
    "proper",
  );

  const list = taskType === "improper" ? improperFunctions : properFunctions;
  printFunctions(list, taskType === "improper" ? "Несобственные интегралы 2 рода:" : "Определённые интегралы:");
  const functionId = await askExistingId(prompt, "Введите id функции: ", list);

  printMethods();
  const method = await askExistingId(prompt, "Введите id метода: ", integrationMethods);

  const a = await askUntilValid(prompt, "Нижний предел a: ", (raw) => parseNumber(raw, "a"));
  const b = await askUntilValid(prompt, "Верхний предел b: ", (raw) => {
    const value = parseNumber(raw, "b");
    if (!(a < value)) {
      throw new Error("Верхний предел должен быть больше нижнего.");
    }
    return value;
  });
  const epsilon = await askPositiveNumber(prompt, "Точность ε: ", "epsilon");

  const outputMode = await askChoice(
    prompt,
    "Куда вывести результат? [console/file] (по умолчанию console): ",
    ["console", "file"],
    "console",
  );
  const outputFile =
    outputMode === "file"
      ? await askUntilValid(prompt, "Путь к файлу результата: ", (raw) => {
          if (!raw) {
            throw new Error("Путь не должен быть пустым.");
          }
          return raw;
        })
      : undefined;

  return { taskType, functionId, method, a, b, epsilon, output: outputMode, outputFile };
}

async function collectInteractiveConfig() {
  const prompt = createPrompt();
  try {
    const source = await askChoice(
      prompt,
      "Источник данных [keyboard/file] (по умолчанию keyboard): ",
      ["keyboard", "file"],
      "keyboard",
    );
    if (source === "file") {
      const filePath = await askUntilValid(prompt, "Путь к JSON-файлу: ", (raw) => {
        if (!raw) {
          throw new Error("Путь не должен быть пустым.");
        }
        return raw;
      });
      return readJsonFile(path.resolve(filePath));
    }
    return await collectConfig(prompt);
  } finally {
    prompt.close();
  }
}

function runTask(config) {
  const solution =
    config.taskType === "improper" ? solveImproperIntegral(config) : solveProperIntegral(config);
  return solution.text;
}

async function main() {
  const inputFile = getArgValue("--input");
  const config = inputFile ? readJsonFile(path.resolve(inputFile)) : await collectInteractiveConfig();
  const output = runTask(config);

  if (config.output === "file" && config.outputFile) {
    const targetFile = path.resolve(config.outputFile);
    writeTextFile(targetFile, output);
    console.log(output);
    console.log(`\nРезультат сохранён: ${targetFile}`);
    return;
  }

  console.log(output);
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});
