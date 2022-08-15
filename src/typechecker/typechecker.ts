import { TypeError } from "../lexer/tokens";
import {
  NewBox,
  RefBox,
  Signature,
  StrictValuePack,
  TypeAnnotation,
  TypePack,
  Value,
  VariableAnnotation,
} from "../runner/values";
import { DefaultMap, nullAccepting, toMultiVariate, zip } from "../utils/utils";

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
function isPrimitiveType(t: string): t is PRIMITIVE_TYPE {
  return t in PRIMITIVE_KINGDOMS;
}

function isSubtype(a: PRIMITIVE_TYPE, b: PRIMITIVE_TYPE): boolean {
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

type ConcreteType = PRIMITIVE_TYPE | { listOf: ConcreteType };
type ConcretePack = { arity: number; type: ConcreteType };
type ConcreteAnnotation = ConcretePack | { variableOf: ConcretePack };
function isConcreteType(t: TypePack["type"]): t is ConcreteType {
  if (typeof t === "string") return isPrimitiveType(t);
  return isConcreteType(t.listOf);
}
function isConcreteAnnotation(
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

const lowestCommonSupertype = toMultiVariate(function f(
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

/* ****************** PATTERN DEFINITION PARSING ****************** */

function mergeArity(
  a: TypePack["arity"],
  b: TypePack["arity"]
): TypePack["arity"] {
  const err = new TypeError("패턴의 인수 타입 정의가 모순됩니다.");
  if (a === "n" && b === "n") return "n";
  if (a === "n" || b === "n") throw err;

  let num: number | undefined = undefined;
  let atLeast: number | undefined = undefined;
  for (const x of [a, b]) {
    if (typeof x === "number") {
      if (num == null) num = x;
      else if (num !== x) throw err;
    } else {
      if (atLeast == null) atLeast = x.atLeast;
      else atLeast = Math.max(atLeast, x.atLeast);
    }
  }
  if (atLeast == null) {
    if (num == null) throw err;
    return num;
  }
  if (num == null) return { atLeast };
  if (num >= atLeast) return num;
  throw err;
}
function mergeType(a: TypePack["type"], b: TypePack["type"]): TypePack["type"] {
  const err = new TypeError("패턴의 인수 타입 정의가 모순됩니다.");
  if (typeof a === "object" && typeof b === "object") {
    return mergeType(a.listOf, b.listOf);
  } else if (a === b) return a;
  throw err;
}
export function mergeParamTypes(
  old: TypeAnnotation,
  update?: TypeAnnotation
): TypeAnnotation {
  const notImplemented = new TypeError(
    "Internal Error mergeParamTypes::NOT_IMPLEMENTED"
  );
  const err = new TypeError("패턴의 인수 타입 정의가 모순됩니다.");
  if (update == null) return old;

  if (old === "new") throw notImplemented;
  if (update === "new") return "new";

  if (old === "lazy") throw notImplemented;
  if (update === "lazy") return "lazy";

  if (old === "any") return update;
  if (update === "any") throw err;

  if ("variableOf" in old && "variableOf" in update) {
    const merged = mergeParamTypes(old.variableOf, update.variableOf);
    if (typeof merged === "string" || "variableOf" in merged) throw err;
    return { variableOf: merged };
  }
  if ("variableOf" in old || "variableOf" in update) throw err;

  return {
    arity: mergeArity(old.arity, update.arity),
    type: mergeType(old.type, update.type),
  };
}

/* ****************** SIGNATURE MATCHING ****************** */

type ConcreteArityParameterMap = Record<string, number>;
type ConcreteTypeParameterMap = Record<string, ConcreteType>;

function matchArity(
  paramArity: TypePack["arity"],
  argArity: number
): ConcreteArityParameterMap | null {
  if (paramArity === "n") return { n: argArity };
  if (typeof paramArity === "number") {
    return argArity === paramArity ? {} : null;
  }
  return argArity >= paramArity.atLeast ? {} : null;
}
function matchType(
  paramType: TypePack["type"],
  argType: ConcreteType
): ConcreteTypeParameterMap | null {
  if (typeof paramType === "object") {
    if (typeof argType !== "object") return null;
    return matchType(paramType.listOf, argType.listOf);
  }
  if (isPrimitiveType(paramType)) {
    if (paramType === argType) return {};
    if (typeof argType === "object") return null;
    return isSubtype(argType, paramType) ? {} : null;
  }
  return { [paramType]: argType };
}

function matchSingle(
  param: TypePack | VariableAnnotation,
  arg: ConcreteAnnotation
): [ConcreteArityParameterMap, ConcreteTypeParameterMap] | null {
  if ("variableOf" in param) {
    if (!("variableOf" in arg)) return null;
    if (param.variableOf === "any") return [{}, {}];
    param = param.variableOf;
    arg = arg.variableOf;
  } else if ("variableOf" in arg) {
    arg = arg.variableOf;
  }

  const arityMap = matchArity(param.arity, arg.arity);
  const typeMap = matchType(param.type, arg.type);
  if (arityMap == null || typeMap == null) return null;
  return [arityMap, typeMap];
}

function updateArityMap(
  map: ConcreteArityParameterMap,
  update: ConcreteArityParameterMap
): boolean {
  for (const [parameter, assertion] of Object.entries(update)) {
    if (!(parameter in map)) {
      map[parameter] = assertion;
      continue;
    }
    const assumption = map[parameter];
    if (assumption !== assertion) return false;
  }
  return true;
}

function updateTypeMap(
  map: ConcreteTypeParameterMap,
  update: ConcreteTypeParameterMap
): boolean {
  for (const [parameter, assertion] of Object.entries(update)) {
    if (!(parameter in map)) {
      map[parameter] = assertion;
      continue;
    }

    const assumption = map[parameter];
    if (typeof assumption === "string") {
      if (typeof assertion === "object") return false;

      const lcs = lowestCommonSupertype(assumption, assertion);
      if (lcs == null) return false;
      map[parameter] = lcs;
    } else {
      if (typeof assertion === "string") return false;

      const _map = { T: assumption.listOf };
      if (!updateTypeMap(_map, { T: assertion.listOf })) return false;
      map[parameter] = { listOf: _map.T };
    }
  }
  return true;
}

export function matchesSignature(
  argTypes: (TypePack | VariableAnnotation | "new" | undefined)[],
  antType: TypePack | VariableAnnotation | undefined,
  signature: Signature
): boolean {
  if (argTypes.length !== signature.param.length) return false;

  const arityMap: ConcreteArityParameterMap = {};
  const typeMap: ConcreteTypeParameterMap = {};

  if (signature.antecedent != null) {
    if (antType == null) return false;
    if (!isConcreteAnnotation(antType)) return false;
    if (signature.antecedent !== "any") {
      const match = matchSingle(signature.antecedent, antType);
      if (match == null) return false;
      const [_arityMap, _typeMap] = match;
      if (!updateArityMap(arityMap, _arityMap)) return false;
      if (!updateTypeMap(typeMap, _typeMap)) return false;
    }
  }

  for (const [param, arg] of zip(signature.param, argTypes)) {
    if (param === "lazy") continue;
    if (arg == null) return false;

    if (param === "new") {
      if (arg === "new") continue;
      if ("variableOf" in arg) continue; // overwrite
      return false;
    }

    if (!isConcreteAnnotation(arg)) return false;
    if (param === "any") continue;

    const match = matchSingle(param, arg);
    if (match == null) return false;
    const [_arityMap, _typeMap] = match;
    if (!updateArityMap(arityMap, _arityMap)) return false;
    if (!updateTypeMap(typeMap, _typeMap)) return false;
  }

  return true;
}

/* ****************** OVERLOADING RESOLUTION ****************** */

type Condition<T> = {
  parameter: string;
  mustSubsume: T;
};

function isMoreSpecificType(
  a: TypePack["type"],
  b: TypePack["type"]
): boolean | Condition<TypePack["type"]> {
  if (typeof a !== "string" && typeof b !== "string") {
    return isMoreSpecificType(a.listOf, b.listOf);
  }
  if (typeof b !== "string") return false;
  if (isPrimitiveType(b)) {
    return typeof a === "string" && isPrimitiveType(a) && isSubtype(a, b);
  }

  return {
    parameter: b,
    mustSubsume: a,
  };
}
function isMoreSpecificArity(
  a: TypePack["arity"],
  b: TypePack["arity"]
): boolean | TypePack["arity"] {
  if (a === "n" && b === "n") return true;
  if (a === "n") return false;
  if (b === "n") return a;

  if (typeof a === "number" && typeof b === "number") return a === b;
  if (typeof b === "number") return false;
  if (typeof a === "number") return a >= b.atLeast;
  return a.atLeast >= b.atLeast;
}
function isMoreSpecificAnnotation(
  a: TypeAnnotation,
  b: TypeAnnotation
):
  | boolean
  | {
      arity?: TypePack["arity"];
      type?: Condition<TypePack["type"]>;
    } {
  if (a === "lazy" && b === "lazy") return true;
  if (a === "lazy" || b === "lazy") return false;
  if (a === "new") return true; // new is always more specific
  if (b === "new") return false;
  if (b === "any") return true; // any is always less specific (except new)
  if (a === "any") return false;

  if ("variableOf" in a && "variableOf" in b)
    return isMoreSpecificAnnotation(a.variableOf, b.variableOf);
  if ("variableOf" in b) return false;
  if ("variableOf" in a) return isMoreSpecificAnnotation(a.variableOf, b);

  const arity = isMoreSpecificArity(a.arity, b.arity);
  const type = isMoreSpecificType(a.type, b.type);
  if (arity === false || type === false) return false;
  if (arity === true && type === true) return true;
  return {
    arity: arity === true ? undefined : arity,
    type: type === true ? undefined : type,
  };
}

class ConcreteSubsumption {
  constructor(private type: ConcreteType) {}
  addIfPossible(type: ConcreteType): boolean {
    const supertype = lowestCommonSupertype(type, this.type);
    if (supertype == null) return false;
    this.type = supertype;
    return true;
  }
}
class ParametrizedSubsumption {
  private static decompose(
    type: TypePack["type"]
  ): [string | undefined, number] {
    if (typeof type === "string") {
      return [isPrimitiveType(type) ? undefined : type, 0];
    }
    const [parameter, listOfs] = ParametrizedSubsumption.decompose(type.listOf);
    return [parameter, listOfs + 1];
  }

  private parameter: string;
  private listOfs: number;
  constructor(type: TypePack["type"]) {
    const [parameter, listOfs] = ParametrizedSubsumption.decompose(type);
    if (parameter == null)
      throw new TypeError("Internal Error ParametrizedSubsumption");
    this.parameter = parameter;
    this.listOfs = listOfs;
  }
  addIfPossible(type: TypePack["type"]): boolean {
    const [parameter, listOfs] = ParametrizedSubsumption.decompose(type);
    return this.parameter === parameter && this.listOfs === listOfs;
  }
}
class Subsumption {
  isSatisfiable = true;
  private subsumption?: ConcreteSubsumption | ParametrizedSubsumption;

  private addConcreteIfPossible(subtype: ConcreteType): boolean {
    if (this.subsumption instanceof ParametrizedSubsumption) return false;
    if (this.subsumption == null) {
      this.subsumption = new ConcreteSubsumption(subtype);
      return true;
    }
    return this.subsumption.addIfPossible(subtype);
  }
  private addParametrizedIfPossible(subtype: TypePack["type"]): boolean {
    if (this.subsumption instanceof ConcreteSubsumption) return false;
    if (this.subsumption == null) {
      this.subsumption = new ParametrizedSubsumption(subtype);
      return true;
    }
    return this.subsumption.addIfPossible(subtype);
  }
  private addIfPossible(subtype: TypePack["type"]): boolean {
    if (isConcreteType(subtype)) return this.addConcreteIfPossible(subtype);
    return this.addParametrizedIfPossible(subtype);
  }
  add(subtype: TypePack["type"]) {
    this.isSatisfiable = this.isSatisfiable && this.addIfPossible(subtype);
  }
}

class Range {
  constructor(private lower?: number, private upper?: number) {}
  updateLower(lower: number) {
    this.lower = nullAccepting(Math.max)(this.lower, lower);
  }
  updateUpper(upper: number) {
    this.upper = nullAccepting(Math.min)(this.upper, upper);
  }
  isEmpty(): boolean {
    return this.lower != null && this.upper != null && this.lower > this.upper;
  }
}

export function isMoreSpecificSignature(a: Signature, b: Signature): boolean {
  if (a.param.length !== b.param.length) return false;

  const arityRange = new Range();
  const typeSubsumption = new DefaultMap(() => new Subsumption());

  for (const [_a, _b] of zip(
    a.param.concat([a.antecedent ?? "any"]),
    b.param.concat([b.antecedent ?? "any"])
  )) {
    const _comparison = isMoreSpecificAnnotation(_a, _b);
    if (_comparison === false) return false;
    if (_comparison === true) continue;

    if (_comparison.arity) {
      if (_comparison.arity === "n")
        throw new TypeError("Internal Error isMoreSpecificSignatureThan");
      if (typeof _comparison.arity === "number") {
        arityRange.updateLower(_comparison.arity);
        arityRange.updateUpper(_comparison.arity);
      } else {
        arityRange.updateLower(_comparison.arity.atLeast);
      }
      if (arityRange.isEmpty()) return false;
    }

    if (_comparison.type) {
      const subsumption = typeSubsumption.get(_comparison.type.parameter);
      subsumption.add(_comparison.type.mustSubsume);
      if (!subsumption.isSatisfiable) return false;
    }
  }
  return true;
}
