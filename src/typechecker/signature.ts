/* ****************** SIGNATURE MATCHING ****************** */

import {
  ConcreteAnnotation,
  ConcreteType,
  isConcreteAnnotation,
  isPrimitiveType,
  isSubtype,
  lowestCommonSupertype,
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../finegrained/types";
import { zip } from "../utils/utils";

import { InternalError } from "../base/errors";
import { ConcretePack } from "../finegrained/types";
import { NewBox, RefBox, StrictValuePack, Value } from "../finegrained/values";

export type Signature = {
  param: TypeAnnotation[];
  antecedent?: TypePack | VariableAnnotation | "any";
};

type ConcreteArityParameterMap = Record<string, number>;
export type ConcreteTypeParameterMap = Record<string, ConcreteType>;
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
export function updateTypeMap(
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

export function getType(values: Value[]): ConcretePack;
export function getType(values: NewBox): "new";
export function getType(values: RefBox): { variableOf: ConcretePack };
export function getType(values: StrictValuePack): ConcreteAnnotation | "new" {
  const err = new InternalError("getType");
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
