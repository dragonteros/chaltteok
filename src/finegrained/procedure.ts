import { Env } from "./env";
import { Tree } from "./terms";
import { RefBox, Value, ValuePack } from "./values";

export type Processor = (
  env: Env
) => (antecedent?: Value[] | RefBox) => ValuePack;

export type CompiledImpl = { type: "compiled"; fun: Processor };
export type ExprImpl = { type: "expr"; expr: Tree[] };
export type Impl = CompiledImpl | ExprImpl;

export type Protocol = {
  arguments: (number | null)[]; // null means antecedent
};
export type Procedure = { impl: Impl; protocol?: Protocol };

export type Action =
  | { type: "FunCall"; fun: Procedure }
  | { type: "ArgRef"; index: number };
