import {
  ParseError,
  Token,
  WordToken,
  NumberToken,
  POS,
  ArityToken,
} from "./analyzer";
import { Tree, Term } from "./ast";
import { toAbbr } from "./utils.js";

function _formatTerm(term: Term) {
  if (term.type === "simple") return toAbbr(term.token);
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

export class PatternArray {
  data: DefaultArray<DefaultArray<Pattern[]>>;
  constructor(data?: DefaultArray<DefaultArray<Pattern[]>>) {
    if (data != null) this.data = data;
    else {
      this.data = new DefaultArray<DefaultArray<Pattern[]>>(
        () => new DefaultArray<Pattern[]>(() => [])
      );
    }
  }
  add(i: number, pattern: Pattern) {
    const length = pattern.input.length;
    this.data
      .get(i)
      .get(length - (i + 1))
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
      row.map((patterns) => patterns.slice())
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
        trgRow.get(j).push(...srcRow.get(j));
      }
    }
    return result;
  }
  enumerate(): [number, number, Pattern][] {
    let list = this.data.enumerate().flatMap(function ([i, row]) {
      return row.enumerate().flatMap(function ([j, patterns]) {
        // TODO: Sort patterns by specificity
        return patterns.map((x): [number, number, Pattern] => [i, j, x]);
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

function _swapArguments(pattern: Pattern): Pattern[] {
  let argIndexes = pattern.input
    .slice(0, -1)
    .map((term, i) => (term.type === "generic" ? i : null))
    .filter((i): i is number => {
      if (i == null) return false;
      const suffix = pattern.input[i + 1];
      if (suffix.type === "generic") return false;
      if (suffix.pos !== "조사") return false;
      if (suffix.token.type !== "word") return false;
      if (["이다"].includes(suffix.token.lemma)) return false;
      return true;
    });

  let patterns: Pattern[] = [pattern];
  const pos = pattern.output.pos;
  if (argIndexes.length >= 3) throw "Hey look at this!";
  if (argIndexes.length <= 1) return patterns;

  let newTerms = pattern.input.slice();
  newTerms[argIndexes[0] + 1] = pattern.input[argIndexes[1] + 1];
  newTerms[argIndexes[1] + 1] = pattern.input[argIndexes[0] + 1];
  patterns.push(new Pattern(newTerms, { type: "generic", pos }));

  newTerms = pattern.input.slice();
  newTerms.splice(argIndexes[0], 2);
  patterns.push(new Pattern(newTerms, { type: "generic", pos }));

  newTerms = pattern.input.slice();
  newTerms.splice(argIndexes[1], 2);
  patterns.push(new Pattern(newTerms, { type: "generic", pos }));

  return patterns;
}

export function parsePattern(pattern: Token[], pos?: POS): Pattern[] {
  let tokens: (WordToken | NumberToken | ArityToken)[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const token = pattern[i];
    if (token.type === "id" || token.type === "symbol")
      throw new ParseError(
        "Internal Error parsePattern::ILLEGAL_TOKEN " + JSON.stringify(token)
      );
    tokens.push(token);
  }

  let terms: Term[][] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (equalWord(tokens[i], 다)) continue;
    if (equalWord(tokens[i], 의)) {
      let _terms = terms[terms.length - 1];
      if (
        _terms.length === 1 &&
        _terms[0].type === "generic" &&
        _terms[0].pos === "명사"
      ) {
        _terms[0].pos = "관형사";
        continue;
      }
    }

    if (equalWord(tokens[i], 몇))
      // TODO: 두 수의 차
      terms.push([{ type: "generic", pos: "명사" }]);
    else if (equalWord(tokens[i], 무엇))
      terms.push([{ type: "generic", pos: "명사" }]);
    else if (equalWord(tokens[i], 어찌하다))
      terms.push([{ type: "generic", pos: "동사" }]);
    else if (equalWord(tokens[i], 어떠하다))
      terms.push([{ type: "generic", pos: "형용사" }]);
    else if (equalWord(tokens[i], 어찌어떠하다))
      terms.push([
        { type: "generic", pos: "형용사" },
        { type: "generic", pos: "동사" },
      ]);
    else if (
      i < tokens.length - 1 &&
      tokens[i + 1].pos === "명사" &&
      (tokens[i].type === "arity" ||
        equalWord(tokens[i], 어느) ||
        equalWord(tokens[i], 여러))
    ) {
      terms.push([{ type: "generic", pos: "명사" }]);
      i++;
    } else terms.push([{ type: "simple", token, pos: token.pos }]);
  }

  return _allCombinations(terms)
    .map(
      (x) =>
        new Pattern(x, {
          type: "generic",
          pos: pos || x[x.length - 1].pos,
        })
    )
    .flatMap(_swapArguments);
}

export function equalWord(word1: Token, word2: WordToken): boolean {
  if (word1.type !== word2.type) return false;
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

/* 
무엇과 무엇: {
  needs('n T', '1 T');
  returns('n+1 T');
  return (acc, cur) => acc.concat(cur);
}*/
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
      const output = new Tree({ type: "generic", pos: "명사", name }, children);
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

  for (const [precededBy, followedBy, pattern] of candidates.enumerate()) {
    const [bgn, end] = [i - precededBy, i + 1 + followedBy];
    const target = trees.slice(bgn, end) as Tree[];
    let matched = true;
    let children: Tree[] = [];
    for (let i = 0; i < target.length; i++) {
      if (!_matches(target[i], pattern.input[i])) {
        matched = false;
        break;
      }
      if (pattern.input[i].type === "generic") children.push(target[i]);
    }
    if (matched) {
      results.push([bgn, end, new Tree(pattern.output, children)]);
      break; // candidates?? multiple??
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
