/* ****************** PATTERN DEFINITION PARSING ****************** */
import { ChaltteokSyntaxError, InternalError } from "../base/errors";
import { SourceMetadata } from "../base/metadata";
import { TypeAnnotation, TypePack } from "../finegrained/types";

function mergeArity(
  metadata: SourceMetadata,
  a: TypePack["arity"],
  b: TypePack["arity"]
): TypePack["arity"] {
  const err = new ChaltteokSyntaxError(
    "패턴의 인수 개수 정의가 모순됩니다.",
    metadata
  );
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

function mergeType(
  metadata: SourceMetadata,
  a: TypePack["type"],
  b: TypePack["type"]
): TypePack["type"] {
  const err = new ChaltteokSyntaxError(
    "패턴의 인수 타입 정의가 모순됩니다.",
    metadata
  );
  if (typeof a === "object" && typeof b === "object") {
    return mergeType(metadata, a.listOf, b.listOf);
  } else if (a === b) return a;
  throw err;
}

export function mergeParamTypes(
  metadata: SourceMetadata,
  old: TypeAnnotation,
  update?: TypeAnnotation
): TypeAnnotation {
  const notImplemented = new InternalError("mergeParamTypes::NOT_IMPLEMENTED");
  const err = new ChaltteokSyntaxError(
    "패턴의 인수 개수 및 타입 정의가 모순됩니다.",
    metadata
  );
  if (update == null) return old;

  if (old === "new") throw notImplemented;
  if (update === "new") return "new";

  if (old === "lazy") throw notImplemented;
  if (update === "lazy") return "lazy";

  if (old === "any") return update;
  if (update === "any") throw err;

  if ("variableOf" in old && "variableOf" in update) {
    const merged = mergeParamTypes(metadata, old.variableOf, update.variableOf);
    if (typeof merged === "string" || "variableOf" in merged) throw err;
    return { variableOf: merged };
  }
  if ("variableOf" in old || "variableOf" in update) throw err;

  return {
    arity: mergeArity(metadata, old.arity, update.arity),
    type: mergeType(metadata, old.type, update.type),
  };
}
