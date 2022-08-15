import { POS, Token } from "../lexer/tokens";

export type SimpleTerm = { pos: POS; token: Token };
export type ArgumentTerm = { pos: POS; index: number };
export type GenericTerm = { pos: POS };
export type Term = SimpleTerm | ArgumentTerm | GenericTerm;

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
