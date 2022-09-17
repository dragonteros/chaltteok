import { ExprAST } from "./ast";
import { Env } from "./env";
import { RefBox, Value, ValuePack } from "./values";

export type Processor = (
  env: Env
) => (antecedent?: Value[] | RefBox) => ValuePack;

export type CompiledImpl = { type: "compiled"; body: Processor };
export type ExprImpl = { type: "expr"; body: ExprAST[] };
export type Impl = CompiledImpl | ExprImpl;

export type Protocol = {
  arguments: (number | null)[]; // null means antecedent
};
export type JSProcedure = {
  impl: CompiledImpl;
  protocol?: Protocol;
};
export type ChaltteokProcedure = {
  impl: ExprImpl;
  protocol?: Protocol;
};
export type Procedure = JSProcedure | ChaltteokProcedure;
