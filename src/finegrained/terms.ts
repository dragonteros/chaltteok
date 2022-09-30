import { InternalError } from "../base/errors";
import { WithMetadata } from "../base/metadata";
import { POS } from "../base/pos";
import { getKeyFromToken, restoreTokenFromKey, Token } from "./tokens";

export type ConcreteTerm = { pos: POS; token: Token };
export type GenericTerm = { pos: POS; hasOmit: boolean };
export type Term = ConcreteTerm | GenericTerm;

export function parseTermKey(key: string): [Term, string] {
  const simple = key.match(/^[^{}]+$/);
  if (simple != null) {
    const token = restoreTokenFromKey(simple[0]);
    if (token.type === "symbol")
      throw new InternalError("restoreTermFromKey::SYMBOL_TOKEN");
    return [{ token, pos: token.pos }, ""];
  }

  const complex = key.match(/^\{([^{}]*)\}(\w*)\[([^{}\[\]]+)\]$/);
  if (complex == null)
    throw new InternalError("restoreTermFromKey::WRONG_FORMAT " + key);
  const [, main, sub, pos] = complex;

  if (sub && sub !== "x")
    throw new InternalError("restoreTermFromKey::WRONG_FORMAT " + key);
  return [{ hasOmit: !!sub, pos: pos as any }, main];
}

export function restoreTermFromKey(key: string): Term {
  return parseTermKey(key)[0];
}

export function getKeyFromTerm(term: Term): string {
  if ("token" in term) return getKeyFromToken(term.token);
  const sub = term.hasOmit ? "x" : "";
  return `{}${sub}[${term.pos}]`;
}

// Will be converted to AST after retrieving action via key
export class Tree {
  head: WithMetadata<Term>;
  children: Tree[];
  key: string;

  constructor(head: WithMetadata<Term>, children: Tree[], key: string) {
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
