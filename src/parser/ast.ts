import {
  getKeyFromToken,
  POS,
  restoreTokenFromKey,
  Token,
} from "../lexer/tokens";

export type SimpleTerm = { pos: POS; token: Token };
export type ArgumentTerm = { pos: POS; index: number };
export type GenericTerm = { pos: POS; hasOmit: boolean };
export type Term = SimpleTerm | ArgumentTerm | GenericTerm;

export function parseTermKey(key: string): [Term, string] {
  const simple = key.match(/^[^{}]+$/);
  if (simple != null) {
    const token = restoreTokenFromKey(simple[0]);
    if (token.type === "symbol")
      throw new Error("Internal Error restoreTermFromKey::SYMBOL_TOKEN");
    return [{ token, pos: token.pos }, ""];
  }

  const complex = key.match(/^\{([^{}]*)\}(\w*)\[([^{}\[\]]+)\]$/);
  if (complex == null)
    throw new Error("Internal Error restoreTermFromKey::WRONG_FORMAT");
  const [main, sub, pos] = complex;

  if (main.startsWith("인수")) {
    const index = Number(main.slice(2));
    if (Number.isNaN(index))
      throw new Error("Internal Error restoreTermFromKey::NOT_NUMBER");
    return [{ index, pos: pos as any }, ""];
  }

  if (sub && sub !== "x")
    throw new Error("Internal Error restoreTermFromKey::WRONG_FORMAT");
  return [{ hasOmit: !!sub, pos: pos as any }, main];
}

export function restoreTermFromKey(key: string): Term {
  return parseTermKey(key)[0];
}

export function getKeyFromTerm(term: Term): string {
  if ("token" in term) return getKeyFromToken(term.token);
  if ("index" in term) return `{인수${term.index}}[${term.pos}]`;
  const sub = term.hasOmit ? "x" : "";
  return `{}${sub}[${term.pos}]`;
}

export class Tree {
  head: Term;
  children: Tree[];
  key: string;

  constructor(head: Term, children: Tree[], key: string) {
    this.head = head;
    this.children = children;
    this.key = key;
  }

  debug(level = 0) {
    let result = "";
    for (let i = 0; i < level; i++) result += " ";
    result += this.key + "\n";
    for (const child of this.children) {
      result += child.debug(level + 2);
    }
    return result;
  }
}
