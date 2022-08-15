import { SyntaxError } from "../errors";
import {
  ArityToken,
  NumberToken,
  POS,
  Token,
  WordToken,
} from "../lexer/tokens";
import { Protocol } from "../runner/procedure";
import { Signature } from "../typechecker/signature";
import {
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../typechecker/types";
import { DefaultArray, ListMap, toAbbr } from "../utils/utils.js";
import { Term, Tree } from "./ast";
import { mergeParamTypes } from "./typemerger";

function _formatTerm(term: Term) {
  if ("token" in term) return toAbbr(term.token);
  return toAbbr({ type: "word", lemma: "{}", pos: term.pos });
}

export class Pattern {
  input: Term[];
  output: Term;
  key: string;
  constructor(input: Term[], output: Term) {
    this.input = input;
    this.output = output;
    this.key = input.map(_formatTerm).join(" ");
  }
}
// TODO: keep only POS thing and move argument something somewhere else

export class PatternArray {
  data: DefaultArray<DefaultArray<ListMap<Pattern>>>;
  constructor(data?: DefaultArray<DefaultArray<ListMap<Pattern>>>) {
    if (data != null) this.data = data;
    else {
      this.data = new DefaultArray<DefaultArray<ListMap<Pattern>>>(
        () => new DefaultArray(() => new ListMap())
      );
    }
  }
  add(i: number, pattern: Pattern) {
    const length = pattern.input.length;
    this.data
      .get(i)
      .get(length - (i + 1))
      .get(pattern.key)
      .push(pattern);
  }
  sliceBefore(start?: number, end?: number): PatternArray {
    return new PatternArray(this.data.slice(start, end));
  }
  sliceAfter(start?: number, end?: number): PatternArray {
    return new PatternArray(this.data.map((x) => x.slice(start, end)));
  }
  clone(): PatternArray {
    const data = this.data.map((row) =>
      row.map((patterns) => patterns.clone())
    );
    return new PatternArray(data);
  }
  concat(other: PatternArray): PatternArray {
    const result = this.clone();

    for (let i = 0; i < other.data.length; i++) {
      if (!other.data.hasValueAt(i)) continue;

      const srcRow = other.data.get(i);
      const trgRow = result.data.get(i);
      for (let j = 0; j < srcRow.length; j++) {
        if (!srcRow.hasValueAt(j)) continue;
        trgRow.get(j).update(srcRow.get(j));
      }
    }
    return result;
  }
  enumerate(): [number, number, Pattern[]][] {
    const list = this.data.enumerate().flatMap(function ([i, row]) {
      return row.enumerate().flatMap(function ([j, _map]) {
        return _map.values().map((x): [number, number, Pattern[]] => [i, j, x]);
      });
    });
    list.reverse();
    return list;
  }
}

const 두: NumberToken = { type: "number", lemma: "두", pos: "명사", number: 2 };
const 어느: WordToken = { type: "word", lemma: "어느", pos: "관형사" };
const 여러: WordToken = { type: "word", lemma: "여러", pos: "관형사" };
const 몇: WordToken = { type: "word", lemma: "몇", pos: "명사" };
const 무엇: WordToken = { type: "word", lemma: "무엇", pos: "명사" };
const 어찌하다: WordToken = { type: "word", lemma: "어찌하다", pos: "동사" };
const 어떠하다: WordToken = { type: "word", lemma: "어떠하다", pos: "형용사" };
const 어찌어떠하다: WordToken = {
  type: "word",
  lemma: "어찌/어떠하다",
  pos: "형용사",
};
const 다: WordToken = { type: "word", lemma: "-다", pos: "어미" };
const 변수: WordToken = { type: "word", lemma: "변수", pos: "명사" };

const 의: WordToken = { type: "word", lemma: "의", pos: "조사" };
const 의_: WordToken = { type: "word", lemma: "의/", pos: "조사" };
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

  const output: Term = { pos: pattern.output.pos };
  const range = genericIdx.map((_, i) => i);

  const terms = _swapped(
    pattern.input,
    genericIdx[swapIdx[0]] + 1,
    genericIdx[swapIdx[1]] + 1
  );
  const argPerm = _swapped(range, swapIdx[0], swapIdx[1]);
  results.push([new Pattern(terms, output), { arguments: argPerm }]);

  for (const k of swapIdx) {
    const terms = pattern.input.slice();
    terms.splice(genericIdx[k], 2);
    const argPerm: (number | null)[] = range.slice(0, -1);
    argPerm.splice(k, 0, null);

    results.push([new Pattern(terms, output), { arguments: argPerm }]);
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

export function parsePattern(
  tokens: Token[],
  signature?: Signature,
  pos?: POS
): [Pattern[], Signature] {
  const _tokens: (WordToken | NumberToken | ArityToken)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "id" || token.type === "symbol")
      throw new SyntaxError(
        "Internal Error parsePattern::ILLEGAL_TOKEN " + JSON.stringify(token)
      );
    _tokens.push(token);
  }

  const terms: (Term | null)[][] = [];
  const termTypes: TypeAnnotation[] = [];
  for (let i = 0; i < _tokens.length; i++) {
    const token = _tokens[i];
    if (equalWord(_tokens[i], 다)) continue;

    const next = i + 1 < _tokens.length ? _tokens[i + 1] : null;
    let arity = null;
    if (token.type === "arity") arity = token.number;
    if (equalWord(token, 어느)) arity = 1;
    if (equalWord(token, 두)) arity = 2;
    if (equalWord(token, 여러)) arity = { atLeast: 2 };

    if (equalWord(token, 의_)) {
      terms.push([null, { pos: "조사", token: 의 }]);
    } else if (equalWord(token, 몇)) {
      terms.push([{ pos: "명사" }]);
      termTypes.push({ arity: 1, type: "수" });
    } else if (equalWord(token, 무엇)) {
      terms.push([{ pos: "명사" }]);
      termTypes.push("any");
    } else if (equalWord(token, 어찌하다)) {
      terms.push([{ pos: "동사" }]);
      termTypes.push("any");
    } else if (equalWord(token, 어떠하다)) {
      terms.push([{ pos: "형용사" }]);
      termTypes.push({ arity: 1, type: "참거짓" });
    } else if (equalWord(token, 어찌어떠하다)) {
      terms.push([{ pos: "형용사" }, { pos: "동사" }]);
      termTypes.push("any");
    } else if (arity != null && next && equalWord(next, 변수)) {
      terms.push([{ pos: "명사" }]);
      termTypes.push({ variableOf: "any" });
      i++;
    } else if (arity != null && next?.pos === "명사") {
      terms.push([{ pos: "명사" }]);
      termTypes.push({ arity, type: next.lemma });
      i++;
    } else {
      terms.push([{ token, pos: token.pos }]);
    }
  }

  const patterns = _allCombinations(terms).map(function (terms) {
    const lastTerm = terms[terms.length - 1];
    let _pos = pos || lastTerm.pos;
    if ("token" in lastTerm && equalWord(lastTerm.token, 이다)) _pos = "형용사";

    return new Pattern(terms, { pos: _pos });
  });

  let param: TypeAnnotation[];
  try {
    param = termTypes.map((x, i) => mergeParamTypes(x, signature?.param[i]));
  } catch (error) {
    const abbrs = tokens.map(toAbbr).join(" ");
    throw new SyntaxError(`${error} 패턴: ${abbrs}`);
  }
  const _signature: Signature = { param, antecedent: signature?.antecedent };

  return [patterns, _signature];
}

