import { Analyzer as YongeonAnalyzer, Eomi, Yongeon } from "eomi-js";
import { getJosaPicker } from "josa";
import { Analysis, extractAndProcessNumber } from "kor-to-number";
import { SyntaxError } from "../errors";
import { Trie } from "../utils/trie";
import { IDToken, NumberToken, POS, Token, WordToken } from "./tokens";

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

type JosaEntry = {
  lemma: string;
  forms: string[];
  realize: (n: string) => string;
};
const 로: JosaEntry = {
  lemma: "로",
  forms: ["로", "으로"],
  realize: getJosaPicker("로"),
};

function endsInJongseong(x: string): boolean {
  if (x.length === 0) return false;
  const codepoint = x.charCodeAt(x.length - 1);
  if (codepoint < "가".charCodeAt(0)) return false;
  if (codepoint > "힣".charCodeAt(0)) return false;
  return (codepoint - 0xac00) % 28 !== 0;
}
export function makeJosa(
  afterConsonant: string,
  afterVowel?: string
): JosaEntry {
  const _afterVowel: string = afterVowel || afterConsonant;
  const lemma = afterConsonant < _afterVowel ? afterConsonant : _afterVowel;
  const forms = [afterConsonant];
  if (afterConsonant !== _afterVowel) forms.push(_afterVowel);
  function realize(n: string): string {
    return endsInJongseong(n) ? afterConsonant : _afterVowel;
  }
  return { lemma, forms, realize };
}

class NounAnalyzer {
  nouns: Trie<string>;
  suffixes: string[];
  idaAnalyzer: YongeonAnalyzer;
  daAnalyzer: YongeonAnalyzer;
  josas: JosaEntry[];

  constructor(
    nouns: string[],
    suffixes: string[],
    eomis: Eomi[],
    josas: JosaEntry[]
  );
  constructor(other: NounAnalyzer);
  constructor(
    nouns: string[] | NounAnalyzer,
    suffixes: string[] = [],
    eomis: Eomi[] = [],
    josas: JosaEntry[] = []
  ) {
    if (nouns instanceof NounAnalyzer) {
      this.nouns = nouns.nouns.clone();
      this.suffixes = nouns.suffixes.slice();
      this.idaAnalyzer = nouns.idaAnalyzer.clone();
      this.daAnalyzer = nouns.daAnalyzer.clone();
      this.josas = nouns.josas.slice();
      return;
    }
    this.nouns = new Trie();
    this.suffixes = suffixes;
    for (const noun of nouns) this.addNoun(noun);

    eomis = eomis.concat([new Eomi("ㅁ"), new Eomi("기")]);
    this.idaAnalyzer = new YongeonAnalyzer([new Yongeon("이다")], eomis);
    this.daAnalyzer = new YongeonAnalyzer(
      [new Yongeon("이다"), new Yongeon("다", "여")],
      eomis
    );

    this.josas = [];
    for (const josa of josas) this.addJosa(josa);
    this.addJosa(로);
    this.addJosa(makeJosa("의/"));
  }
  clone(): NounAnalyzer {
    return new NounAnalyzer(this);
  }
  addNoun(noun: string): void {
    this.nouns.set(N(noun), noun);
  }
  addSuffix(suffix: string) {
    this.suffixes.push(suffix);
  }
  addEomi(eomi: Eomi) {
    this.idaAnalyzer.addEomi(eomi);
    this.daAnalyzer.addEomi(eomi);
  }
  addJosa(josa: JosaEntry) {
    this.josas.push(josa);
    this.addEomi(new Eomi("ㅁ" + josa.realize("임")));
    this.addEomi(new Eomi("기" + josa.realize("기")));
  }
  analyze(target: string): (WordToken | IDToken)[][] {
    let candidates: [string, string][];
    const quoteMatch = target.match(/^'([^']+)'([^']*)$/);
    if (quoteMatch) {
      candidates = [[quoteMatch[1], quoteMatch[2]]];
    } else {
      candidates = this.nouns.allPrefixes(N(target));
    }
    const results: (WordToken | IDToken)[][] = [];
    for (const [noun, rest] of candidates) {
      const analyses = this._analyze(noun, rest);
      for (const analysis of analyses) {
        if (!quoteMatch) results.push(analysis);
        else {
          const newAnalysis: (WordToken | IDToken)[] = analysis;
          newAnalysis[0].type = "id";
          results.push(newAnalysis);
        }
      }
    }
    return results;
  }

  _analyze(noun: string, rest: string): WordToken[][] {
    const token: WordToken = { type: "word", lemma: noun, pos: "명사" };
    const results: WordToken[][] = [];
    for (const [analysis, _rest] of this._analyzeSuffix(rest)) {
      const _analysis = [token].concat(analysis);
      if (!_rest.trim()) {
        results.push(_analysis);
        continue;
      }
      const consumed = _analysis[_analysis.length - 1].lemma;
      for (const _josa of this._analyzeJosa(consumed, _rest))
        results.push(_analysis.concat([_josa]));
      for (const __analysis of this._analyzeIda(consumed, _rest))
        results.push(_analysis.concat(__analysis));
    }
    return results;
  }

  _analyzeSuffix(rest: string): [WordToken[], string][] {
    rest = N(rest);

    const results: [WordToken[], string][] = [[[], rest]];
    if (!rest.length) return results;

    for (const suffix of this.suffixes) {
      if (!rest.startsWith(N(suffix))) continue;
      const analyses = this._analyzeSuffix(rest.slice(N(suffix).length));
      for (const [analysis, _rest] of analyses) {
        results.push([
          [{ type: "word", lemma: suffix, pos: "접미사" }, ...analysis],
          _rest,
        ]);
      }
    }
    return results;
  }

  _analyzeJosa(consumed: string, rest: string): WordToken[] {
    const test = /[가-힣]$/.test(consumed)
      ? (entry: JosaEntry) => N(entry.realize(consumed)) === rest
      : (entry: JosaEntry) => entry.forms.map(N).includes(rest);
    return this.josas
      .filter(test)
      .map((entry) => ({ type: "word", lemma: entry.lemma, pos: "조사" }));
  }

  _analyzeIda(consumed: string, rest: string): WordToken[][] {
    const analyzer =
      /[가-힣]$/.test(consumed) && endsInJongseong(consumed)
        ? this.idaAnalyzer
        : this.daAnalyzer;

    const results: WordToken[][] = [];
    const visited: string[] = [];
    for (const [, eomi] of analyzer.analyze(rest)) {
      let _eomi = eomi.valueOf();
      if (visited.includes(_eomi)) continue;
      else visited.push(_eomi);

      let josa = "";
      if (_eomi.length > 2 && _eomi.slice(0, 2) === "-기")
        [_eomi, josa] = [_eomi.slice(0, 2), _eomi.slice(2)];
      else if (_eomi.length > 5 && _eomi.slice(0, 5) === "-(으)ㅁ")
        [_eomi, josa] = [_eomi.slice(0, 5), _eomi.slice(5)];

      const analysis: WordToken[] = [
        { type: "word", lemma: "이다", pos: "조사" },
        { type: "word", lemma: _eomi, pos: "어미" },
      ];
      if (josa) analysis.push({ type: "word", lemma: josa, pos: "조사" });
      results.push(analysis);
    }
    return results;
  }
}

