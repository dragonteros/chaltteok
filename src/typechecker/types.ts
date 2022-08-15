import { toMultiVariate } from "../utils/utils";

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
export type ConcretePack = { arity: number; type: ConcreteType };
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
