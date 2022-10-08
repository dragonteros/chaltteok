import { ChaltteokSyntaxError, InternalError } from "../base/errors";
import { mergeMetadata, WithMetadata } from "../base/metadata";
import { ConcreteTerm, getKeyFromTerm, Tree } from "../finegrained/terms";
import { getKeyFromToken, Token } from "../finegrained/tokens";
import { splitArray, zip } from "../utils/utils";
import { matchPattern } from "./matcher";
import { IndexedPatterns } from "./utils";

function phraseOperation(trees: Tree[], patterns: IndexedPatterns): Tree[] {
  trees = trees.slice();
  let i = 0;
  let backward = false;
  while (i < trees.length) {
    const maxBefore = backward ? i : 0;
    const maxAfter = trees.length - (i + 1);
    const match = matchPattern(trees, patterns, i, maxBefore, maxAfter);
    if (match != null) {
      const [bgn, end, item] = match;
      trees.splice(bgn, end - bgn, item);
      i = bgn;
      backward = true;
    } else {
      ++i;
      backward = false;
    }
  }
  return trees;
}

function parseSentence(
  tokens: WithMetadata<Token>[],
  patterns: IndexedPatterns
): Tree {
  if (tokens.length === 0) throw new InternalError("parseSentence::EMPTY");
  const phrases = splitArray(tokens, function ({ value: token, metadata }) {
    if (token.type === "symbol") return null;
    const term: ConcreteTerm = { token, pos: token.pos };
    return new Tree(term, [], metadata, getKeyFromToken(token));
  });
  if (phrases[0].length === 0) {
    throw new ChaltteokSyntaxError(
      "문장을 쉼표로 시작할 수 없습니다.",
      tokens[0].metadata
    );
  }
  if (phrases[phrases.length - 1].length === 0) {
    throw new ChaltteokSyntaxError(
      "문장을 쉼표로 끝낼 수 없습니다.",
      tokens[tokens.length - 1].metadata
    );
  }
  if (phrases.some((x) => x.length === 0)) {
    for (const [a, b] of zip(tokens, tokens.slice(1))) {
      if (a.value.type === "symbol" && b.value.type === "symbol") {
        throw new ChaltteokSyntaxError(
          "둘 이상의 쉼표를 연달아 쓸 수 없습니다.",
          mergeMetadata(a.metadata, b.metadata)
        );
      }
    }
    throw new InternalError("parseSentence::CONSECUTIVE_COMMA_NOT_FOUND");
  }

  for (let i = 0; i < phrases.length; i++) {
    phrases[i] = phraseOperation(phrases[i], patterns);
  }
  const result = phraseOperation(phrases.flat(), patterns);

  if (result.length !== 1) {
    const wantedPattern = result.map((x) => getKeyFromTerm(x.head)).join(" ");
    throw new ChaltteokSyntaxError(
      `"${wantedPattern}"#{이?}라는 구문을 이해하지 못했습니다.`,
      mergeMetadata(...tokens.map((token) => token.metadata))
    );
  }
  return result[0];
}

export function parse(
  tokens: WithMetadata<Token>[],
  patterns: IndexedPatterns
): Tree[] {
  const sentences = splitArray(tokens, (token) =>
    token.value.type === "symbol" && token.value.symbol === "." ? null : token
  );
  if (sentences[sentences.length - 1].length > 0) {
    throw new ChaltteokSyntaxError(
      "구문이 마침표로 끝나야 합니다.",
      tokens[tokens.length - 1].metadata
    );
  }
  return sentences
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => parseSentence(sentence, patterns));
}
