import { InternalError } from "../base/errors";
import { Processor } from "../finegrained/procedure";
import { ConcreteTerm, GenericTerm, parseTermKey } from "../finegrained/terms";
import { PRIMITIVE_TYPES, TypeAnnotation } from "../finegrained/types";
import {
  assertStrict,
  getConcreteValues,
  Thunk,
  Value,
} from "../finegrained/values";
import { parseTypeAnnotation, Pattern } from "../parser/pattern";
import { Signature } from "../typechecker/signature";
import { zip } from "../utils/utils";

export function equal(x: Value, y: Value): boolean {
  if (typeof x === "boolean" && typeof y === "boolean") return x === y;
  if (typeof x !== "object" || typeof y !== "object") return false;

  if (x.type === "열" && y.type === "열") {
    if (x.data.length !== y.data.length) return false;
    return zip(x.data, y.data).every(([a, b]) => equal(a, b));
  }
  if ("값" in x && "값" in y) return x.값 === y.값;
  return false;
}

const pure = function (g: (...args: Value[][]) => Value[]): Processor {
  return (env) => () => g(...env.args.map(assertStrict).map(getConcreteValues));
};
const id: Processor = (env) => () => env.args[0];
const seq: Processor = (env) => () => {
  const [x, y] = env.args;
  if (y instanceof Thunk) y.antecedent = assertStrict(x) as any;
  return y;
};

export type Action =
  | { type: "FunCall"; fun: Processor }
  | { type: "ArgRef"; index: number };

const _BUILTIN_PATTERN: Record<string, Action> = {
  "{1 T}[명사] 가[조사] {1 T}[명사] 이다[조사] -> {}[형용사]": {
    type: "FunCall",
    fun: pure(([a], [b]) => [equal(a, b)]),
  },
  "{1 T}[명사] 가[조사] {1 T}[명사] 과[조사] 같다[형용사] -> {}[형용사]": {
    type: "FunCall",
    fun: pure(([a], [b]) => [equal(a, b)]),
  },
  "{2+ T}[명사] 가[조사] 모두[부사] 같다[형용사] -> {}[형용사]": {
    type: "FunCall",
    fun: pure((...args) => [
      args.slice(1).every((x) => equal(x[0], args[0][0])),
    ]),
  },

  "앞[명사] 의[조사] 것[명사] -> {}[명사]": { type: "ArgRef", index: 0 },
  "뒤[명사] 의[조사] 것[명사] -> {}[명사]": { type: "ArgRef", index: 1 },

  "{any}[동사] -(으)ㄴ다/-는다[어미] -> {}[동사]": { type: "FunCall", fun: id },
  "{any}[동사] -다[어미] -> {}[동사]": { type: "FunCall", fun: id },
  "{any}[형용사] -다[어미] -> {}[형용사]": { type: "FunCall", fun: id },
  "{any}[동사] -자[어미] -> {}[동사]": { type: "FunCall", fun: id },
  "{any}[동사] -(아/어)[어미] {lazy}[동사] -> {}[동사]": {
    type: "FunCall",
    fun: seq,
  },
  "{any}[동사] -(아/어)[어미] {lazy}x[동사] -> {}[동사]": {
    type: "FunCall",
    fun: seq,
  },
};
const _BUILTIN_GENERIC_PATTERN = Object.entries({
  "해당[관형사] T[명사] -> {}[명사]": 0,
  "앞[명사] 의[조사] T[명사] -> {}[명사]": 0,
  "뒤[명사] 의[조사] T[명사] -> {}[명사]": 1,
  "2[고유어수관형사] T[명사] -> {}[명사]": 0,
  "3[고유어수관형사] T[명사] -> {}[명사]": 0,
  "4[고유어수관형사] T[명사] -> {인수0}[명사]": 0,
}).flatMap(([x, index]) =>
  PRIMITIVE_TYPES.map((T): [string, Action] => [
    x.replaceAll("T", T),
    { type: "ArgRef", index },
  ])
);

function _parseTerm(
  chunk: string
): [ConcreteTerm, null] | [GenericTerm, TypeAnnotation] {
  const [term, annotation] = parseTermKey(chunk);
  if ("hasOmit" in term) return [term, parseTypeAnnotation(annotation)];
  return [term, null];
}

function _parsePattern(pattern: string): [Pattern, Signature] {
  const [input, output] = pattern.split("->", 2);
  const terms = input.match(/[^\]]+\]/g);
  if (!terms) throw new InternalError("_parsePattern::ILLEGAL_FORMAT");
  const inputs = terms.map(_parseTerm);
  const inputTerms = inputs.map((x) => x[0]);
  const param = inputs
    .map((x) => x[1])
    .filter((x): x is TypeAnnotation => x != null);
  const [outputTerm] = _parseTerm(output.trim());
  return [new Pattern(inputTerms, outputTerm), { param }];
}

export const BUILTIN_PATTERNS = Object.entries(_BUILTIN_PATTERN)
  .concat(_BUILTIN_GENERIC_PATTERN)
  .map(([pattern, blueprint]): [Pattern, Signature, Action] => [
    ..._parsePattern(pattern),
    blueprint,
  ]);
