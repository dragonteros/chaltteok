import { ParseError, POS } from "./analyzer";
import {
  Term,
  Processor,
  ValuePack,
  Value,
  TermType,
  Overloading,
  TypeAnnotation,
  AST,
} from "./ast";
import { Pattern } from "./pattern";
import { fromAbbr } from "./utils.js";

export function equal(x: Value, y: Value): boolean {
  return x === y; // TODO
}

const pure = function (g: (...args: ValuePack[]) => ValuePack): Processor {
  return (_, f) =>
    (...args: AST[]) =>
      g(...args.map(f));
};
const id: Processor = (_, f) => f;
const logicalAnd: Processor = pure(([a], [b]) => [a && b]);

type PatternMap = { [x: string]: Processor };
const _BUILTIN_PATTERN: PatternMap = {
  "{1 T}n 가p {1 T}n 이다p -> {1 참거짓}a": pure(([a], [b]) => [equal(a, b)]),
  "{1 T}n 가p {1 T}n 과p 같다v -> {1 참거짓}a": pure(([a], [b]) => [
    equal(a, b),
  ]),
  "{2+ T}n 가p 모두 같다v -> {1 참거짓}a": pure((...args) => [
    args.slice(1).every((x) => equal(x[0], args[0][0])),
  ]),

  "{1 수}d 값n -> {1 수}n": id,

  // "앞n 의p 것n -> {???}n": id,
  // "앞n 의p {1 타입}n -> {???}n": id,
  // "뒤n 의p 것n -> {???}n": id,
  // "뒤n 의p {1 타입}n -> {???}n": id,

  "{n T}d 것n -> {n T}n": id,
  "{n T}n 의p -> {n T}d": id,

  "{n T}v -(으)ㄴ다/-는다e -> {n T}v": id,
  "{n T}v -(으)ㅁe -> {n T}n": id,
  "{n T}a -(으)ㅁe -> {n T}n": id,
  "{n T}v -기e -> {n T}n": id,
  "{n T}a -기e -> {n T}n": id,
  "{n T}v -다e -> {n T}v": id,
  "{n T}a -다e -> {n T}a": id,
  "{n T}v -자e -> {n T}v": id,

  "{1 참거짓} {1 참거짓}a -> {1 참거짓}a": logicalAnd,
  "{1 참거짓} {1 참거짓}v -> {1 참거짓}v": logicalAnd,
  "{} {n T}v -> {n T}v": pure((_, arg) => arg),
};
export function _parseTermType(chunk: string): TermType {
  chunk = chunk.trim();
  if (chunk === "") return { arity: 0, type: "" };
  const match = chunk.match(/^(\S+) (\S+)( 변수)?$/);
  if (match == null)
    throw new ParseError("Internal Error _parseTermType::ILLEGAL_FORMAT");
  const [_, _arity, _type, variable] = match;
  const at_least = parseInt(_arity);
  const arity =
    _arity === "n" ? "n" : _arity.slice(-1) === "+" ? { at_least } : at_least;
  const type = (function f(t: string): TypeAnnotation {
    return t.slice(-2) === "[]" ? { listOf: f(t.slice(0, -2)) } : t;
  })(_type);
  return { arity, type, variable: variable != null };
}
function _parseTerm(chunk: string): [Term, TermType | null] {
  const _token = fromAbbr(chunk.trim());
  if (_token.type === "symbol")
    throw new ParseError("Internal Error _parseTerm::ILLEGAL_FORMAT");
  const lemma = _token.lemma;
  const pos: POS = _token.pos;
  if (lemma[0] !== "{")
    return [{ type: "simple", token: { type: "word", lemma, pos }, pos }, null];
  return [{ type: "generic", pos }, _parseTermType(lemma.slice(1, -1))];
}

function _parsePattern(pattern: string, processor: Processor): Pattern {
  const [input, output] = pattern.split("->", 2);
  const terms = input.match(/\{[^{}]*?\}\w?|[^{}\s]+/g);
  if (!terms)
    throw new ParseError("Internal Error _parsePattern::ILLEGAL_FORMAT");
  const inputs = terms.map(_parseTerm);
  const inputTerms = inputs.map((x) => x[0]);
  const inputTypes = inputs
    .map((x) => x[1])
    .filter((x): x is TermType => x != null);
  const [outputTerm, outputType] = _parseTerm(output.trim());
  if (outputType == null)
    throw new ParseError("Internal Error _parsePattern::OUTPUT_TERM_NO_TYPE");
  const overloading: Overloading = {
    input: inputTypes,
    output: outputType,
    register: [null, null],
    processor,
  };
  return new Pattern(inputTerms, outputTerm, overloading);
}

export const BUILTIN_PATTERNS = Object.entries(_BUILTIN_PATTERN).map(
  ([pattern, proc]) => _parsePattern(pattern, proc)
);
