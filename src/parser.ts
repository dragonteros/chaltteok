import { ParseError, Token } from "./analyzer";
import { Tree } from "./ast";
import { matchPattern, IndexedPatterns } from "./pattern";

function _commaFreeSpan(
  trees: (Tree | ",")[],
  index: number
): [number, number] {
  if (index < 0 || index >= trees.length)
    throw new ParseError("Internal Error _commaFreeSpan::OUT_OF_RANGE");
  const before = trees.slice(0, index).lastIndexOf(",");
  const after = trees.slice(index + 1).indexOf(",");
  return [
    before !== -1 ? index - (before + 1) : index,
    after !== -1 ? after : trees.length - (index + 1),
  ];
}

function _stackOperation(
  trees: (Tree | ",")[],
  patterns: IndexedPatterns
): (Tree | ",")[] {
  trees = trees.slice();
  let i = 0;
  let backward = false;
  while (trees.length >= 2 && i < trees.length) {
    if (trees[i] === ",") {
      ++i;
      continue;
    }

    let [maxBefore, maxAfter] = _commaFreeSpan(trees, i);
    if (!backward) maxBefore = 0;

    let match = matchPattern(trees as Tree[], patterns, i, maxBefore, maxAfter);
    if (match != null) {
      const [bgn, end, item] = match;
      trees.splice(bgn, end - bgn, item);
      i = bgn;
      if (!backward) backward = true;
      continue;
    }
    backward = false;

    // test for comma
    const commaIdx = i + 1 + maxAfter;
    if (commaIdx < trees.length) {
      let noComma = trees.slice();
      noComma.splice(commaIdx, 1);

      const matchComma = matchPattern(
        noComma as Tree[],
        patterns,
        i,
        ..._commaFreeSpan(noComma, i)
      );
      if (matchComma != null) {
        trees = noComma;
        ++i;
        continue;
      }
    }
    ++i;
  }
  return trees;
}

function parseSentence(tokens: Token[], patterns: IndexedPatterns): Tree {
  let stack: (Tree | ",")[] = tokens.map(function (token) {
    if (token.type === "symbol") {
      if (token.symbol === ",") return ",";
      throw new ParseError("Internal Error parseSentence::ILLEGAL_SYMBOL");
    }
    return new Tree({ type: "simple", token, pos: token.pos });
  });

  stack = _stackOperation(stack, patterns);
  while (stack.length > 1) {
    const commaIdx = stack.lastIndexOf(",");
    if (commaIdx === -1) break;
    stack.splice(commaIdx, 1);
    stack = _stackOperation(stack, patterns);
  }
  if (stack.length !== 1) throw new ParseError("구문이 올바르지 않습니다.");
  if (stack[0] === ",")
    throw new ParseError("Internal Error parseSentence::COMMA_RETURNED");
  return stack[0];
}

export function constructForest(
  tokens: Token[],
  patterns: IndexedPatterns
): Tree[] {
  let sentence: Token[] = [];
  let forest: Tree[] = [];
  for (const token of tokens) {
    if (token.type === "symbol" && token.symbol === ".") {
      forest.push(parseSentence(sentence, patterns));
      sentence = [];
    } else {
      sentence.push(token);
    }
  }
  if (sentence.length) throw new ParseError("구문은 마침표로 끝나야 합니다.");
  return forest;
}
