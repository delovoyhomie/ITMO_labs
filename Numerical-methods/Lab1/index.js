'use strict';

const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { GaussianColumnPivotSolver } = require('./src/gaussianColumnPivot');
const { readSystemFromFile, readSystemFromKeyboard, readRandomSystem } = require('./src/input');
const {
  solveWithLibrary,
  compareSolutions,
  compareDeterminants
} = require('./src/libraryComparison');
const {
  formatFraction,
  formatAugmentedMatrix,
  formatNamedVector,
  formatNumericVector
} = require('./src/formatting');

async function askInputMode(ask) {
  while (true) {
    console.log('\nИсточник данных:');
    console.log('1 - ввод с клавиатуры');
    console.log('2 - ввод из файла');
    console.log('3 - случайная матрица заданной размерности');

    const answer = (await ask('Выберите режим (1/2/3): ')).trim();
    if (answer === '1' || answer === '2' || answer === '3') {
      return answer;
    }

    console.log('Ошибка: введите 1, 2 или 3.');
  }
}

async function loadSystem(ask) {
  const mode = await askInputMode(ask);

  if (mode === '1') {
    return readSystemFromKeyboard(ask);
  }

  if (mode === '2') {
    while (true) {
      const filePath = (await ask('Введите путь к файлу: ')).trim();
      try {
        return await readSystemFromFile(filePath);
      } catch (error) {
        console.log(`Ошибка: ${error.message}`);
      }
    }
  }

  while (true) {
    try {
      return await readRandomSystem(ask);
    } catch (error) {
      console.log(`Ошибка: ${error.message}`);
    }
  }
}

function formatNumber(value, digits = 16) {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return value.toPrecision(digits);
}

function printSection(title, sourceLine = null) {
  const line = '='.repeat(84);
  console.log(`\n${line}`);
  console.log(title);
  if (sourceLine) {
    console.log(sourceLine);
  }
  console.log(line);
}

function printResult(result, libraryResult) {
  printSection(
    'БЛОК 1. НАШИ ВЫЧИСЛЕНИЯ',
    'Источник: собственный метод Гаусса + точные дроби Fraction(BigInt)'
  );

  console.log('\nТреугольная матрица (с преобразованным столбцом B):');
  console.log(formatAugmentedMatrix(result.triangularMatrix, 3));

  console.log('\nОпределитель (из треугольной матрицы):');
  console.log(`det(A) = ${formatFraction(result.determinant, 28)}`);
  console.log(`Перестановок строк: ${result.swapCount}`);
  console.log(`rank(A) = ${result.rankA}, rank([A|B]) = ${result.rankAugmented}`);

  console.log('\nСтатус решения:');
  console.log(result.message);

  if (result.status === 'unique' && result.solution) {
    console.log('\nВектор неизвестных:');
    console.log(formatNamedVector('x', result.solution, 28));

    console.log('\nВектор невязок r = A*x - B:');
    console.log(formatNamedVector('r', result.residualVector, 28));
  }

  printSection(
    'БЛОК 2. ВЫЧИСЛЕНИЯ БИБЛИОТЕКИ',
    'Источник: mathjs (числа с плавающей точкой Number/float64)'
  );

  if (libraryResult.errors.length > 0) {
    console.log('Ошибки библиотеки:');
    for (const errorText of libraryResult.errors) {
      console.log(`- ${errorText}`);
    }
  }

  if (libraryResult.numericBackend) {
    console.log(`Числовые операции backend: ${libraryResult.numericBackend}`);
  }

  if (libraryResult.determinant !== null) {
    console.log(`det_lib(A) = ${formatNumber(libraryResult.determinant, 16)}`);
  } else {
    console.log('det_lib(A): не удалось вычислить.');
  }

  if (libraryResult.solution) {
    console.log('\nВектор неизвестных (библиотека):');
    console.log(formatNumericVector('x_lib', libraryResult.solution, 16));

    if (Array.isArray(libraryResult.residualVector)) {
      console.log('\nВектор невязок библиотеки r_lib = A*x_lib - B:');
      console.log(formatNumericVector('r_lib', libraryResult.residualVector, 16));
    }
  } else {
    console.log('Решение библиотекой: не удалось вычислить.');
  }

  printSection(
    'БЛОК 3. СРАВНЕНИЕ НАШЕГО МЕТОДА И БИБЛИОТЕКИ',
    'Источник: расчёт абсолютных отклонений между двумя полученными решениями'
  );

  const determinantComparison = compareDeterminants(result.determinant, libraryResult.determinant);
  if (determinantComparison) {
    console.log(
      `|det(наш) - det(библ)| = ${formatNumber(determinantComparison.absDifference, 16)}`
    );
  }

  if (result.status === 'unique' && result.solution && libraryResult.solution) {
    const solutionComparison = compareSolutions(result.solution, libraryResult.solution);
    if (solutionComparison) {
      console.log('\nАбсолютные отклонения по компонентам |x - x_lib|:');
      console.log(formatNumericVector('dx', solutionComparison.absDifferences, 16));
      console.log(`max |x - x_lib| = ${formatNumber(solutionComparison.maxAbsDifference, 16)}`);
    }
  }
}

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const ask = (prompt) => rl.question(prompt);

  try {
    console.log('Лабораторная работа №1');
    console.log('Метод Гаусса с выбором главного элемента по столбцу (вариант 19)');
    console.log('Внутренние вычисления выполняются на точных рациональных числах (BigInt).');

    const system = await loadSystem(ask);
    const solver = new GaussianColumnPivotSolver();
    const result = solver.solve(system.matrix, system.vector);
    const libraryResult = solveWithLibrary(system.matrix, system.vector);
    printResult(result, libraryResult);
  } catch (error) {
    console.error(`Критическая ошибка: ${error.message}`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main();
