import {
  ParseError,
  Token,
  WordToken,
  NumberToken,
  POS,
  ArityToken,
} from "./analyzer";
import { Tree, Term, Overloading, Processor, AST, TermType } from "./ast";
import { toAbbr } from "./utils.js";

function _formatTerm(term: Term) {
  if (term.type === "simple") return toAbbr(term.token);
  return toAbbr({ type: "word", lemma: "{}", pos: term.pos });
}

export class Pattern {
  input: Term[];
  output: Term;
  overloading: Overloading;
  key: string;
  constructor(input: Term[], output: Term, overloading: Overloading) {
    this.input = input;
    this.output = output;
    this.overloading = overloading;
    this.key = input.map(_formatTerm).join(" ");
    output.name = this.key;
  }
}

class DefaultArray<T> {
  prepare: () => T;
  data: (T | undefined)[];
  constructor(prepare: () => T, data?: (T | undefined)[]) {
    this.prepare = prepare;
    this.data = data || [];
  }
  get length(): number {
    return this.data.length;
  }
  hasValueAt(i: number): boolean {
    return this.data[i] != null;
  }
  get(i: number): T {
    let item = this.data[i];
    if (item != null) return item;
    item = this.data[i] = this.prepare();
    return item;
  }
  set(i: number, item: T) {
    this.data[i] = item;
  }
  slice(start?: number, end?: number): DefaultArray<T> {
    return new DefaultArray<T>(this.prepare, this.data.slice(start, end));
  }
  map(f: (x: T) => T): DefaultArray<T> {
    const data = this.data.map((x) => (x == null ? x : f(x)));
    return new DefaultArray<T>(this.prepare, data);
  }
  enumerate(): [number, T][] {
    let result: [number, T][] = [];
    for (let i = 0; i < this.data.length; i++) {
      const item = this.data[i];
      if (item != null) result.push([i, item]);
    }
    return result;
  }
}

class ListMap<T> {
  data: { [key: string]: T[] };
  constructor(data?: { [key: string]: T[] }) {
    this.data = data || {};
  }
  clone(): ListMap<T> {
    let data: { [key: string]: T[] } = {};
    for (const key in this.data) data[key] = this.data[key].slice();
    return new ListMap(data);
  }
  get(key: string): T[] {
    let item = this.data[key];
    if (item != null) return item;
    item = this.data[key] = [];
    return item;
  }
  update(other: ListMap<T>) {
    for (const key in other.data) this.data[key] = other.data[key];
  }
  values(): T[][] {
    return Object.values(this.data).filter((x) => x.length > 0);
  }
}
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
    let result = this.clone();

    for (let i = 0; i < other.data.length; i++) {
      if (!other.data.hasValueAt(i)) continue;

      const srcRow = other.data.get(i);
      let trgRow = result.data.get(i);
      for (let j = 0; j < srcRow.length; j++) {
        if (!srcRow.hasValueAt(j)) continue;
        trgRow.get(j).update(srcRow.get(j));
      }
    }
    return result;
  }
  enumerate(): [number, number, Pattern[]][] {
    let list = this.data.enumerate().flatMap(function ([i, row]) {
      return row.enumerate().flatMap(function ([j, _map]) {
        return _map.values().map((x): [number, number, Pattern[]] => [i, j, x]);
      });
    });
    list.reverse();
    return list;
  }
}

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
const 의: WordToken = { type: "word", lemma: "의", pos: "조사" };
const 다: WordToken = { type: "word", lemma: "-다", pos: "어미" };

function _allCombinations<T>(cases: T[][]): T[][] {
  if (cases.length <= 1) return cases;
  const heads = cases[0];
  const tails = _allCombinations(cases.slice(1));
  let combinations = [];
  for (const head of heads)
    for (const tail of tails) combinations.push([head].concat(tail));
  return combinations;
}

