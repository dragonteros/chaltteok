import { ParseError, POS } from "./analyzer";
import { Tree, Term, Processor, ValuePack, Value } from "./ast";
import { Pattern } from "./pattern";
import { fromAbbr } from "./utils.js";

export function equal(x: Value, y: Value): boolean {
  return x === y; // TODO
}

const pure = function (g: (...args: ValuePack[]) => ValuePack): Processor {
  return (_, f) =>
    (...args: Tree[]) =>
      g(...args.map(f));
};
const id: Processor = (_, f) => f;
const logicalAnd: Processor = pure(([a], [b]) => [a && b]);

const until: Processor = (_, f) =>
  function (condition, action) {
    while (!f(condition)[0]) f(action);
    return [];
  };

type PatternMap = { [x: string]: Processor };
const BUILTIN_PATTERN: PatternMap = {
  "{1 T}n 가p {1 T}n 이다p -> {1 참거짓}a": pure(([a], [b]) => [equal(a, b)]),
  "{1 T}n 가p {1 T}n 과p 같다v -> {1 참거짓}a": pure(([a], [b]) => [
    equal(a, b),
  ]),
  "{2+ T}n 가p 모두 같다v -> {1 참거짓}a": pure((...args) => [
    args.slice(1).every((x) => equal(x[0], args[0][0])),
  ]),

  "{1 수}d 값n -> {1 수}n": id,
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

  "{1 참거짓}a -(으)ㄹe 때n 까지p {n T}v -(으)ㄴ다/-는다e -> {}v": until,
  "{1 참거짓}a -(으)ㄹe 때n 까지p {n T}v -다e -> {}v": until,
  "{1 참거짓}a -(으)ㄹe 때n 까지p {n T}v -자e -> {}v": until,
  "{1 참거짓}a -(으)ㄹe 때n 까지p {n T}n 을p 거듭하다v -> {}v": until,

  "{1 참거짓} {1 참거짓}a -> {1 참거짓}a": logicalAnd,
  "{1 참거짓} {1 참거짓}v -> {1 참거짓}v": logicalAnd,
  "{} {n T}v -> {n T}v": id,
};
function _parseTerm(chunk: string): Term {
  const _token = fromAbbr(chunk);
  if (_token.type === "symbol")
    throw new ParseError("Internal Error _parseTerm::ILLEGAL_FORMAT");
  const lemma = _token.lemma;
  const pos: POS = _token.pos;
  if (lemma.includes("{")) return { type: "generic", pos };
  return { type: "simple", token: { type: "word", lemma, pos }, pos };
}

function _parsePattern(pattern: string): Pattern {
  const [input, output] = pattern.split("->", 2);
  const terms = input.match(/\{[^{}]*?\}\w?|[^{}\s]+/g);
  if (!terms)
    throw new ParseError("Internal Error _parsePattern::ILLEGAL_FORMAT");
  const inputTerms = terms.map(_parseTerm);
  const outputTerm = _parseTerm(output.trim());
  return new Pattern(inputTerms, outputTerm);
}

export const BUILTIN_PATTERNS = Object.keys(BUILTIN_PATTERN).map(_parsePattern);
