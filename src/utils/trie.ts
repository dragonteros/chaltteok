type TrieNode<T> = { value?: T; children?: Map<string, TrieNode<T>> };

function _cloneNode<T>(node: TrieNode<T>): TrieNode<T> {
  if (!node.children) return { value: node.value };
  const children = new Map<string, TrieNode<T>>();
  for (const [key, value] of node.children.entries()) {
    children.set(key, _cloneNode(value));
  }
  return { value: node.value, children };
}

export class Trie<T> {
  root: TrieNode<T>;
  constructor() {
    this.root = {};
  }

  clone(): Trie<T> {
    const other = new Trie<T>();
    other.root = _cloneNode(this.root);
    return other;
  }

  get(key: string): T | undefined {
    let node = this.root;
    for (const k of key) {
      if (!node.children) return;
      const child = node.children.get(k);
      if (!child) return;
      node = child;
    }
    return node.value;
  }

  set(key: string, value: T): void {
    let node = this.root;
    for (const k of key) {
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
    const results: [T, string][] = [];
    let node = this.root;
    for (let i = 0; i < key.length; i++) {
      if (!node.children) break;
      const child = node.children.get(key[i]);
      if (!child) break;
      if (child.value != null) results.push([child.value, key.slice(i + 1)]);
      node = child;
    }
    return results;
  }
}
