import { getJosaPicker } from "josa";

import { DETERMINERS, ADVERBS } from "./vocabulary";
import {
  ParseError,
  Analyzer,
  Token,
  extractNumericLiteral,
  extractArityDesignator,
} from "./analyzer";

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

function tagPOS(chunk: string, analyzer: Analyzer): Token[] {
  let results: Token[][] = [];
  if (".,".includes(chunk)) results.push([{ type: "symbol", symbol: chunk }]);
  if (DETERMINERS.includes(chunk))
    results.push([{ type: "word", lemma: chunk, pos: "관형사" }]);
  if (ADVERBS.includes(chunk))
    results.push([{ type: "word", lemma: chunk, pos: "부사" }]);
  results.push(...analyzer.analyze(chunk));

  const _result = extractArityDesignator(chunk);
  if (_result != null) results.push(_result);

  results = _makeSet(results);
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
  sentence = sentence.trim().replace(/\s+/g, ' ').replace(/\(.*?\)/g, '');
  while (sentence.length > 0) {
    let _result = extractNumericLiteral(sentence);
    if (_result != null) {
      result.push(..._result[0]);
      sentence = _result[1];
      continue;
    }

    const splitPattern = /^([^\s,."]+|[,.]|"[^"]*")\s*(.*)$/;
    const splitted = sentence.match(splitPattern);
    if (!splitted) break;
    result.push(...tagPOS(splitted[1], analyzer));
    sentence = splitted[2];
  }
  return result;
}

export { tokenize };
