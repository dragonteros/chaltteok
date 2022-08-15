import { RuntimeError } from "../lexer/tokens";
import { Tree } from "../parser/ast";

/* Type check related stuff */

export type Type = string | { listOf: Type };
export type TypePack = {
  arity: number | { atLeast: number } | "n";
  type: Type;
};
export type VariableAnnotation = { variableOf: TypePack | "any" };
export type TypeAnnotation =
  | TypePack
  | VariableAnnotation
  | "new"
  | "any"
  | "lazy";

export type CompiledImpl = { type: "compiled"; body: Processor };
export type ExprImpl = { type: "expr"; body: Tree[] };
export type Impl = CompiledImpl | ExprImpl;

export type Signature = {
  param: TypeAnnotation[];
  antecedent?: TypePack | VariableAnnotation | "any";
};
export type Protocol = {
  arguments: (number | null)[]; // null means antecedent
};
export type Procedure = {
  impl: Impl;
  protocol?: Protocol;
};

/* Env */

export abstract class Env {
  private readonly memory: Record<string, Box> = {};
  constructor(readonly args: ValuePack[]) {}
  getArg(idx: number): ValuePack {
    if (this.args.length <= idx)
      throw new RuntimeError(`${idx}번째 인수가 없습니다.`);
    return this.args[idx];
  }
  get(id: string): Box {
    let box = this.memory[id];
    if (box == null) {
      box = { data: undefined };
      this.memory[id] = box;
    }
    return box;
  }
  set(id: string, value: StrictValuePack) {
    this.memory[id].data = getConcreteValues(value);
  }
  abstract lazy(expr: Tree): Thunk;
}
export abstract class Thunk {
  public antecedent?: Value[] | RefBox;
  abstract strict(): StrictValuePack;
}

/* Values */

// TODO: remove DivV from ast.ts!
export type NumberV = { type: "수"; 값: number };
export type IntegerV = { type: "정수"; 값: number };
export type DivV = { type: "나눔"; 값: number; 몫: number; 나머지: number };
export type ListV = { type: "열"; data: Value[] };
export type Value = boolean | NumberV | IntegerV | DivV | ListV;

export type NewBox = { data: undefined };
export type RefBox = { data: Value[] };
export type Box = NewBox | RefBox;
export type StrictValuePack = Value[] | Box;

export type ValuePack = StrictValuePack | Thunk;

export type Processor = (
  env: Env
) => (antecedent?: Value[] | RefBox) => ValuePack;

export function assertStrict(values: ValuePack): StrictValuePack {
  if (values instanceof Thunk)
    throw new TypeError("인수의 타입을 명시해야 합니다.");
  return values;
}
export function getConcreteValues(valuePack: StrictValuePack): Value[] {
  if (Array.isArray(valuePack)) return valuePack;
  if (valuePack.data != null) return valuePack.data;
  throw new RuntimeError("초기화되지 않은 변수를 사용하려고 했습니다.");
}