function _swapped<T>(arr: T[], i: number, j: number): T[] {
  let _arr = arr.slice();
  _arr[i] = arr[j];
  _arr[j] = arr[i];
  return _arr;
}
function _swapArguments(pattern: Pattern): Pattern[] {
  function _sameTerms(a: Term, b: Term): boolean {
    if (a.type === "generic" || b.type === "generic") return false;
    if (a.pos !== b.pos) return false;
    return (a.token as WordToken).lemma === (b.token as WordToken).lemma;
  }

  const genericIdx = pattern.input
    .map((term, i) => (term.type === "generic" ? i : null))
    .filter((i): i is number => i != null);
  const swapIdx = genericIdx
    .map((_, j) => j)
    .filter((j) => {
      const i = genericIdx[j];
      if (i + 1 >= pattern.input.length) return false;
      const suffix = pattern.input[i + 1];
      if (suffix.type !== "simple") return false;
      if (suffix.pos !== "조사") return false;
      if (suffix.token.type !== "word") return false;
      if (["이다"].includes(suffix.token.lemma)) return false;
      return true;
    });
  let patterns: Pattern[] = [pattern];
  if (swapIdx.length !== 2) return patterns;
  if (_sameTerms(pattern.input[swapIdx[0] + 1], pattern.input[swapIdx[1] + 1]))
    return patterns;
  if (pattern.overloading.input == null)
    throw new ParseError("패턴에 인수 타입을 명시해야 합니다.");

  const pos = pattern.output.pos;
  const range = genericIdx.map((_, i) => i);

  const terms = _swapped(
    pattern.input,
    genericIdx[swapIdx[0]] + 1,
    genericIdx[swapIdx[1]] + 1
  );
  const overloading: Overloading = {
    input: _swapped(pattern.overloading.input, swapIdx[0], swapIdx[1]),
    register: pattern.overloading.register,
    output: pattern.overloading.output,
    processor: pattern.overloading.processor,
    argPerm: _swapped(range, swapIdx[0], swapIdx[1]),
  };
  patterns.push(new Pattern(terms, { type: "generic", pos }, overloading));
  if (pattern.overloading.register[0] != null) return patterns;

  for (const k of [0, 1]) {
    const input = pattern.overloading.input.slice();
    const terms = pattern.input.slice();
    terms.splice(genericIdx[swapIdx[k]], 2);
    const argPerm: (number | null)[] = range.slice(0, -1);
    argPerm.splice(swapIdx[k], 0, null);
    const overloading: Overloading = {
      input,
      register: pattern.overloading.register,
      output: pattern.overloading.output,
      processor: pattern.overloading.processor,
      argPerm,
    };
    patterns.push(new Pattern(terms, { type: "generic", pos }, overloading));
  }
  return patterns;
}

export function parsePattern(
  tokens: Token[],
  overloading: Overloading,
  pos?: POS
): Pattern[] {
  let _tokens: (WordToken | NumberToken | ArityToken)[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "id" || token.type === "symbol")
      throw new ParseError(
        "Internal Error parsePattern::ILLEGAL_TOKEN " + JSON.stringify(token)
      );
    _tokens.push(token);
  }

  let terms: Term[][] = [];
  let termTypes: (TermType | null)[] = [];
  for (let i = 0; i < _tokens.length; i++) {
    const token = _tokens[i];
    if (equalWord(_tokens[i], 다)) continue;
    if (equalWord(_tokens[i], 의)) {
      let _term = terms[terms.length - 1][0];
      if (_term.type === "generic" && _term.pos === "명사") {
        _term.pos = "관형사";
        continue;
      }
    }

    const next = i + 1 < _tokens.length ? _tokens[i + 1] : null;
    let arity = null;
    if (token.type === "arity") arity = token.number;
    if (equalWord(token, 어느)) arity = 1;
    if (equalWord(token, 여러)) arity = { at_least: 2 };

    if (equalWord(token, 몇)) {
      terms.push([{ type: "generic", pos: "명사" }]);
      termTypes.push({ arity: 1, type: "수" });
    } else if (equalWord(token, 무엇)) {
      terms.push([{ type: "generic", pos: "명사" }]);
      termTypes.push(null);
    } else if (equalWord(token, 어찌하다)) {
      terms.push([{ type: "generic", pos: "동사" }]);
      termTypes.push(null);
    } else if (equalWord(token, 어떠하다)) {
      terms.push([{ type: "generic", pos: "형용사" }]);
      termTypes.push({ arity: 1, type: "참거짓" });
    } else if (equalWord(token, 어찌어떠하다)) {
      terms.push([
        { type: "generic", pos: "형용사" },
        { type: "generic", pos: "동사" },
      ]);
      termTypes.push(null);
    } else if (arity != null && next?.pos === "명사") {
      terms.push([{ type: "generic", pos: "명사" }]);
      termTypes.push({ arity, type: next.lemma });
      i++;
    } else {
      terms.push([{ type: "simple", token, pos: token.pos }]);
    }
  }

  if (termTypes.every((x): x is TermType => x != null))
    overloading.input = termTypes;

  return _allCombinations(terms)
    .map(function (terms) {
      const _pos = pos || terms[terms.length - 1].pos;
      return new Pattern(terms, { type: "generic", pos: _pos }, overloading);
    })
    .flatMap(_swapArguments);
}