class SimpleAnalyzer {
  words: string[];
  pos: POS;
  constructor(words: string[], pos: POS) {
    this.words = words;
    this.pos = pos;
  }
  clone(): SimpleAnalyzer {
    return new SimpleAnalyzer(this.words, this.pos);
  }
  add(word: string) {
    this.words.push(word);
  }
  analyze(chunk: string): Token[][] {
    if (!this.words.includes(chunk)) return [];
    return [[{ type: "word", lemma: chunk, pos: this.pos }]];
  }
}

export class Analyzer {
  nounAnalyzer: NounAnalyzer;

  adjAnalyzer: YongeonAnalyzer;
  verbAnalyzer: YongeonAnalyzer;
  anidaAnalyzer: YongeonAnalyzer;
  issdaAnalyzer: YongeonAnalyzer;
  bothAnalyzer: YongeonAnalyzer;

  advAnalyzer: SimpleAnalyzer;
  detAnalyzer: SimpleAnalyzer;

  constructor(other?: Analyzer) {
    if (other != null) {
      this.nounAnalyzer = other.nounAnalyzer.clone();
      this.adjAnalyzer = other.adjAnalyzer.clone();
      this.verbAnalyzer = other.verbAnalyzer.clone();
      this.anidaAnalyzer = other.anidaAnalyzer.clone();
      this.issdaAnalyzer = other.issdaAnalyzer.clone();
      this.bothAnalyzer = other.bothAnalyzer.clone();
      this.advAnalyzer = other.advAnalyzer.clone();
      this.detAnalyzer = other.detAnalyzer.clone();
    } else {
      this.nounAnalyzer = new NounAnalyzer([], [], [], []);

      const anihada = [
        new Yongeon("아니하다", "아니하여"),
        new Yongeon("않다"),
      ];
      const eomis = [new Eomi("ㅁ"), new Eomi("기")];
      this.adjAnalyzer = new YongeonAnalyzer(anihada, eomis);
      this.verbAnalyzer = new YongeonAnalyzer(anihada, eomis);
      this.anidaAnalyzer = new YongeonAnalyzer([new Yongeon("아니다")], eomis);
      this.issdaAnalyzer = new YongeonAnalyzer(
        [new Yongeon("있다"), new Yongeon("없다")],
        eomis
      );
      this.bothAnalyzer = new YongeonAnalyzer(
        [new Yongeon("어찌/어떠하다", "어찌/어떠하여")],
        eomis
      );

      this.advAnalyzer = new SimpleAnalyzer([], "부사");
      this.detAnalyzer = new SimpleAnalyzer([], "관형사");
    }
  }

  clone(): Analyzer {
    return new Analyzer(this);
  }

