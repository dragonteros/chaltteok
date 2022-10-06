import { ChaltteokSyntaxError } from "../base/errors";
import { mergeMetadata, SourceMetadata } from "../base/metadata";
import { getKeyFromTerm, Term, Tree } from "../finegrained/terms";
import { getKeyFromToken, Token, WordToken } from "../finegrained/tokens";
import { zip } from "../utils/utils.js";
import { IndexedPatterns, PatternArray } from "./utils";

export function equalWord(word1: Token, word2: Token): boolean {
  return getKeyFromToken(word1) === getKeyFromToken(word2);
}
function _matches(tree: Tree, term: Term): boolean {
  const head = tree.head;
  if (term.pos !== head.pos) return false;
  if ("token" in term) {
    return "token" in head && equalWord(head.token, term.token);
  }
  // term is GenericTerm
  if ("hasOmit" in head) return head.hasOmit === term.hasOmit;

  if (head.token.type === "id" || head.token.type === "number") return true;
  return false;
}
const 과: WordToken = { type: "word", lemma: "과", pos: "조사" };
function _is과(tree: Tree) {
  const term = tree.head;
  return "token" in term && equalWord(term.token, 과);
}
function _matchAnd(
  trees: Tree[],
  i: number,
  bgn: number,
  end: number
): [number, number, Tree[]] | null {
  const focus = trees[i];
  const children = focus.key === "~과~" ? focus.children : [focus];

  if (_is과(focus)) {
    if (i <= bgn || i >= end - 1) return null;
    const before = _matchAnd(trees, i - 1, bgn, i);
    if (before == null) return null;
    const after = _matchAnd(trees, i + 1, i + 1, end);
    if (after == null) return null;
    return [before[0], after[1], before[2].concat(after[2])];
  }
  if (!_matches(focus, { pos: "명사", hasOmit: false })) return null;

  const 과before = i >= bgn + 2 && _is과(trees[i - 1]);
  const 과after = i < end - 2 && _is과(trees[i + 1]);
  const before = 과before ? _matchAnd(trees, i - 2, bgn, i - 1) : null;
  const after = 과after ? _matchAnd(trees, i + 2, i + 2, end) : null;
  if (before == null && after == null) return [i, i + 1, children];

  const _bgn = before ? before[0] : i;
  const _end = after ? after[1] : i + 1;
  const _children = (before ? before[2] : [])
    .concat(children)
    .concat(after ? after[2] : []);
  return [_bgn, _end, _children];
}
function getKeysFromTerm(x: Term): string[] {
  const keys: string[] = [getKeyFromTerm(x)];
  if ("token" in x) {
    if (x.token.type === "number" || x.token.type === "id") {
      keys.push(getKeyFromTerm({ pos: x.pos, hasOmit: false }));
    }
  }
  return keys;
}
function _matchPattern(
  trees: Tree[],
  candidates: PatternArray,
  i: number
): [number, number, Tree] | null {
  const metadata: SourceMetadata = mergeMetadata(
    ...trees.map((tree) => tree.metadata)
  );

  for (const [precededBy, followedBy, patterns] of candidates.enumerate()) {
    const [bgn, end] = [i - precededBy, i + 1 + followedBy];
    const target = trees.slice(bgn, end) as Tree[];
    const outputs: Record<string, [Term, Tree[], SourceMetadata]> = {};
    for (const pattern of patterns) {
      const input = pattern.input;
      if (!zip(target, input).every((pair) => _matches(...pair))) continue;

      const children: Tree[] = [];
      for (let i = 0; i < target.length; i++) {
        if (!("token" in input[i])) children.push(target[i]);
      }

      if (!(pattern.key in outputs)) {
        outputs[pattern.key] = [pattern.output, children, metadata];
      } else {
        const a = pattern.output.pos;
        const b = outputs[pattern.key][0].pos;
        if (a !== b) {
          throw new ChaltteokSyntaxError(
            `패턴의 품사 ${a}#{가} 앞서 정의한 패턴의 품사 ${b}#{와} 다릅니다.`,
            pattern.definition
          );
        }
      }
    }
    const cands = Object.keys(outputs);
    if (cands.length === 0) continue;
    if (cands.length > 1) {
      throw new ChaltteokSyntaxError(
        "구문이 여러 가지로 해석될 수 있습니다.",
        metadata
      );
    }
    const key = cands[0];
    return [bgn, end, new Tree(...outputs[key], key)]; // Since already sorted
  }
  return null;
}

export function matchPattern(
  trees: Tree[],
  patterns: IndexedPatterns,
  i: number,
  maxBefore: number,
  maxAfter: number
): [number, number, Tree] | null {
  const results: [number, number, Tree][] = [];

  const _m = _matchAnd(trees, i, i - maxBefore, i + 1 + maxAfter);
  if (_m != null) {
    const [bgn, end, children] = _m;
    if (end - bgn > 1) {
      const head: Term = { pos: "명사", hasOmit: false };
      const metadata: SourceMetadata = mergeMetadata(
        ...trees.map((tree) => tree.metadata)
      );
      const output = new Tree(head, children, metadata, "~과~");
      results.push([bgn, end, output]);
    }
  }

  let candidates: PatternArray = new PatternArray();
  for (const key of getKeysFromTerm(trees[i].head)) {
    let entries = patterns.get(key);
    if (!entries) continue;
    entries = entries.sliceBefore(0, maxBefore + 1).sliceAfter(0, maxAfter + 1);
    candidates = candidates.concat(entries);
  }
  const result = _matchPattern(trees, candidates, i);
  if (result != null) results.push(result);

  // choose the longest among the earliest
  let minBgn = i + 1;
  let maxLen = 0;
  let item: [number, number, Tree] | null = null;
  for (const [bgn, end, tree] of results) {
    if (bgn < minBgn) {
      minBgn = bgn;
      maxLen = end - bgn;
      item = [bgn, end, tree];
    } else if (bgn === minBgn && maxLen < end - bgn) {
      maxLen = end - bgn;
      item = [bgn, end, tree];
    }
  }
  return item;
}
