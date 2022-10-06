import { Analyzer as YongeonAnalyzer, Eomi, Yongeon } from "eomi-js";
import { getJosaPicker } from "josa";
import { Analysis, extractAndProcessNumber } from "kor-to-number";
import { InternalError } from "../base/errors";
import {
  splitStringWithMetadata,
  trimStringWithMetadata,
  WithMetadata,
} from "../base/metadata";
import { POS } from "../base/pos";
import { IDToken, NumberToken, Token, WordToken } from "../finegrained/tokens";
import { Trie } from "../utils/trie";
import { range } from "../utils/utils";

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
  return [...x].map(compatToJongseong).join("").normalize("NFD");
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

class HangulChunk {
  readonly internal: string;
  private mapping?: [number, number][]; // internal index -> [external index, offset]
  constructor(
    readonly external: WithMetadata<string>, // may not be NFC!!
    private readonly numJamoBefore: number = 0,
    private readonly numJamoAfter: number = 0
  ) {
    const decomposed = N(external.value);
    this.internal = decomposed.slice(
      numJamoAfter,
      decomposed.length - numJamoAfter
    );
  }

  splitAtExternalIndex(index: number): [HangulChunk, HangulChunk] {
    if (index < 0) index = this.external.value.length + index;

    const [first, second] = splitStringWithMetadata(this.external, index);

    if (first.value.length === 0) return [new HangulChunk(first), this];
    if (second.value.length === 0) return [this, new HangulChunk(second)];

    return [
      new HangulChunk(first, this.numJamoBefore),
      new HangulChunk(second, 0, this.numJamoAfter),
    ];
  }

  splitAtInternalIndex(index: number): [HangulChunk, HangulChunk] {
    if (index < 0) index = this.internal.length + index;
    const decomposed = N(this.external.value);
    const decomposedIndex = this.numJamoBefore + index;

    if (decomposedIndex === 0) return this.splitAtExternalIndex(0);
    if (decomposedIndex >= decomposed.length - this.numJamoAfter)
      return this.splitAtExternalIndex(this.external.value.length);

    const mapping = this.getMapping();
    const [externalIndex, behind] = mapping[index];
    const ahead = behind
      ? this.external.value[externalIndex].length - behind
      : 0;

    const splitted = splitStringWithMetadata(this.external, externalIndex);
    const after = splitted[1];
    let before = splitted[0];
    if (behind) {
      before = splitStringWithMetadata(this.external, externalIndex + 1)[0];
    }

    return [
      new HangulChunk(before, this.numJamoBefore, behind),
      new HangulChunk(after, ahead, this.numJamoAfter),
    ];
  }

