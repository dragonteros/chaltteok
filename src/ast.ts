import { ParseError, Token, POS } from "./analyzer";

export type SimpleTerm = {
  type: "simple";
  token: Token;
  pos: POS;
  name?: string;
};
export type GenericTerm = { type: "generic"; pos: POS; name?: string };
export type Term = SimpleTerm | GenericTerm;

export type TypeAnnotation = string | { listOf: TypeAnnotation };
export type TermType = {
  arity: number | { at_least: number } | "n";
  type: TypeAnnotation;
  variable?: boolean;
};
export type Overloading = {
  input?: TermType[];
  output?: TermType;
  register: [TermType | null, TermType | null]; // [get, set]
  processor: Processor | string[]; // function body, not yet deciphered
  argPerm?: (number | null)[]
};
export class Tree {
  head: Term;
  children: Tree[];
  overloading: Overloading[];

  constructor(head: Term, children: Tree[], overloading: Overloading[]) {
    this.head = head;
    this.children = children;
    this.overloading = overloading;
  }
}
export type AST = { processor: Processor; arguments: AST[] };

export type Scope = { [id: string]: ValuePack };
export class Env {
  scope: Scope;
  register?: ValuePack;
  constructor(scope: Scope, register?: ValuePack) {
    this.scope = scope;
    this.register = register;
  }
  clone() {
    let newScope: Scope = {};
    for (const key in this.scope) newScope[key] = this.scope[key];
    return new Env(newScope, this.register);
  }
  get(id: Identifier): ValuePack {
    if (this.scope[id.id] != null) return this.scope[id.id];
    throw new ParseError(id + "#{를} 찾을 수 없습니다.");
  }
  set(id: Identifier, value: ValuePack) {
    this.scope[id.id] = value;
  }
  getRegister(): ValuePack {
    if (this.register == null)
      throw new ParseError("Internal Error Env::getRegister::NO_REGISTER");
    return this.register;
  }
  setRegister(value: ValuePack) {
    this.register = value;
  }
}

export type Identifier = { type: "이름"; id: string };
export type List = { type: "List"; data: Value[] };
export type Value = number | boolean | Identifier | List;
export type ValuePack = Value[];

export type Processor = (
  env: Env,
  strict: (x: AST) => ValuePack
) => (...args: AST[]) => ValuePack;
