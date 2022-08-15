import { POS, SyntaxError } from "./lexer/tokens";
import { ArgumentTerm, GenericTerm, SimpleTerm } from "./parser/ast";
import { Pattern } from "./parser/pattern";
import {
  assertStrict,
  getConcreteValues,
  Processor,
  Signature,
  Type,
  TypeAnnotation,
  TypePack,
  Value,
} from "./runner/values";
import { fromAbbr, zip } from "./utils/utils.js";

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

const _BUILTIN_PATTERN: Record<string, Processor | null> = {
  "{1 T}n 가p {1 T}n 이다p -> {}a": pure(([a], [b]) => [equal(a, b)]),
  "{1 T}n 가p {1 T}n 과p 같다a -> {}a": pure(([a], [b]) => [equal(a, b)]),
  "{2+ T}n 가p 모두 같다a -> {}a": pure((...args) => [
    args.slice(1).every((x) => equal(x[0], args[0][0])),
  ]),

  "해당d 수n -> {인수0}n": null,
  "해당d 정수n -> {인수0}n": null,

  "앞n 의p 것n -> {인수0}n": null,
  "앞n 의p 수n -> {인수0}n": null,
  "앞n 의p 정수n -> {인수0}n": null,
  "전자n -> {인수0}n": null,

  "뒤n 의p 것n -> {인수1}n": null,
  "뒤n 의p 수n -> {인수1}n": null,
  "뒤n 의p 정수n -> {인수1}n": null,
  "후자n -> {인수1}n": null,

  "{any}v -(으)ㄴ다/-는다e -> {}v": id,
  "{any}v -다e -> {}v": id,
  "{any}a -다e -> {}a": id,
  "{any}v -자e -> {}v": id,
};

export function parseTypeAnnotation(chunk: string): TypeAnnotation {
  chunk = chunk.trim();
  if (chunk === "") return { arity: 0, type: "" };
  if (chunk === "new" || chunk === "any" || chunk === "lazy") return chunk;

  const match = chunk.match(/^(\S+) (\S+)( 변수)?$/);
  if (match == null)
    throw new SyntaxError("Internal Error _parseTermType::ILLEGAL_FORMAT");
  const [, _arity, _type, _variable] = match;
  const atLeast = parseInt(_arity);
  const arity =
    _arity === "n" ? "n" : _arity.slice(-1) === "+" ? { atLeast } : atLeast;
  const type = (function f(t: string): Type {
    return t.slice(-2) === "[]" ? { listOf: f(t.slice(0, -2)) } : t;
  })(_type);
  const annotation: TypePack = { arity, type };
  if (_variable) return { variableOf: annotation };
  return annotation;
}

function _parseTerm(
  chunk: string
): [SimpleTerm | ArgumentTerm, null] | [GenericTerm, TypeAnnotation] {
  const _token = fromAbbr(chunk.trim());
  if (_token.type === "symbol")
    throw new SyntaxError("Internal Error _parseTerm::ILLEGAL_FORMAT");
  const lemma = _token.lemma;
  const pos: POS = _token.pos;
  if (lemma[0] !== "{") {
    return [{ pos, token: { type: "word", lemma, pos } }, null];
  }
  if (lemma.slice(0, 3) === "{인수") {
    const index = Number(lemma.slice(3, -1));
    return [{ pos, index }, null];
  }
  return [{ pos }, parseTypeAnnotation(lemma.slice(1, -1))];
}

function _parsePattern(pattern: string): [Pattern, Signature] {
  const [input, output] = pattern.split("->", 2);
  const terms = input.match(/\{[^{}]*?\}\w?|[^{}\s]+/g);
  if (!terms)
    throw new SyntaxError("Internal Error _parsePattern::ILLEGAL_FORMAT");
  const inputs = terms.map(_parseTerm);
  const inputTerms = inputs.map((x) => x[0]);
  const param = inputs
    .map((x) => x[1])
    .filter((x): x is TypeAnnotation => x != null);
  const [outputTerm] = _parseTerm(output.trim());
  return [new Pattern(inputTerms, outputTerm), { param }];
}

export const BUILTIN_PATTERNS = Object.entries(_BUILTIN_PATTERN).map(
  ([pattern, proc]): [Pattern, Signature, Processor | null] => [
    ..._parsePattern(pattern),
    proc,
  ]
);
