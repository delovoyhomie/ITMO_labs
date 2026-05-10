import { ensureDirectory, writeTextFile } from "./io.js";
import { createEquationGraphSvg, createSystemGraphSvg } from "./plotting-core.js";

export function createEquationGraph(equation, options) {
  ensureDirectory(options.outputFile);
  const { svg } = createEquationGraphSvg(equation, options);
  writeTextFile(options.outputFile, svg);
  return options.outputFile;
}

export function createSystemGraph(system, options) {
  ensureDirectory(options.outputFile);
  const { svg } = createSystemGraphSvg(system, options);
  writeTextFile(options.outputFile, svg);
  return options.outputFile;
}
