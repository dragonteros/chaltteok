/* Procedure */
import { Tree } from "../parser/ast";
import { Env } from "./env";
import { RefBox, Value, ValuePack } from "./values";

export type Processor = (
  env: Env
) => (antecedent?: Value[] | RefBox) => ValuePack;

export type CompiledImpl = { type: "compiled"; body: Processor };
export type ExprImpl = { type: "expr"; body: Tree[] };
export type Impl = CompiledImpl | ExprImpl;

export type Protocol = {
  arguments: (number | null)[]; // null means antecedent
};
export type Procedure = {
  impl: Impl;
  protocol?: Protocol;
};