export function equalWord(
  word1: Token,
  word2: WordToken | NumberToken
): boolean {
  if (word1.type !== word2.type) return false;
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

const 과: WordToken = { type: "word", lemma: "과", pos: "조사" };

function _is과(term: Term) {
  return "token" in term && equalWord(term.token, 과);
}

function _matchAnd(trees: Tree[], i: number): [number, number, Tree[]] | null {
  const focus = trees[i];
  if (focus.key === "~과~") return null;

  if (_is과(focus.head)) {
    if (i <= 0 || i >= trees.length - 1) return null;
    const before = _matchAnd(trees.slice(0, i), i - 1);
    if (before == null) return null;
    const after = _matchAnd(trees.slice(i + 1), 0);
    if (after == null) return null;
    return [before[0], after[1] + (i + 1), before[2].concat(after[2])];
  }
  if (focus.head.pos !== "명사") return null;
  if ("token" in focus.head && focus.head.token.type === "word") return null;

  const 과before = i >= 2 && _is과(trees[i - 1].head);
  const 과after = i < trees.length - 2 && _is과(trees[i + 1].head);
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

export class IndexedPatterns {
  data: Record<string, PatternArray>;
  _first: Pattern | null = null; // used for test
  constructor(data?: Record<string, PatternArray>) {
    this.data = data || {};
  }
  clone(): IndexedPatterns {
    const data: Record<string, PatternArray> = {};
    for (const [key, value] of Object.entries(this.data)) {
      data[key] = value.clone();
    }
    return new IndexedPatterns(data);
  }
  has(key: string): boolean {
    return key in this.data;
  }
  get(key: string): PatternArray | undefined {
    return this.data[key];
  }
  values() {
    return Object.values(this.data);
  }
  push(...patterns: Pattern[]) {
    for (const pattern of patterns) {
      const terms = pattern.input;
      for (let i = 0; i < terms.length; i++) {
        const key = getKeysFromTerm(terms[i])[0];
        if (this.data[key] == null) this.data[key] = new PatternArray();
        this.data[key].add(i, pattern);
      }
      this._first = this._first || pattern;
    }
  }
}

function getKeysFromTerm(x: Term): string[] {
  const keys: string[] = [toAbbr({ type: "word", lemma: "{}", pos: x.pos })];
  if ("token" in x) keys.unshift(toAbbr(x.token));
  return keys;
}

function _matches(tree: Tree, term: Term): boolean {
  if (tree.head.pos !== term.pos) return false;
  if ("token" in term)
    return (
      "token" in tree.head &&
      (term.token.type === "word" || term.token.type === "number") && // TODO
      equalWord(tree.head.token, term.token)
    );

  if (!("token" in tree.head)) return true;
  if (tree.head.token.type === "number") return true;
  if (tree.head.token.type === "id") return true;
  return false;
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
      const head: Term = { pos: "명사" };
      const output = new Tree(head, children, "~과~");
      results.push([bgn + (i - maxBefore), end + (i - maxBefore), output]);
    }
  }

  let candidates: PatternArray = new PatternArray();
  for (const key of getKeysFromTerm(trees[i].head)) {
    let entries = patterns.get(key);
    if (!entries) continue;
    entries = entries.sliceBefore(0, maxBefore + 1).sliceAfter(0, maxAfter + 1);
    candidates = candidates.concat(entries);
  }

  for (const [precededBy, followedBy, patterns] of candidates.enumerate()) {
    const [bgn, end] = [i - precededBy, i + 1 + followedBy];
    const target = trees.slice(bgn, end) as Tree[];
    const outputs: Record<string, [Term, Tree[]]> = {};
    for (const pattern of patterns) {
      let matched = true;
      const children: Tree[] = [];
      const input = pattern.input;
      for (let i = 0; i < target.length; i++) {
        if (!_matches(target[i], input[i])) {
          matched = false;
          break;
        }
        if (!("token" in input[i])) children.push(target[i]);
      }
      if (matched) {
        if (!(pattern.key in outputs)) {
          outputs[pattern.key] = [pattern.output, children];
        } else {
          const a = pattern.output.pos;
          const b = outputs[pattern.key][0].pos;
          if (a !== b)
            throw new SyntaxError(
              `'${pattern.key}' 꼴의 두 패턴이 품사가 다릅니다: ${a}, ${b}`
            );
        }
      }
    }
    const cands = Object.keys(outputs);
    if (cands.length > 1) {
      throw new SyntaxError("패턴 적용이 모호합니다: " + cands.join(", "));
    } else if (cands.length === 1) {
      const key = cands[0];
      results.push([bgn, end, new Tree(...outputs[key], key)]);
      break; // Since already sorted
    }
  }

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
