import moo from "moo";
import { ChaltteokSyntaxError, InternalError } from "../base/errors";
import { mergeMetadata, SourceMetadata, WithMetadata } from "../base/metadata";
import { POS } from "../base/pos";
import { Protocol } from "../finegrained/procedure";
import { getKeyFromTerm, parseTermKey, Term, Tree } from "../finegrained/terms";
import { getKeyFromToken, Token, WordToken } from "../finegrained/tokens";
import {
  Type,
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../finegrained/types";
import { Signature } from "../typechecker/signature";
import { zip } from "../utils/utils.js";
import { mergeParamTypes } from "./typemerger";
import { IndexedPatterns, PatternArray } from "./utils";

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
  if (cases.length <= 1) return cases.map(_cleanse);
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

export function deriveSignature(
  original: Signature,
  protocol: Protocol
): Signature | null {
  if (original.antecedent) return null;

  const param: TypeAnnotation[] = [];
  let antecedent: TypePack | VariableAnnotation | "any" | undefined = undefined;
  for (const [actual, virtual] of protocol.arguments.entries()) {
    if (virtual != null) param[virtual] = original.param[actual];
    else {
      const _antecedent = original.param[actual];
      if (_antecedent === "new") return null;
      if (_antecedent === "lazy") antecedent = "any";
      else antecedent = _antecedent;
    }
  }
  return { param, antecedent: antecedent };
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
    { match: "무엇[명사] ", value: (x) => "{any}[명사]" },
    { match: "몇[명사] ", value: (x) => "{1 정수}[순우리말수사]" },
    { match: "몇[관형사] ", value: (x) => "{1 정수}[순우리말수관형사]" },
    { match: "어찌하다[동사] ", value: (x) => "{any}[동사]" },
    { match: "어떠하다[형용사] ", value: (x) => "{1 참거짓}[형용사]" },
    {
      match: "어찌/어떠하다[형용사] ",
      value: (x) => "{any}[동사],{any}[형용사]",
    },
  ],
  VARIABLE: [
    {
      match: "어느[관형사] 변수[명사] ",
      value: (x) => "{any 변수}[명사]",
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
    {
      match: /\d+\[순우리말수관형사\] [^ []+\[명사\] 변수\[명사\] /,
      value: (x) => `{${getLemma(x, 0)} ${getLemma(x, 1)} 변수}[명사]`,
    },
    {
      match: /\d+\[순우리말수관형사\] [^ []+\[명사\] /,
      value: (x) => `{${getLemma(x, 0)} ${getLemma(x, 1)}}[명사]`,
    },
  ],
  OTHER: [
    { match: "의/[조사] ", value: (x) => ",의[조사]" },
    { match: /-다\[어미\] $/, value: (x) => "" },
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
  pos?: POS
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

export function equalWord(word1: Token, word2: Token): boolean {
  return getKeyFromToken(word1) === getKeyFromToken(word2);
}

function _matches(tree: Tree, term: Term): boolean {
  const head = tree.head.value;
  if (term.pos !== head.pos) return false;
  if ("token" in term) {
    return "token" in head && equalWord(head.token, term.token);
  }
  // term is GenericTerm
  if ("hasOmit" in head) return head.hasOmit === term.hasOmit;

  if (head.token.type === "id") return true;
  if (head.token.type === "number" && !head.token.native) return true;
  return false;
}

const 과: WordToken = { type: "word", lemma: "과", pos: "조사" };

function _is과(tree: Tree) {
  const term = tree.head.value;
  return "token" in term && equalWord(term.token, 과);
}

function _matchAnd(trees: Tree[], i: number): [number, number, Tree[]] | null {
  const focus = trees[i];
  if (focus.key === "~과~") return null;

  if (_is과(focus)) {
    if (i <= 0 || i >= trees.length - 1) return null;
    const before = _matchAnd(trees.slice(0, i), i - 1);
    if (before == null) return null;
    const after = _matchAnd(trees.slice(i + 1), 0);
    if (after == null) return null;
    return [before[0], after[1] + (i + 1), before[2].concat(after[2])];
  }
  if (!_matches(focus, { pos: "명사", hasOmit: false })) return null;

  const 과before = i >= 2 && _is과(trees[i - 1]);
  const 과after = i < trees.length - 2 && _is과(trees[i + 1]);
  const before = 과before ? _matchAnd(trees.slice(0, i - 1), i - 2) : null;
  const after = 과after ? _matchAnd(trees.slice(i + 2), 0) : null;
  if (before == null && after == null) return [i, i + 1, [focus]];
  const bgn = before ? before[0] : i;
  const end = after ? after[1] + (i + 2) : i + 1;
  const children = (before ? before[2] : [])
    .concat([focus])
    .concat(after ? after[2] : []);
  return [bgn, end, children];
}

function getKeysFromTerm(x: Term): string[] {
  const keys: string[] = [getKeyFromTerm(x)];
  if ("token" in x) {
    if (x.token.type === "number" || x.token.type === "id") {
      keys.push(getKeyFromTerm({ pos: x.pos, hasOmit: false }));
    }
  }
  return keys;
}

function _matchPattern(
  trees: Tree[],
  candidates: PatternArray,
  i: number
): [number, number, Tree] | null {
  const metadata: SourceMetadata = mergeMetadata(
    ...trees.map((tree) => tree.head.metadata)
  );

  for (const [precededBy, followedBy, patterns] of candidates.enumerate()) {
    const [bgn, end] = [i - precededBy, i + 1 + followedBy];
    const target = trees.slice(bgn, end) as Tree[];
    const outputs: Record<string, [WithMetadata<Term>, Tree[]]> = {};
    for (const pattern of patterns) {
      const input = pattern.input;
      if (!zip(target, input).every((pair) => _matches(...pair))) continue;

      const children: Tree[] = [];
      for (let i = 0; i < target.length; i++) {
        if (!("token" in input[i])) children.push(target[i]);
      }

      if (!(pattern.key in outputs)) {
        const head = { metadata, value: pattern.output };
        outputs[pattern.key] = [head, children];
      } else {
        const a = pattern.output.pos;
        const b = outputs[pattern.key][0].value.pos;
        if (a !== b) {
          throw new ChaltteokSyntaxError(
            `패턴의 품사 ${a}#{가} 앞서 정의한 패턴의 품사 ${b}#{와} 다릅니다.`,
            pattern.definition
          );
        }
      }
    }
    const cands = Object.keys(outputs);
    if (cands.length === 0) continue;
    if (cands.length > 1) {
      const metadata: SourceMetadata = mergeMetadata(
        ...trees.map((tree) => tree.head.metadata)
      );
      throw new ChaltteokSyntaxError(
        "구문이 여러 가지로 해석될 수 있습니다.",
        metadata
      );
    }
    const key = cands[0];
    return [bgn, end, new Tree(...outputs[key], key)]; // Since already sorted
  }
  return null;
}

export function matchPattern(
  trees: Tree[],
  patterns: IndexedPatterns,
  i: number,
  maxBefore: number,
  maxAfter: number
): [number, number, Tree] | null {
  const results: [number, number, Tree][] = [];

  const _m = _matchAnd(trees.slice(i - maxBefore, i + 1 + maxAfter), maxBefore);
  if (_m != null) {
    const [bgn, end, children] = _m;
    if (children.length > 1) {
      const head: Term = { pos: "명사", hasOmit: false };
      const metadata: SourceMetadata = mergeMetadata(
        ...trees.map((tree) => tree.head.metadata)
      );
      const output = new Tree({ value: head, metadata }, children, "~과~");
      results.push([bgn + (i - maxBefore), end + (i - maxBefore), output]);
    }
  }

  let candidates: PatternArray = new PatternArray();
  for (const key of getKeysFromTerm(trees[i].head.value)) {
    let entries = patterns.get(key);
    if (!entries) continue;
    entries = entries.sliceBefore(0, maxBefore + 1).sliceAfter(0, maxAfter + 1);
    candidates = candidates.concat(entries);
  }
  const result = _matchPattern(trees, candidates, i);
  if (result != null) results.push(result);

  // choose the longest among the earliest
  let minBgn = i + 1;
  let maxLen = 0;
  let item: [number, number, Tree] | null = null;
  for (const [bgn, end, tree] of results) {
    if (bgn < minBgn) {
      minBgn = bgn;
      maxLen = end - bgn;
      item = [bgn, end, tree];
    } else if (bgn === minBgn && maxLen < end - bgn) {
      maxLen = end - bgn;
      item = [bgn, end, tree];
    }
  }
  return item;
}