  add(word: string, pos: POS) {
    switch (pos) {
      case "명사":
        this.nounAnalyzer.addNoun(word);
        return;
      case "접미사":
        this.nounAnalyzer.addSuffix(word);
        return;
      case "관형사":
        this.detAnalyzer.add(word);
        return;
      case "부사":
        this.advAnalyzer.add(word);
        return;
    }
    throw new SyntaxError("Internal Error Analyzer::add::ILLEGAL_POS " + pos);
  }
  addAdj(adj: Yongeon) {
    this.adjAnalyzer.addYongeon(adj);
  }
  addVerb(verb: Yongeon) {
    this.verbAnalyzer.addYongeon(verb);
  }
  addEomi(eomi: Eomi, attachTo: string[]) {
    if (attachTo.includes("형용사")) {
      this.adjAnalyzer.addEomi(eomi);
      this.anidaAnalyzer.addEomi(eomi);
    }
    if (attachTo.includes("동사")) this.verbAnalyzer.addEomi(eomi);
    if (attachTo.includes("이다")) this.nounAnalyzer.addEomi(eomi);
    if (attachTo.includes("아니다")) this.anidaAnalyzer.addEomi(eomi);
    if (attachTo.includes("있다")) this.issdaAnalyzer.addEomi(eomi);
    if (attachTo.includes("동사") && attachTo.includes("형용사"))
      this.bothAnalyzer.addEomi(eomi);
  }
  addJosa(josa: JosaEntry) {
    this.nounAnalyzer.addJosa(josa);
  }

  analyze(chunk: string): Token[][] {
    const results: Token[][] = [];
    results.push(...this.advAnalyzer.analyze(chunk));
    results.push(...this.detAnalyzer.analyze(chunk));
    results.push(...this.nounAnalyzer.analyze(chunk));

    const yongeonAnalyzers: [YongeonAnalyzer, POS][] = [
      [this.verbAnalyzer, "동사"],
      [this.adjAnalyzer, "형용사"],
      [this.issdaAnalyzer, "형용사"],
      [this.anidaAnalyzer, "형용사"],
      [this.bothAnalyzer, "형용사"],
    ];
    for (const [analyzer, pos] of yongeonAnalyzers) {
      for (const [stem, eomi] of analyzer.analyze(chunk)) {
        results.push([
          { type: "word", lemma: stem.valueOf(), pos },
          { type: "word", lemma: eomi.valueOf(), pos: "어미" },
        ]);
      }
    }
    return results;
  }

  analyzeSuffix(noun: string, rest: string): WordToken[][] {
    return this.nounAnalyzer._analyze(noun, rest);
  }
}

const DENY_LIST = [
  /자\s*$/, // `삼자`를 "삼다v -자e"로 해석하기 위함.
];
export function extractSinoNumericLiteral(
  sentence: string,
  analyzer: Analyzer
): [Token[][], string] | null {
  function format(analysis: Analysis): Token {
    const pos: POS = "명사";
    const token: NumberToken = {
      type: "number",
      lemma: analysis.consumed,
      native: false,
      number: analysis.parsed,
      pos,
    };
    return token;
  }
  function mapper(analysis: Analysis): [Token[][], string] | null {
    if (isNaN(analysis.parsed)) return null;
    if (/[.]\s*$/.test(analysis.consumed)) return null;
    if (DENY_LIST.some((deny) => deny.test(analysis.consumed))) return null;
    const formatted = format(analysis);
    if (/^([.,\s]|$)/.test(analysis.rest) || /\s$/.test(analysis.consumed)) {
      return [[[formatted]], analysis.rest.trim()];
    }
    const match = analysis.rest.match(/^([^\s.,"]+)\s*(.*)$/);
    if (!match) return null;
    const [, suffix, rest] = match;
    const analyses = analyzer.analyzeSuffix(analysis.consumed, suffix);
    if (!analyses.length) return null;
    const tokens: Token[][] = analyses.map((x) => [formatted, ...x.slice(1)]);
    return [tokens, rest];
  }
  return extractAndProcessNumber(sentence, mapper, [
    "숫자",
    "숫자혼용",
    "한자어",
  ]);
}

export function extractNativeNumeralLiteral(
  word: string,
  analyzer: Analyzer
): Token[][] | null {
  function format(analysis: Analysis): Token {
    const pos: POS = "명사"; // TODO
    const token: Token = {
      type: "number",
      lemma: analysis.consumed,
      native: true,
      number: analysis.parsed,
      pos,
    };
    return token;
  }
  function mapper(analysis: Analysis): Token[][] | null {
    if (isNaN(analysis.parsed)) return null;
    if (analysis.parsed < 1 || analysis.parsed >= 100) return null;
    const analyses = analyzer.analyzeSuffix(analysis.consumed, analysis.rest);
    if (!analyses.length) return null;
    const formatted = format(analysis);
    const tokens = analyses.map((x) => [formatted, ...x.slice(1)]);
    return tokens.length ? tokens : null;
  }
  return extractAndProcessNumber(word.trim(), mapper, ["순우리말"]);
}
