import fs from "node:fs/promises";
import process from "node:process";
import readline from "node:readline/promises";

import {
  createVariant19Points,
  formatResultText,
  parsePointsInput,
  solveApproximations,
} from "./approximations.js";
import { parseLooseNumber } from "./utils.js";

function printHelp() {
  console.log(`Использование:
  node src/index.js --variant19
  node src/index.js --input examples/variant19.json
  node src/index.js --input data.txt --output result.txt

Если аргументы не указаны, программа запросит точки в консоли.`);
}

function getArgValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

async function readInteractivePoints() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const countRaw = await rl.question("Количество точек (8-12): ");
    const count = Number(countRaw);
    if (!Number.isInteger(count) || count < 8 || count > 12) {
      throw new Error("Количество точек должно быть целым числом от 8 до 12.");
    }

    const points = [];
    for (let index = 0; index < count; index += 1) {
      const line = await rl.question(`Точка ${index + 1}, формат "x y": `);
      const parts = line.trim().split(/[;\s]+/).filter(Boolean);
      const x = parseLooseNumber(parts[0]);
      const y = parseLooseNumber(parts[1]);
      if (parts.length < 2 || x === null || y === null) {
        throw new Error(`Не удалось прочитать точку ${index + 1}.`);
      }
      points.push({ x, y });
    }

    return points;
  } finally {
    rl.close();
  }
}

async function readInput(args) {
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return null;
  }

  if (args.includes("--variant19")) {
    return createVariant19Points();
  }

  const inputPath = getArgValue(args, "--input");
  if (inputPath) {
    return parsePointsInput(await fs.readFile(inputPath, "utf8"));
  }

  if (!process.stdin.isTTY) {
    return parsePointsInput(await new Promise((resolve, reject) => {
      let content = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        content += chunk;
      });
      process.stdin.on("end", () => resolve(content));
      process.stdin.on("error", reject);
    }));
  }

  return readInteractivePoints();
}

async function main() {
  const args = process.argv.slice(2);
  const points = await readInput(args);
  if (!points) {
    return;
  }

  const solution = solveApproximations(points);
  const text = formatResultText(solution);
  const outputPath = getArgValue(args, "--output");

  if (outputPath) {
    await fs.writeFile(outputPath, text, "utf8");
    console.log(`Результат записан в ${outputPath}`);
    return;
  }

  console.log(text);
}

main().catch((error) => {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
});
