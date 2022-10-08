import moo from "moo";
import { ChaltteokSyntaxError, InternalError } from "../base/errors";
import { mergeMetadata, SourceMetadata, WithMetadata } from "../base/metadata";
import { POS } from "../base/pos";
import { Protocol } from "../finegrained/procedure";
import { getKeyFromTerm, parseTermKey, Term } from "../finegrained/terms";
import { getKeyFromToken, Token, WordToken } from "../finegrained/tokens";
import { Type, TypeAnnotation } from "../finegrained/types";
import { Signature } from "../typechecker/signature";
import { equalWord } from "./matcher";
import { mergeParamTypes } from "./typemerger";

export class Pattern {
  key: string;
  constructor(
    readonly input: Term[],
    readonly output: Term,
    readonly definition: SourceMetadata
  ) {
    this.input = input;
    this.output = output;
    this.key = input.map(getKeyFromTerm).join(" ");
  }
}

const 이다: WordToken = { type: "word", lemma: "이다", pos: "조사" };

function _allCombinations<T>(cases: (T | null)[][]): T[][] {
  function _cleanse(tokens: (T | null)[]): T[] {
    return tokens.filter((x): x is T => x != null);
  }
  if (cases.length <= 1) return cases[0].map((x) => [x]).map(_cleanse);
  const heads = cases[0];
  const tails = _allCombinations(cases.slice(1));
  const combinations = [];
  for (const head of heads)
    for (const tail of tails) combinations.push([head].concat(tail));
  return combinations.map(_cleanse);
}

function _swapped<T>(arr: T[], i: number, j: number): T[] {
  const _arr = arr.slice();
  _arr[i] = arr[j];
  _arr[j] = arr[i];
  return _arr;
}

function _sameTerms(a: Term, b: Term): boolean {
  if (!("token" in a && "token" in b)) return false;
  if (a.pos !== b.pos) return false;
  return (a.token as WordToken).lemma === (b.token as WordToken).lemma;
}

/**
 * Permutes (and omits) the arguments in the input pattern.
 * For example, given 얼마를 얼마로 나누다 as the input pattern,
 * it lists up the variant patterns [얼마로 얼마를 나누다, 얼마로 나누다, 얼마를 나누다].
 *
 * Note that the original pattern should not require the antecedent.
 */
export function getPermutedPatterns(pattern: Pattern): [Pattern, Protocol][] {
  const genericIdx = pattern.input
    .map((term, i) => ("token" in term ? null : i))
    .filter((i): i is number => i != null); // idx among terms
  const swapIdx = genericIdx
    .map((_, j) => j)
    .filter((j) => {
      const i = genericIdx[j];
      if (i + 1 >= pattern.input.length) return false;
      const suffix = pattern.input[i + 1];
      if (!("token" in suffix)) return false;
      if (suffix.pos !== "조사") return false;
      if (suffix.token.type !== "word") return false;
      if (["이다"].includes(suffix.token.lemma)) return false;
      return true;
    }); // idx among arguments
  const results: [Pattern, Protocol][] = [];
  if (swapIdx.length !== 2) return results;
  if (
    _sameTerms(
      pattern.input[genericIdx[swapIdx[0]] + 1],
      pattern.input[genericIdx[swapIdx[1]] + 1]
    )
  )
    return results;

  const range = genericIdx.map((_, i) => i);

  const terms = _swapped(
    pattern.input,
    genericIdx[swapIdx[0]] + 1,
    genericIdx[swapIdx[1]] + 1
  );
  const argPerm = _swapped(range, swapIdx[0], swapIdx[1]);
  results.push([
    new Pattern(
      terms,
      { pos: pattern.output.pos, hasOmit: false },
      pattern.definition
    ),
    { arguments: argPerm },
  ]);

  for (const k of swapIdx) {
    const terms = pattern.input.slice();
    terms.splice(genericIdx[k], 2);
    const argPerm: (number | null)[] = range.slice(0, -1);
    argPerm.splice(k, 0, null);

    results.push([
      new Pattern(
        terms,
        { pos: pattern.output.pos, hasOmit: true },
        pattern.definition
      ),
      { arguments: argPerm },
    ]);
  }
  return results;
}

/* 갓 해석된 패턴 -> 패턴의 내부 표현 */

export function parseTypeAnnotation(chunk: string): TypeAnnotation {
  const err = new InternalError("parseTypeAnnotation::ILLEGAL_FORMAT " + chunk);
  chunk = chunk.trim();
  if (chunk === "") return { arity: 0, type: "" };
  if (chunk === "new" || chunk === "any" || chunk === "lazy") return chunk;
  if (chunk.endsWith("변수")) {
    const variableOf = parseTypeAnnotation(chunk.slice(0, -2));
    if (variableOf === "new" || variableOf === "lazy") throw err;
    if (typeof variableOf !== "string" && "variableOf" in variableOf) throw err;
    return { variableOf };
  }

  const match = chunk.match(/^(\S+)\s+(\S+)$/);
  if (match == null) throw err;
  const [, _arity, _type] = match;
  const atLeast = parseInt(_arity);
  const arity =
    _arity === "n" ? "n" : _arity.slice(-1) === "+" ? { atLeast } : atLeast;
  const type = (function f(t: string): Type {
    return t.slice(-2) === "[]" ? { listOf: f(t.slice(0, -2)) } : t;
  })(_type);
  return { arity, type };
}

