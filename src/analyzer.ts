import { josa } from "josa";

import { Yongeon, Analyzer as YongeonAnalyzer } from "eomi-js";
import { extractAndProcessNumber, Analysis } from "kor-to-number";

import {
  NOUNS,
  JOSAS,
  ADJECTIVES,
  VERBS,
  VERB_EOMIS,
  EOMIS,
  SUFFIXES,
} from "./vocabulary";
import { Trie } from "./trie";

export class ParseError extends Error {
  constructor(message: string) {
    super(josa(message));
  }
}

export type POS =
  | "체언"
  | "용언"
  | "관형사"
  | "부사"
  | "조사"
  | "어미"
  | "접미사";

export type IDToken = { type: "id"; lemma: string; pos: "체언" };
export type WordToken = { type: "word"; lemma: string; pos: POS };
export type SymbolToken = { type: "symbol"; symbol: string };
export type ArityToken = {
  type: "arity";
  lemma: string;
  number: number;
  pos: "체언";
};
export type NumberToken = {
  type: "number";
  lemma: string;
  number: number;
  pos: "체언";
};

export type Token =
  | IDToken
  | WordToken
  | SymbolToken
  | ArityToken
  | NumberToken;

/**
 * 호환용 한글 자모 중 자음을 한글 자모 중 종성으로 변환합니다.
 * @param x 길이가 1인 문자열.
 * @returns 변환된 문자열. 해당되지 않으면 그대로 돌려받습니다.
 */
function compatToJongseong(x: string) {
  if (x < "ㄱ" || "ㅎ" < x) return x;
  const skip = ["ㄸ", "ㅃ", "ㅉ"];
  if (skip.indexOf(x[0]) !== -1) return x;

  let codepoint = x.charCodeAt(0) - "ㄱ".charCodeAt(0);
  skip.forEach((c) => (codepoint -= x > c ? 1 : 0));
  return String.fromCharCode(codepoint + 0x11a8);
}

/**
 * 한글 문자열을 자모로 분리합니다.
 * @param x 한글 문자열. 음절 또는 자모로 구성됩니다.
 */
function N(x: string) {
  return x.split("").map(compatToJongseong).join("").normalize("NFD");
}

class NounAnalyzer {
  nouns: Trie<string>;
  constructor(nouns: string[]) {
    this.nouns = new Trie();
    for (const noun of nouns) this.addNoun(noun);
  }
  addNoun(noun: string): void {
    this.nouns.set(N(noun), noun);
  }
  analyze(target: string): (WordToken | IDToken)[][] {
    let candidates: [string, string][];
    const quoteMatch = target.match(/^'([^']+)'([^']*)$/);
    if (quoteMatch) {
      candidates = [[quoteMatch[1], quoteMatch[2]]];
    } else {
      candidates = this.nouns.allPrefixes(N(target));
    }
    let results: (WordToken | IDToken)[][] = [];
    for (const [noun, rest] of candidates) {
      let analyzed = analyzeNounChunk(noun, rest);
      if (!analyzed) continue;
      if (!quoteMatch) results.push(analyzed);
      else {
        let newAnalysis: (WordToken | IDToken)[] = analyzed;
        newAnalysis[0].type = "id";
        results.push(newAnalysis);
      }
    }
    return results;
  }
}

function processJosa(josa: string): WordToken[] {
  josa = josa.trim();
  if (josa === "") return [];
  if (josa.slice(0, 2) === "이-") {
    return [
      { type: "word", lemma: "이다", pos: "조사" },
      { type: "word", lemma: josa.slice(1), pos: "어미" },
    ];
  }
  return [{ type: "word", lemma: josa, pos: "조사" }];
}

function analyzeNounChunk(noun: string, rest: string): WordToken[] | null {
  rest = N(rest);
  let result: WordToken[] = [{ type: "word", lemma: noun, pos: "체언" }];
  while (rest.length) {
    let suffix = SUFFIXES.find((x) => rest.startsWith(N(x)));
    if (!suffix) break;
    rest = rest.slice(N(suffix).length);
    result.push({ type: "word", lemma: suffix, pos: "접미사" });
  }
  if (!rest.length) return result;

  const consumed = result[result.length - 1].lemma;
  const josaEntry = /[가-힣]$/.test(consumed)
    ? JOSAS.find((entry) => N(entry.realize(consumed)) === rest)
    : JOSAS.find((entry) => entry.forms.map(N).includes(rest));
  if (!josaEntry) return null;
  result.push(...processJosa(josaEntry.lemma));
  return result;
}

