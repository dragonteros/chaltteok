import { ChaltteokSyntaxError } from "../base/errors";
import {
  splitStringWithMetadata,
  trimStringWithMetadata,
  WithMetadata,
} from "../base/metadata";
import { getKeyFromToken, Token } from "../finegrained/tokens";
import {
  Analyzer,
  extractNativeNumeralLiteral,
  extractSinoNumericLiteral,
} from "./analyzer";

function _makeSet(items: WithMetadata<Token>[][]) {
  const result = [];
  const keys: Set<string> = new Set();
  for (const item of items) {
    const key = JSON.stringify(item.map((token) => token.value));
    if (!keys.has(key)) {
      result.push(item);
      keys.add(key);
    }
  }
  return result;
}

const FORBIDDEN = [
  /\[동사\] -지\[어미\] (?:아니하|않)다\[형용사\]/,
  /\[형용사\] -지\[어미\] (?:아니하|않)다\[동사\]/,
  /\[조사\] -지\[어미\] (?:아니하|않)다\[동사\]/,
  /몇\[명사\]\s*$/, // 몇[명사] 단독 사용 금지
];
const FORBIDDEN_AT_FINAL = [/(?:동사|형용사|관형사|부사|조사)\]$/];
const isForbidden = (x: string, isFinal: boolean) =>
  FORBIDDEN.some((p) => p.test(x)) ||
  (isFinal && FORBIDDEN_AT_FINAL.some((p) => p.test(x)));

function tagPOS(
  past: string,
  current: WithMetadata<string>,
  analyzer: Analyzer,
  isFinal: boolean
): WithMetadata<Token>[] {
  let results: WithMetadata<Token>[][] = [];
  const chunk = current.value;
  if (chunk === "." || chunk === ",")
    results.push([{ ...current, value: { type: "symbol", symbol: chunk } }]);
  results.push(...analyzer.analyze(current));

  const _result = extractNativeNumeralLiteral(current, analyzer);
  if (_result != null) results.push(..._result);

  results = _makeSet(results).filter(
    (hypothesis) =>
      !isForbidden(
        [past]
          .concat(hypothesis.map((x) => x.value).map(getKeyFromToken))
          .join(" "),
        isFinal
      )
  );

  if (results.length > 1) {
    throw new ChaltteokSyntaxError(
      "어절의 해석이 모호합니다.",
      current.metadata
    );
  }
  if (results.length === 0) {
    throw new ChaltteokSyntaxError(
      "어절을 해석할 수 없습니다.",
      current.metadata
    );
  }
  return results[0];
}

function tokenize(
  sentence: WithMetadata<string>,
  analyzer: Analyzer,
  isFinal = true
): WithMetadata<Token>[] {
  const result: WithMetadata<Token>[] = [];
  let past = "";
  function push(...args: WithMetadata<Token>[]) {
    result.push(...args);
    past = [past]
      .concat(args.map((arg) => arg.value).map(getKeyFromToken))
      .join(" ");
  }
  let rest: WithMetadata<string> = sentence;
  while (rest.value !== "") {
    const _result = extractSinoNumericLiteral(rest, analyzer);
    if (_result != null) {
      const analyses = _result[0];
      if (analyses.length !== 1) {
        throw new ChaltteokSyntaxError(
          "구문의 해석이 모호합니다.",
          sentence.metadata
        );
      }
      push(...analyses[0]);
      rest = _result[1];
      continue;
    }

    const splitPattern = /^[^\s,."]+|[,.]|"[^"]*"$/;
    const splitted = rest.value.match(splitPattern);
    if (!splitted) break;
    const [matched, remaining] = splitStringWithMetadata(
      rest,
      splitted[0].length
    );
    rest = trimStringWithMetadata(remaining);
    push(...tagPOS(past, matched, analyzer, isFinal && rest.value === ""));
  }
  return result;
}

export { tokenize };