  private getMapping(): [number, number][] {
    if (this.mapping == null) {
      this.mapping = [];
      for (const [i, c] of [...this.external.value].entries()) {
        const decomposed = c.normalize("NFD");
        for (const j of range(decomposed.length)) {
          this.mapping.push([i, j]);
        }
      }
    }
    return this.mapping;
  }
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
    this.idaAnalyzer = new YongeonAnalyzer([new Yongeon("-이다")], eomis);
    this.daAnalyzer = new YongeonAnalyzer(
      [new Yongeon("-이다"), new Yongeon("-다", "-여")],
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

  analyze(target: WithMetadata<string>): WithMetadata<WordToken | IDToken>[][] {
    const chunk = new HangulChunk(target);
    let candidates: [HangulChunk, HangulChunk][];
    const quoteMatch = target.value.match(/^'[^']+'/);
    if (quoteMatch) {
      const [a, b] = chunk.splitAtExternalIndex(quoteMatch[0].length - 1);
      const [, name] = a.splitAtExternalIndex(1);
      const [, suffix] = b.splitAtExternalIndex(1);
      candidates = [[name, suffix]];
    } else {
      candidates = this.nouns
        .allPrefixes(chunk.internal)
        .map(([noun]) => chunk.splitAtInternalIndex(N(noun).length));
    }
    const results: WithMetadata<WordToken | IDToken>[][] = [];
    for (const [noun, rest] of candidates) {
      const analyses = this.analyzeNoun(noun, rest);
      for (const analysis of analyses) {
        if (!quoteMatch) results.push(analysis);
        else {
          const newAnalysis: WithMetadata<WordToken | IDToken>[] = analysis;
          newAnalysis[0].value.type = "id";
          results.push(newAnalysis);
        }
      }
    }
    return results;
  }

  analyzeNoun(
    noun: HangulChunk,
    rest: HangulChunk
  ): WithMetadata<WordToken>[][] {
    const token: WithMetadata<WordToken> = {
      ...noun.external,
      value: { type: "word", lemma: noun.external.value, pos: "명사" },
    };
    const results: WithMetadata<WordToken>[][] = [];
    for (const [_analysis, _rest] of this.analyzeSuffix(rest)) {
      const analysis = [token].concat(_analysis);
      if (_rest.internal.trim() === "") {
        results.push(analysis);
        continue;
      }

      let [consumed] = rest.splitAtInternalIndex(-_rest.internal.length);
      if (consumed.internal.length === 0) consumed = noun;
      for (const _josa of this.analyzeJosa(consumed, _rest)) {
        results.push(analysis.concat([_josa]));
      }
      for (const _analysis of this._analyzeIda(consumed, _rest)) {
        results.push(analysis.concat(_analysis));
      }
    }
    return results;
  }

  private analyzeSuffix(
    rest: HangulChunk
  ): [WithMetadata<WordToken>[], HangulChunk][] {
    const results: [WithMetadata<WordToken>[], HangulChunk][] = [[[], rest]];
    if (!rest.internal.length) return results;

    for (const suffix of this.suffixes) {
      if (!rest.internal.startsWith(N(suffix))) continue;
      const [match, remaining] = rest.splitAtInternalIndex(N(suffix).length);
      const analyses = this.analyzeSuffix(remaining);
      for (const [analysis, _rest] of analyses) {
        results.push([
          [
            {
              ...match.external,
              value: { type: "word", lemma: suffix, pos: "접미사" },
            },
            ...analysis,
          ],
          _rest,
        ]);
      }
    }
    return results;
  }

  private analyzeJosa(
    consumed: HangulChunk,
    rest: HangulChunk
  ): WithMetadata<WordToken>[] {
    const test = /[\u1100-\u11FF]$/.test(consumed.internal) /* Hangul */
      ? (entry: JosaEntry) =>
          N(entry.realize(consumed.internal.normalize("NFC"))) === rest.internal
      : (entry: JosaEntry) => entry.forms.map(N).includes(rest.internal);
    return this.josas.filter(test).map((entry) => ({
      ...rest.external,
      value: { type: "word", lemma: entry.lemma, pos: "조사" },
    }));
  }

  private _analyzeIda(
    consumed: HangulChunk,
    rest: HangulChunk
  ): WithMetadata<WordToken>[][] {
    const analyzer = /[\u11A8-\u11FF]$/.test(consumed.internal) /* Jongseong */
      ? this.idaAnalyzer
      : this.daAnalyzer;

    const results: WithMetadata<WordToken>[][] = [];
    const visited: Set<string> = new Set();
    for (const [, eomi] of analyzer.analyze("-" + rest.internal)) {
      let _eomi = eomi.valueOf();
      if (visited.has(_eomi)) continue;
      visited.add(_eomi);

      let josa = "";
      if (_eomi.length > 2 && _eomi.slice(0, 2) === "-기") {
        [_eomi, josa] = [_eomi.slice(0, 2), _eomi.slice(2)];
      } else if (_eomi.length > 5 && _eomi.slice(0, 5) === "-(으)ㅁ") {
        [_eomi, josa] = [_eomi.slice(0, 5), _eomi.slice(5)];
      }

      const analysis: WithMetadata<WordToken>[] = [
        {
          ...rest.external,
          value: { type: "word", lemma: "이다", pos: "조사" },
        },
        {
          ...rest.external,
          value: { type: "word", lemma: _eomi, pos: "어미" },
        },
      ];
      if (josa) {
        analysis.push(
          ...this.analyzeJosa(...rest.splitAtExternalIndex(-josa.length))
        );
      }
      results.push(analysis);
    }
    return results;
  }
}

class SimpleAnalyzer {
  words: Set<string>;
  pos: POS;
  constructor(words: Set<string>, pos: POS) {
    this.words = words;
    this.pos = pos;
  }
  clone(): SimpleAnalyzer {
    return new SimpleAnalyzer(this.words, this.pos);
  }
  add(word: string) {
    this.words.add(word);
  }
  analyze(chunk: WithMetadata<string>): WithMetadata<Token>[][] {
    if (!this.words.has(chunk.value)) return [];
    const token: Token = { type: "word", lemma: chunk.value, pos: this.pos };
    return [[{ ...chunk, value: token }]];
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
      this.adjAnalyzer = new YongeonAnalyzer(anihada, []);
      this.verbAnalyzer = new YongeonAnalyzer(anihada, []);
      this.anidaAnalyzer = new YongeonAnalyzer([new Yongeon("아니다")], []);
      this.issdaAnalyzer = new YongeonAnalyzer(
        [new Yongeon("있다"), new Yongeon("없다")],
        []
      );
      this.bothAnalyzer = new YongeonAnalyzer(
        [new Yongeon("어찌/어떠하다", "어찌/어떠하여")],
        []
      );

      this.advAnalyzer = new SimpleAnalyzer(new Set(), "부사");
      this.detAnalyzer = new SimpleAnalyzer(new Set(), "관형사");
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
    throw new InternalError("Analyzer::add::ILLEGAL_POS " + pos);
  }
  addAdj(adj: Yongeon) {
    this.adjAnalyzer.addYongeon(adj);
  }
  addVerb(verb: Yongeon) {
    this.verbAnalyzer.addYongeon(verb);
  }
  addEomi(eomi: Eomi, attachTo: string[]) {
    if (attachTo.includes("형용사")) this.adjAnalyzer.addEomi(eomi);
    if (attachTo.includes("동사")) this.verbAnalyzer.addEomi(eomi);
    if (attachTo.includes("이다")) this.nounAnalyzer.addEomi(eomi);
    if (
      attachTo.includes("형용사") ||
      attachTo.includes("있다") ||
      attachTo.includes("없다")
    )
      this.issdaAnalyzer.addEomi(eomi);
    if (
      attachTo.includes("형용사") ||
      attachTo.includes("이다") ||
      attachTo.includes("아니다")
    )
      this.anidaAnalyzer.addEomi(eomi);

    if (attachTo.includes("동사") && attachTo.includes("형용사"))
      this.bothAnalyzer.addEomi(eomi);
  }
  addJosa(josa: JosaEntry) {
    this.nounAnalyzer.addJosa(josa);
  }

