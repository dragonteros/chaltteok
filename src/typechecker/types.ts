import { TypeError } from "../errors";
import { NewBox, RefBox, StrictValuePack, Value } from "../runner/values";
import { toMultiVariate } from "../utils/utils";
import { ConcreteTypeParameterMap, updateTypeMap } from "./signature";

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

type PRIMITIVE_TYPE = "수" | "정수" | "나눔" | "참거짓";
const SUPERTYPE: Partial<Record<PRIMITIVE_TYPE, PRIMITIVE_TYPE>> = {
  정수: "수",
  나눔: "수",
};
const PRIMITIVE_KINGDOMS: Record<PRIMITIVE_TYPE, PRIMITIVE_TYPE> = {
  수: "수",
  정수: "수",
  나눔: "수",
  참거짓: "참거짓",
};
export function isPrimitiveType(t: string): t is PRIMITIVE_TYPE {
  return t in PRIMITIVE_KINGDOMS;
}

export function isSubtype(a: PRIMITIVE_TYPE, b: PRIMITIVE_TYPE): boolean {
  if (PRIMITIVE_KINGDOMS[a] !== PRIMITIVE_KINGDOMS[b]) return false;
  let cur: PRIMITIVE_TYPE | undefined = a;
  while (cur) {
    if (cur === b) return true;
    cur = SUPERTYPE[cur];
  }
  return false;
}
function* supertypes(t: PRIMITIVE_TYPE) {
  let cur: PRIMITIVE_TYPE | undefined = t;
  while (cur) {
    yield cur;
    cur = SUPERTYPE[cur];
  }
}

export type ConcreteType = PRIMITIVE_TYPE | { listOf: ConcreteType };
type ConcretePack = { arity: number; type: ConcreteType };
export type ConcreteAnnotation = ConcretePack | { variableOf: ConcretePack };
export function isConcreteType(t: TypePack["type"]): t is ConcreteType {
  if (typeof t === "string") return isPrimitiveType(t);
  return isConcreteType(t.listOf);
}
export function isConcreteAnnotation(
  annotation: TypeAnnotation
): annotation is ConcreteAnnotation {
  if (typeof annotation === "string") return false;
  if ("variableOf" in annotation) {
    if (annotation.variableOf === "any") return false;
    return isConcreteAnnotation(annotation.variableOf);
  }
  if (typeof annotation.arity !== "number") return false;
  return isConcreteType(annotation.type);
}

export function getType(values: Value[]): ConcretePack;
export function getType(values: NewBox): "new";
export function getType(values: RefBox): { variableOf: ConcretePack };
export function getType(values: StrictValuePack): ConcreteAnnotation | "new" {
  const err = new TypeError("Internal Error getType");
  if (!Array.isArray(values)) {
    if (values.data == null) return "new";
    return { variableOf: getType(values.data) };
  }

  if (values.length === 0) return { arity: 0, type: "수" };
  if (values.length === 1) {
    const value = values[0];
    if (typeof value === "boolean") {
      return { arity: 1, type: "참거짓" };
    }
    switch (value.type) {
      case "열":
        const { type } = getType(value.data);
        return { arity: 1, type: { listOf: type } };
      default:
        return { arity: 1, type: value.type };
    }
  }

  const types = values.map((x) => getType([x]));
  if (types.some((x) => x.arity !== 1)) throw err;
  const typeMap: ConcreteTypeParameterMap = {};
  for (const t of types) {
    const _t = t.type;
    if (!updateTypeMap(typeMap, { T: _t })) throw err;
  }
  return { arity: types.length, type: typeMap.T };
}

export const lowestCommonSupertype = toMultiVariate(function f(
  first: ConcreteType,
  rest: ConcreteType
): ConcreteType | undefined {
  if (typeof first !== "string" && typeof rest !== "string") {
    const listOf = f(first.listOf, rest.listOf);
    return listOf && { listOf };
  }
  if (typeof first !== "string" || typeof rest !== "string") return;

  if (PRIMITIVE_KINGDOMS[first] !== PRIMITIVE_KINGDOMS[rest]) return;
  const firstSupers = supertypes(first);
  const restSupers = new Set(supertypes(rest));
  for (const t of firstSupers) {
    if (restSupers.has(t)) return t;
  }
});
