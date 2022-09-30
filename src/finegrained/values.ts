import { ChaltteokRuntimeError } from "../base/errors";

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

export abstract class Thunk {
  public antecedent?: Value[] | RefBox;
  abstract strict(): StrictValuePack;
}
export type ValuePack = StrictValuePack | Thunk;

export function assertStrict(values: ValuePack): StrictValuePack {
  if (values instanceof Thunk)
    throw new ChaltteokRuntimeError("인수의 타입을 명시해야 합니다.", []);
  return values;
}
export function getConcreteValues(valuePack: StrictValuePack): Value[] {
  if (Array.isArray(valuePack)) return valuePack;
  if (valuePack.data != null) return valuePack.data;
  throw new ChaltteokRuntimeError(
    "초기화되지 않은 변수를 사용하려고 했습니다.",
    []
  );
}