  analyze(chunk: WithMetadata<string>): WithMetadata<Token>[][] {
    const results: WithMetadata<Token>[][] = [];
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
      for (const [stem, eomi] of analyzer.analyze(chunk.value)) {
        results.push([
          { ...chunk, value: { type: "word", lemma: stem.valueOf(), pos } },
          {
            ...chunk,
            value: { type: "word", lemma: eomi.valueOf(), pos: "어미" },
          },
        ]);
      }
    }
    return results;
  }

  analyzeSuffix(
    noun: WithMetadata<string>,
    rest: WithMetadata<string>
  ): WithMetadata<WordToken>[][] {
    return this.nounAnalyzer.analyzeNoun(
      new HangulChunk(noun),
      new HangulChunk(rest)
    );
  }
}

const DENY_LIST = [
  /자\s*$/, // `삼자`를 "삼다v -자e"로 해석하기 위함.
];
export function extractSinoNumericLiteral(
  sentence: WithMetadata<string>,
  analyzer: Analyzer
): [WithMetadata<Token>[][], WithMetadata<string>] | null {
  function format(
    analysis: Analysis
  ): [WithMetadata<Token>, WithMetadata<string>] {
    const pos: POS = "명사";
    const token: NumberToken = {
      type: "number",
      native: false,
      number: analysis.parsed,
      pos,
    };
    const [match, rest] = splitStringWithMetadata(
      sentence,
      analysis.consumed.length
    );
    return [{ ...match, value: token }, trimStringWithMetadata(rest)];
  }

  function analyzeWhole(
    formatted: WithMetadata<Token>,
    suffix: WithMetadata<string>
  ) {
    if (suffix.value.startsWith("제곱")) return [];
    const analyses = analyzer.nounAnalyzer.analyze(suffix);
    return analyses.map((x) => [formatted, ...x]);
  }
  function analyzeSuffix(
    analysis: Analysis,
    formatted: WithMetadata<Token>,
    suffix: WithMetadata<string>
  ) {
    const consumed = { ...formatted, value: analysis.consumed };
    const analyses = analyzer.analyzeSuffix(consumed, suffix);
    return analyses.map((x) => [formatted, ...x.slice(1)]);
  }

  function mapper(
    analysis: Analysis
  ): [WithMetadata<Token>[][], WithMetadata<string>] | null {
    if (isNaN(analysis.parsed)) return null;
    if (/[.]\s*$/.test(analysis.consumed)) return null;
    if (DENY_LIST.some((deny) => deny.test(analysis.consumed))) return null;

    const [formatted, remaining] = format(analysis);
    if (/^([.,\s]|$)/.test(analysis.rest) || /\s$/.test(analysis.consumed)) {
      return [[[formatted]], remaining];
    }

    const match = remaining.value.match(/^[^\s.,"]+/);
    if (!match) return null;
    const [suffix, rest] = splitStringWithMetadata(remaining, match[0].length);

    const tokens = analyzeSuffix(analysis, formatted, suffix);
    if (/\d$/.test(analysis.consumed)) {
      tokens.push(...analyzeWhole(formatted, suffix));
    }
    if (tokens.length === 0) return null;
    return [tokens, trimStringWithMetadata(rest)];
  }
  return extractAndProcessNumber(sentence.value, mapper, [
    "숫자",
    "숫자혼용",
    "한자어",
  ]);
}

export function extractNativeNumeralLiteral(
  word: WithMetadata<string>,
  analyzer: Analyzer
): WithMetadata<Token>[][] | null {
  function getPOSs(analysis: Analysis): ("관형사" | "명사")[] {
    const noun = /하나$|[둘셋넷]$|스물$/;
    const determiner = /[한두세서석네너넉닷대엿]$|스무$/;
    let maybeDet = true;
    let maybeNoun = true;
    if (analysis.rest !== "") maybeDet = false;
    if (noun.test(analysis.consumed)) maybeDet = false;
    else if (determiner.test(analysis.consumed)) maybeNoun = false;

    if (maybeDet) return ["관형사"]; // TODO

    const POSs: ("관형사" | "명사")[] = [];
    if (maybeDet) POSs.push("관형사");
    if (maybeNoun) POSs.push("명사");
    return POSs;
  }
  function format(
    analysis: Analysis
  ): [WithMetadata<Token>[], WithMetadata<string>] {
    const POSs = getPOSs(analysis);
    const [match, rest] = splitStringWithMetadata(
      word,
      analysis.consumed.length
    );
    const candidates: WithMetadata<Token>[] = POSs.map((pos) => ({
      ...match,
      value: {
        type: "number",
        native: true,
        number: analysis.parsed,
        pos,
      },
    }));
    return [candidates, trimStringWithMetadata(rest)];
  }
  function mapper(analysis: Analysis): WithMetadata<Token>[][] | null {
    if (isNaN(analysis.parsed)) return null;
    if (analysis.parsed < 1 || analysis.parsed >= 100) return null;

    const [formatted, rest] = format(analysis);
    const candidates: WithMetadata<Token>[][] = [];
    for (const candidate of formatted) {
      const consumed = { ...candidate, value: analysis.consumed };
      const analyses = analyzer.analyzeSuffix(consumed, rest);
      candidates.push(...analyses.map((x) => [candidate, ...x.slice(1)]));
    }
    return candidates.length ? candidates : null;
  }
  return extractAndProcessNumber(word.value, mapper, ["순우리말"]);
}
