/* ****************** OVERLOADING RESOLUTION ****************** */

import { InternalError } from "../base/errors";
import {
  ConcreteType,
  isConcreteType,
  isPrimitiveType,
  isSubtype,
  lowestCommonSupertype,
  TypeAnnotation,
  TypePack,
} from "../finegrained/types";
import { DefaultMap, nullAccepting, zip } from "../utils/utils";
import { Signature } from "./signature";

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
    if (parameter == null) throw new InternalError("ParametrizedSubsumption");
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
        throw new InternalError("isMoreSpecificSignatureThan");
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