export class Analyzer {
  nouns: string[];
  adjectives: Yongeon[];
  verbs: Yongeon[];
  nounAnalyzer: NounAnalyzer;
  adjAnalyzer: YongeonAnalyzer;
  verbAnalyzer: YongeonAnalyzer;

  constructor(nouns?: string[], adjs?: Yongeon[], verbs?: Yongeon[]) {
    this.nouns = nouns || NOUNS.slice();
    this.adjectives = adjs || ADJECTIVES.slice();
    this.verbs = verbs || VERBS.slice();
    this.nounAnalyzer = new NounAnalyzer(this.nouns);
    this.adjAnalyzer = new YongeonAnalyzer(this.adjectives, EOMIS);
    this.verbAnalyzer = new YongeonAnalyzer(this.verbs, VERB_EOMIS);
  }
  clone() {
    return new Analyzer(
      this.nouns.slice(),
      this.adjectives.slice(),
      this.verbs.slice()
    );
  }

  addNoun(noun: string) {
    this.nouns.push(noun);
    this.nounAnalyzer.addNoun(noun);
  }
  addAdj(adj: Yongeon) {
    this.adjectives.push(adj);
    this.adjAnalyzer.addYongeon(adj);
  }
  addVerb(verb: Yongeon) {
    this.verbs.push(verb);
    this.verbAnalyzer.addYongeon(verb);
  }

  analyze(chunk: string): Token[][] {
    let results: Token[][] = this.nounAnalyzer.analyze(chunk);
    for (const [stem, eomi] of this.adjAnalyzer.analyze(chunk)) {
      results.push([
        { type: "word", lemma: stem.valueOf(), pos: "용언" },
        { type: "word", lemma: eomi.valueOf(), pos: "어미" },
      ]);
    }
    for (const [stem, eomi] of this.verbAnalyzer.analyze(chunk)) {
      results.push([
        { type: "word", lemma: stem.valueOf(), pos: "용언" },
        { type: "word", lemma: eomi.valueOf(), pos: "어미" },
      ]);
    }
    return results;
  }
}

export function extractNumericLiteral(
  sentence: string
): [Token[], string] | null {
  function format(analysis: Analysis): Token {
    const pos: POS = "체언"; // TODO
    const token: NumberToken = {
      type: "number",
      lemma: analysis.consumed,
      number: analysis.parsed,
      pos,
    };
    return token;
  }
  function mapper(analysis: Analysis): [Token[], string] | null {
    if (isNaN(analysis.parsed)) return null;
    if (/[.]\s*$/.test(analysis.consumed)) return null;
    if (/^([.,\s]|$)/.test(analysis.rest) || /\s$/.test(analysis.consumed)) {
      return [[format(analysis)], analysis.rest];
    }
    const match = analysis.rest.match(/^([^\s.,"]+)\s*(.*)$/);
    if (!match) return null;
    const [_, suffix, rest] = match;
    let analyzed = analyzeNounChunk(analysis.consumed, suffix);
    if (!analyzed) return null;
    let tokens = [format(analysis), ...analyzed.slice(1)];
    return [tokens, rest];
  }
  return extractAndProcessNumber(sentence, mapper, [
    "숫자",
    "숫자혼용",
    "한자어",
  ]);
}

export function extractArityDesignator(word: string): Token[] | null {
  function validateTokens(tokens: WordToken[]): "arity" | "number" | null {
    for (const token of tokens) {
      if (token.pos === "접미사") {
        if (token.lemma !== "분") return "number";
        return null;
      }
    }
    return "arity";
  }
  function format(analysis: Analysis, type: "arity" | "number"): Token {
    const pos: POS = "체언"; // TODO
    const token: Token = {
      type: type,
      lemma: analysis.consumed,
      number: analysis.parsed,
      pos,
    };
    return token;
  }
  function mapper(analysis: Analysis): Token[] | null {
    if (isNaN(analysis.parsed)) return null;
    if (analysis.parsed < 1 || analysis.parsed >= 100) return null;
    let analyzed = analyzeNounChunk(analysis.consumed, analysis.rest);
    if (!analyzed) return null;
    let tokens = analyzed.slice(1);
    let type = validateTokens(tokens);
    if (!type) return null;
    return [format(analysis, type), ...tokens];
  }
  return extractAndProcessNumber(word.trim(), mapper, ["순우리말"]);
}
