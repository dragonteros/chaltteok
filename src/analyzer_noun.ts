import { NOUNS } from "./keywords";
import { josa } from "josa";

const Josa = (s: string) => (n: string) => josa(n + s);

const josas: [string, any][] = [
  ["가", Josa("#{가}")],
  ["과", Josa("#{과}")],
  ["까지", Josa("까지")],
  ["나", Josa("#{이?}나")],
  ["는", Josa("#{는}")],
  ["로", Josa("#{로}")],
  ["를", Josa("#{를}")],
  ["만", Josa("만")],
  ["보다", Josa("보다")],
  ["부터", Josa("부터")],
  ["에", Josa("에")],
  ["에서", Josa("에서")],
  ["이-게", Josa("#{이?}게")],
  ["이-게", Josa("이게")],
  ["이-고", Josa("#{이?}고")],
  ["이-고", Josa("이고")],
  ["이-다", Josa("#{이?}다")],
  ["이-다", Josa("이다")],
  ["이-면", Josa("이면")],
  ["이-면", Josa("#{이?}면")],
  ["이-ㄴ", Josa("인")],
  ["이-ㄹ", Josa("일")],
  ["이-ㅁ", Josa("임")],
  ["이라고", Josa("#{이?}라고")],
  ["의", Josa("의")],
];

/* Trie */

type TrieNode<T> = { value?: T; children?: Map<string, TrieNode<T>> };

class Trie<T> {
  root: TrieNode<T>;
  constructor() {
    this.root = {};
  }

  get(key: string): T | undefined {
    let node = this.root;
    for (let k of key) {
      if (!node.children) return ;
      let child = node.children.get(k);
      if (!child) return ;
      node = child;
    }
    return node.value;
  }

  set(key: string, value: T): void {
    let node = this.root;
    for (let k of key) {
      if (!node.children) node.children = new Map();
      let child = node.children.get(k);
      if (child == null) {
        child = {};
        node.children.set(k, child);
      }
      node = child;
    }
    if (node.value != null) throw Error("Duplicate entries!");
    node.value = value;
  }

  /**
   * Searches for all strings found in Trie that are the prefixes of `key`.
   * @param key A string to search for prefixes
   * @returns A list of pairs of values and the suffix remaining after the prefix.
   */
  allPrefixes(key: string): [T, string][] {
    let results: [T, string][] = [];
    let node = this.root;
    for (let i = 0; i < key.length; i++) {
      if (!node.children) break;
      let child = node.children.get(key[i]);
      if (!child) break;
      if (child.value != null) results.push([child.value, key.slice(i + 1)]);
      node = child;
    }
    return results;
  }
}

/* Analyzer */

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

class NounAnalyzer {
  nouns: Trie<string>;
  constructor(nouns: string[]) {
    this.nouns = new Trie();
    for (const noun of nouns) {
      this.nouns.set(N(noun), noun);
    }
  }
  analyze(target: string): [string, string][] {
    let results: [string, string][] = [];
    for (const [noun, _] of this.nouns.allPrefixes(N(target))) {
      for (const [key, _josa] of josas) {
        if (_josa(noun) == target) results.push([noun, key]);
      }
    }

    let numTest = target.match(/^\d+/);
    if (numTest != null) {
      for (const [key, _josa] of josas) {
        let noun = numTest[0];
        if (_josa(noun) == target) results.push([noun, key]);
      }
    }
    return results;
  }
}

const nounAnalyzer = new NounAnalyzer(NOUNS)

export { nounAnalyzer };
