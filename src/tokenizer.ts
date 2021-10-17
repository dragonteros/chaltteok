import { getJosaPicker } from "josa";

import {
  ParseError,
  Analyzer,
  Token,
  extractNumericLiteral,
  extractArityDesignator,
} from "./analyzer";
import { toAbbr } from "./utils";

const 을 = getJosaPicker("을");

function _makeSet(items: Token[][]) {
  let result = [];
  let keys: string[] = [];
  for (const item of items) {
    let key = JSON.stringify(item);
    if (!keys.includes(key)) {
      result.push(item);
      keys.push(key);
    }
  }
  return result;
}

const FORBIDDEN = [
  /v -지e (?:아니하|않)다a/,
  /a -지e (?:아니하|않)다v/,
  /(?:^|d)\s*나누다v -\(으\)ㅁe/,
];
const isForbidden = (x: string) => FORBIDDEN.some((p) => p.test(x));

function tagPOS(past: string, chunk: string, analyzer: Analyzer): Token[] {
  let results: Token[][] = [];
  if (".,".includes(chunk)) results.push([{ type: "symbol", symbol: chunk }]);
  results.push(...analyzer.analyze(chunk));

  const _result = extractArityDesignator(chunk, analyzer);
  if (_result != null) results.push(..._result);

  results = _makeSet(results).filter(
    (hypothesis) =>
      !isForbidden([past].concat(hypothesis.map(toAbbr)).join(" "))
  );

  if (results.length > 1)
    throw new ParseError("어절 '" + chunk + "'의 해석이 모호합니다.");
  if (results.length === 0)
    throw new ParseError(
      "어절 '" + chunk + "'" + 을(chunk) + " 해석할 수 없습니다."
    );
  return results[0];
}

function tokenize(sentence: string, analyzer: Analyzer): Token[] {
  let result: Token[] = [];
  let past: string = "";
  function push(...args: Token[]) {
    result.push(...args);
    past = [past].concat(args.map(toAbbr)).join(" ");
  }
  sentence = sentence
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "");
  while (sentence.length > 0) {
    let _result = extractNumericLiteral(sentence, analyzer);
    if (_result != null) {
      const analyses = _result[0];
      if (analyses.length !== 1)
        throw new ParseError("구문 '" + sentence + "'의 해석이 모호합니다.");
      push(..._result[0][0]);
      sentence = _result[1];
      continue;
    }

    const splitPattern = /^([^\s,."]+|[,.]|"[^"]*")\s*(.*)$/;
    const splitted = sentence.match(splitPattern);
    if (!splitted) break;
    push(...tagPOS(past, splitted[1], analyzer));
    sentence = splitted[2];
  }
  return result;
}

export { tokenize };
