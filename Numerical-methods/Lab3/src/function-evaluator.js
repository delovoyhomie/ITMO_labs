export class FunctionEvaluator {
  constructor(definition) {
    this.definition = definition;
  }

  get id() {
    return this.definition.id;
  }

  get name() {
    return this.definition.name;
  }

  get description() {
    return this.definition.description;
  }

  get kind() {
    return this.definition.kind ?? "proper";
  }

  get singularities() {
    return this.definition.singularities ?? [];
  }

  evaluate(x) {
    const value = this.definition.f(x);
    if (!Number.isFinite(value)) {
      throw new Error(`Функция не определена (бесконечный разрыв) в точке x = ${x}.`);
    }
    return value;
  }

  tryEvaluate(x) {
    const value = this.definition.f(x);
    return Number.isFinite(value) ? value : null;
  }

  hasAntiderivative() {
    return typeof this.definition.F === "function";
  }

  exactIntegral(a, b) {
    if (!this.hasAntiderivative()) {
      return null;
    }
    return this.definition.F(b) - this.definition.F(a);
  }
}
