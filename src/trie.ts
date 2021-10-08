type TrieNode<T> = { value?: T; children?: Map<string, TrieNode<T>> };

export class Trie<T> {
  root: TrieNode<T>;
  constructor() {
    this.root = {};
  }

  get(key: string): T | undefined {
    let node = this.root;
    for (let k of key) {
      if (!node.children) return;
      let child = node.children.get(k);
      if (!child) return;
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