/* 패턴 정의문 해석 */
function getLemma(matched: string, index: number): string {
  const tokens = matched.split("]");
  return tokens[index].split("[", 2)[0];
}
const PATTERN_PREPROCESS_RULES: moo.Rules = {
  SIMPLE: [
    { match: "무엇[명사] ", value: () => "{any}[명사]" },
    { match: "몇[명사] ", value: () => "{1 정수}[명사]" }, // TODO: 순우리말만 매칭
    { match: "몇[관형사] ", value: () => "{1 정수}[관형사]" }, // TODO: 순우리말만 매칭
    { match: "어찌하다[동사] ", value: () => "{any}[동사]" },
    { match: "어떠하다[형용사] ", value: () => "{1 참거짓}[형용사]" },
    {
      match: "어찌/어떠하다[형용사] ",
      value: () => "{any}[동사],{any}[형용사]",
    },
  ],
  VARIABLE: [
    {
      match: "어느[관형사] 변수[명사] ",
      value: () => "{any 변수}[명사]",
    },
    {
      match: /어느\[관형사\] [^ []+?\[명사\] 변수\[명사\] /,
      value: (x) => `{1 ${getLemma(x, 1)} 변수}[명사]`,
    },
    {
      match: /여러\[관형사\] [^ []+?\[명사\] 변수\[명사\] /,
      value: (x) => `{2+ ${getLemma(x, 1)} 변수}[명사]`,
    },
  ],
  CONSTANT: [
    {
      match: /어느\[관형사\] [^ []+\[명사\] /,
      value: (x) => `{1 ${getLemma(x, 1)}}[명사]`,
    },
    {
      match: /여러\[관형사\] [^ []+\[명사\] /,
      value: (x) => `{2+ ${getLemma(x, 1)}}[명사]`,
    },
  ],
  ARITY: [
    // {
    //   match: /\d+\[순우리말수관형사\] [^ []+\[명사\] 변수\[명사\] /,
    //   value: (x) => `{${getLemma(x, 0)} ${getLemma(x, 1)} 변수}[명사]`,
    // },
    {
      match: /\d+\[순우리말수관형사\] [^ []+\[명사\] /,
      value: (x) => `{${getLemma(x, 0)} ${getLemma(x, 1)}}[명사]`,
    },
  ],
  OTHER: [
    { match: "의/[조사] ", value: () => ",의[조사]" },
    { match: /-다\[어미\] $/, value: () => "" },
  ],
  DEFAULT: /[^\]]+\] /,
};
function preprocessPattern(key: string): string[][] {
  const processor = moo.compile(PATTERN_PREPROCESS_RULES);
  processor.reset(key + " ");

  const processed: string[][] = [];
  for (const token of processor) {
    if (token.value === "") continue;
    processed.push(token.value.trim().split(","));
  }
  return processed;
}

export function parsePattern(
  tokens: WithMetadata<Token>[],
  signature?: Signature,
  pos?: POS,
  isJS = false
): [Pattern[], Signature] {
  const metadata: SourceMetadata = mergeMetadata(
    ...tokens.map((token) => token.metadata)
  );

  const chunks = preprocessPattern(
    tokens
      .map((token) => token.value)
      .map(getKeyFromToken)
      .join(" ")
  );
  const terms: (Term | null)[][] = chunks.map((chunk) =>
    chunk.map((x) => (x === "" ? null : parseTermKey(x)[0]))
  );
  const termTypes: TypeAnnotation[] = chunks
    .map(([x]) => x && parseTermKey(x)[1])
    .filter((x) => x !== "")
    .map(parseTypeAnnotation);
  if (!isJS && termTypes.length > 2) {
    throw new ChaltteokSyntaxError(
      "인수가 셋 이상인 함수는 아직 지원되지 않습니다.",
      metadata
    );
  }

  const patterns = _allCombinations(terms).map(function (terms) {
    const lastTerm = terms[terms.length - 1];
    let _pos = pos || lastTerm.pos;
    if ("token" in lastTerm && equalWord(lastTerm.token, 이다)) _pos = "형용사";

    return new Pattern(terms, { pos: _pos, hasOmit: false }, metadata);
  });

  const param: TypeAnnotation[] = termTypes.map((x, i) =>
    mergeParamTypes(metadata, x, signature?.param[i])
  );
  const _signature: Signature = { param, antecedent: signature?.antecedent };

  return [patterns, _signature];
}