export function equalWord(word1: Token, word2: WordToken): boolean {
  if (word1.type !== word2.type) return false;
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

const 과: WordToken = { type: "word", lemma: "과", pos: "조사" };

function _is과(term: Term) {
  return term.type === "simple" && equalWord(term.token, 과);
}

function _matchAnd(trees: Tree[], i: number): [number, number, Tree[]] | null {
  const pattern = /^(?:\{\}n 과p )+\{\}n$/;
  const focus = trees[i];
  if (_is과(focus.head)) {
    if (i <= 0 || i >= trees.length - 1) return null;
    const before = _matchAnd(trees.slice(0, i), i - 1);
    if (before == null) return null;
    const after = _matchAnd(trees.slice(i + 1), 0);
    if (after == null) return null;
    return [before[0], after[1] + (i + 1), before[2].concat(after[2])];
  } else if (
    focus.head.pos === "명사" &&
    !pattern.test(focus.head.name || "")
  ) {
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
  return null;
}

export type IndexedPatterns = {
  [key: string]: PatternArray;
}; // patterns[key]?[precededby]?[followedby]? = Pattern[]

function getKeysFromTerm(x: Term): string[] {
  let keys: string[] = [toAbbr({ type: "word", lemma: "{}", pos: x.pos })];
  if (x.type === "simple") keys.push(toAbbr(x.token));
  return keys;
}

export function indexPatterns(patterns: Pattern[]): IndexedPatterns {
  let array: IndexedPatterns = {};
  for (const pattern of patterns) {
    const terms = pattern.input;
    for (let i = 0; i < terms.length; i++) {
      for (const key of getKeysFromTerm(terms[i])) {
        if (array[key] == null) array[key] = new PatternArray();
        array[key].add(i, pattern);
      }
    }
  }
  return array;
}

function _matches(tree: Tree, term: Term): boolean {
  if (tree.head.pos !== term.pos) return false;
  if (term.type === "simple")
    return (
      tree.head.type === "simple" &&
      term.token.type === "word" &&
      equalWord(tree.head.token, term.token)
    );

  if (tree.head.type === "generic") return true;
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
  let results: [number, number, Tree][] = [];

  const _m = _matchAnd(trees.slice(i - maxBefore, i + 1 + maxAfter), maxBefore);
  if (_m != null) {
    const [bgn, end, children] = _m;
    if (children.length > 1) {
      const name = children.map((_) => "{}n").join(" 과p ");
      const head: Term = { type: "generic", pos: "명사", name };
      const overloading: Overloading = {
        input: children.map((_) => ({ arity: 1, type: "T" })),
        output: { arity: children.length, type: "T" },
        register: [null, null],
        processor: (_, f) => f,
      };
      const output = new Tree(head, children, [overloading]);
      results.push([bgn + (i - maxBefore), end + (i - maxBefore), output]);
    }
  }

  let candidates: PatternArray = new PatternArray();
  for (const key of getKeysFromTerm(trees[i].head)) {
    let entries = patterns[key];
    if (!entries) continue;
    entries = entries.sliceBefore(0, maxBefore + 1).sliceAfter(0, maxAfter + 1);
    candidates = candidates.concat(entries);
  }

  for (const [precededBy, followedBy, patterns] of candidates.enumerate()) {
    const [bgn, end] = [i - precededBy, i + 1 + followedBy];
    const target = trees.slice(bgn, end) as Tree[];
    let matched = true;
    let children: Tree[] = [];
    const input = patterns[0].input;
    for (let i = 0; i < target.length; i++) {
      if (!_matches(target[i], input[i])) {
        matched = false;
        break;
      }
      if (input[i].type === "generic") children.push(target[i]);
    }
    if (matched) {
      const output = patterns[0].output;
      const overloading = patterns.map((p) => p.overloading);
      results.push([bgn, end, new Tree(output, children, overloading)]);
    }
  }

  let maxLen = 0;
  let item: [number, number, Tree] | null = null;
  for (const [bgn, end, tree] of results) {
    if (maxLen < end - bgn) {
      maxLen = end - bgn;
      item = [bgn, end, tree];
    }
  }
  return item;
}
