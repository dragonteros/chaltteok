import { SyntaxError } from "../errors";
import { getKeyFromToken, Token } from "../lexer/tokens";
import { splitArray } from "../utils/utils";
import { Term, Tree } from "./ast";
import { IndexedPatterns, matchPattern } from "./pattern";

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

function parseSentence(tokens: Token[], patterns: IndexedPatterns): Tree {
  const phrases = splitArray(tokens, function (token) {
    if (token.type === "symbol") return null;
    const term: Term = { token, pos: token.pos };
    return new Tree(term, [], getKeyFromToken(token));
  });
  if (phrases[0].length === 0) {
    throw new SyntaxError("문장을 쉼표로 시작할 수 없습니다.");
  }
  if (phrases[phrases.length - 1].length === 0) {
    throw new SyntaxError("문장을 쉼표로 끝낼 수 없습니다.");
  }
  if (phrases.some((x) => x.length === 0)) {
    throw new SyntaxError("둘 이상의 쉼표를 연달아 쓸 수 없습니다.");
  }

  for (let i = 1; i < phrases.length; i += 2) {
    phrases[i] = phraseOperation(phrases[i], patterns);
  }
  const result = phraseOperation(phrases.flat(), patterns);

  if (result.length !== 1) {
    const formatted = result.map((x) => x.debug()).join("\n");
    throw new SyntaxError(
      `구문이 올바르지 않습니다: ${tokens.map(getKeyFromToken).join(" ")}\n\n` +
        `다음과 같이 해석되었습니다:\n\n${formatted}`
    );
  }
  return result[0];
}

export function parse(tokens: Token[], patterns: IndexedPatterns): Tree[] {
  const sentences = splitArray(tokens, (token) =>
    token.type === "symbol" && token.symbol === "." ? null : token
  );
  if (sentences[sentences.length - 1].length > 0) {
    throw new SyntaxError(
      `구문이 마침표로 끝나야 합니다: ${tokens.map(getKeyFromToken).join(" ")}`
    );
  }
  return sentences
    .filter((sentence) => sentence.length > 0)
    .map((sentence) => parseSentence(sentence, patterns));
}
