import { getJosaPicker } from "josa";
import { SyntaxError } from "../errors";
import {
  Analyzer,
  extractNativeNumeralLiteral,
  extractSinoNumericLiteral,
} from "./analyzer";
import { getKeyFromToken, Token } from "./tokens";

const 을 = getJosaPicker("을");

function _makeSet(items: Token[][]) {
  const result = [];
  const keys: string[] = [];
  for (const item of items) {
    const key = JSON.stringify(item);
    if (!keys.includes(key)) {
      result.push(item);
      keys.push(key);
    }
  }
  return result;
}

const FORBIDDEN = [
  /\[동사\] -지\[어미\] (?:아니하|않)다\[형용사\]/,
  /\[형용사\] -지\[어미\] (?:아니하|않)다\[동사\]/,

  /(?:명사|수사)\] [^'\s]+\[[동형관부]/,
  /관형사\] [^'\s]+\[[동형관부]/,
  /의\[조사\] [^'\s]+\[[동형관부]/,
  /-는\[어미\] [^'\s]+\[[동형관부]/,
  /-\(으\)[ㄴㄹ]\[어미\] [^'\s]+\[[동형관부]/,
];
const FORBIDDEN_AT_FINAL = [/(?:동사|형용사|관형사|부사|조사)\]$/];
const isForbidden = (x: string, isFinal: boolean) =>
  FORBIDDEN.some((p) => p.test(x)) ||
  (isFinal && FORBIDDEN_AT_FINAL.some((p) => p.test(x)));

function tagPOS(
  past: string,
  chunk: string,
  analyzer: Analyzer,
  isFinal: boolean
): Token[] {
  let results: Token[][] = [];
  if (".,".includes(chunk)) results.push([{ type: "symbol", symbol: chunk }]);
  results.push(...analyzer.analyze(chunk));

  const _result = extractNativeNumeralLiteral(chunk, analyzer);
  if (_result != null) results.push(..._result);

  results = _makeSet(results).filter(
    (hypothesis) =>
      !isForbidden(
        [past].concat(hypothesis.map(getKeyFromToken)).join(" "),
        isFinal
      )
  );

  if (results.length > 1)
    throw new SyntaxError("어절 '" + chunk + "'의 해석이 모호합니다.");
  if (results.length === 0)
    throw new SyntaxError(
      "어절 '" + chunk + "'" + 을(chunk) + " 해석할 수 없습니다."
    );
  return results[0];
}

function tokenize(sentence: string, analyzer: Analyzer): Token[] {
  const result: Token[] = [];
  let past = "";
  function push(...args: Token[]) {
    result.push(...args);
    past = [past].concat(args.map(getKeyFromToken)).join(" ");
  }
  sentence = sentence
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "");
  while (sentence !== "") {
    const _result = extractSinoNumericLiteral(sentence, analyzer);
    if (_result != null) {
      const analyses = _result[0];
      if (analyses.length !== 1)
        throw new SyntaxError("구문 '" + sentence + "'의 해석이 모호합니다.");
      push(..._result[0][0]);
      sentence = _result[1];
      continue;
    }

    const splitPattern = /^([^\s,."]+|[,.]|"[^"]*")\s*(.*)$/;
    const splitted = sentence.match(splitPattern);
    if (!splitted) break;
    sentence = splitted[2];
    push(...tagPOS(past, splitted[1], analyzer, sentence === ""));
  }
  return result;
}

export { tokenize };
