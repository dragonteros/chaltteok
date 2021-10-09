import { ParseError, Token, WordToken, POS } from "./analyzer";

class InterpretError extends ParseError {}

export function equalWord(word1: Token, word2: WordToken): boolean {
  if (word1.type !== word2.type) return false;
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

type Scope = { [id: string]: Value };
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
  get(id: string): Value {
    if (this.scope[id] != null) return this.scope[id];
    throw new ParseError(id + "#{를} 찾을 수 없습니다.");
  }
  set(id: string, value: Value) {
    this.scope[id] = value;
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

export class 나눔 {
  type: "나눔" = "나눔";
  값: number;
  몫: number;
  나머지: number;
  constructor(dividend: number, divisor: number) {
    const remainder = dividend % divisor;
    this.값 = dividend / divisor;
    this.몫 = (dividend - remainder) / divisor;
    this.나머지 = remainder;
  }
}
type 범위 = { type: "범위"; start: number; end: number };
type 수 = number;
type 이름 = { type: "이름"; id: string };
type 참거짓 = boolean;
type List = { type: "List"; data: Value[] };
export type Value = 수 | 참거짓 | 나눔 | 이름 | 범위 | List;
export type ValuePack = { values: Value[] };

type Processor = (env: Env, ...args: ValuePack[]) => [Env, ValuePack];
const id: Processor = (env, arg: ValuePack) => [env, arg];

function pure<T>(f: (...args: T[]) => Value) {
  return (env: Env, ...args: T[]): [Env, Value] => [env, f(...args)];
}
function op<T extends Value>(
  f: (env: Env, ...args: T[]) => [Env, Value]
): Processor {
  return function (env, ...args) {
    const unwrapped = args
      .map((x) => x.values[0])
      .map((x) =>
        typeof x === "object" && x.type === "이름" ? env.get(x.id) : x
      );
    const newArgs = unwrapped as T[];
    const [newEnv, value] = f(env, ...newArgs);
    return [newEnv, { values: [value] }];
  };
}
function spread(f: Processor): Processor {
  return function (env: Env, arg: ValuePack) {
    const spreaded: ValuePack[] = arg.values.map((x) => ({ values: [x] }));
    return f(env, ...spreaded);
  };
}

const add = pure<number>((...nums: number[]) => nums.reduce((x, y) => x + y));
const mul = pure<number>((...nums: number[]) => nums.reduce((x, y) => x * y));
function setID(env: Env, value: ValuePack, id: ValuePack): [Env, ValuePack] {
  let newEnv = env.clone();
  let _id = id.values[0];
  if (typeof _id !== "object" || _id.type !== "이름")
    throw new InterpretError("'이름' 자료형의 객체가 와야 합니다.");
  newEnv.set(_id.id, value.values[0]);
  return [newEnv, { values: [] }];
}

// `[...]` means it admits (at most) one ommission (_)
type PatternMap = { [x: string]: Processor };
const BUILTIN_PATTERN: PatternMap = {
  "{1 수}d {1 수}n 곱절n -> {1 수}n": op<number>(mul),
  "{1 수}d {1 수}n 제곱s -> {1 수}n": op<number>(pure<number>(Math.pow)),
  "{1 수}d 갑절n -> {1 수}n": op<number>(pure<number>((x) => 2 * x)),
  "{1 수}d 값n -> {1 수}n": id,
  "{2+ 수}d 곱n -> {1 수}n": spread(op<number>(mul)),
  "{1 수}d 제곱n -> {1 수}n": op<number>(pure<number>((x) => x * x)),
  "{2 수}d 차n -> {1 수}n": spread(
    op<number>(pure<number>((x, y) => Math.abs(x - y)))
  ),
  "{2+ 수}d 합n -> {1 수}n": spread(op<number>(add)),

  "{1 수}n 로p {1 수}n 가p 나누어떨어지다v -> {1 참거짓}v": op<number>(
    pure<number>((y, x) => x % y === 0)
  ),
  "[{1 수}n 가p] [{1 수}n 로p] 나누어떨어지다v -> {1 참거짓}v": op<number>(
    pure<number>((x, y) => x % y === 0)
  ),
  "{1 수} 보다p {1 수}n 가p 작다v -> {1 참거짓}v": op<number>(
    pure<number>((y, x) => x < y)
  ),
  "[{1 수}n 가p] {1 수} 보다p 작다v -> {1 참거짓}v": op<number>(
    pure<number>((x, y) => x < y)
  ),
  "{1 수} 보다p {1 수}n 가p 크다v -> {1 참거짓}v": op<number>(
    pure<number>((y, x) => x > y)
  ),
  "[{1 수}n 가p] {1 수} 보다p 크다v -> {1 참거짓}v": op<number>(
    pure<number>((x, y) => x > y)
  ),
  "{1 수}n 로p {1 수}n 를p 나누다v -> {1 나눔}v": op<number>(
    pure<number>((y, x) => new 나눔(x, y))
  ),
  "[{1 수}n 를p] [{1 수}n 로p] 나누다v -> {1 나눔}v": op<number>(
    pure<number>((x, y) => new 나눔(x, y))
  ),
  "[{1 수}n 에p] {1 수}n 를p 곱하다v -> {1 수}v": op<number>(mul),
  "[{1 수}n 를p] {1 수}n 과p 곱하다v -> {1 수}v": op<number>(mul),
  "[{2+ 수}n 를p] 곱하다v -> {1 수}v": spread(op<number>(mul)),
  "[{1 수}n 에p] {1 수}n 를p 더하다v -> {1 수}v": op<number>(add),
  "[{1 수}n 를p] {1 수}n 과p 더하다v -> {1 수}v": op<number>(add),
  "[{2+ 수}n 를p] 더하다v -> {1 수}v": spread(op<number>(add)),
  "{1 수}n 부터p {1 수}n 까지p -> {1 범위}n": op<number>(
    pure<number>((start, end): 범위 => ({ type: "범위", start, end }))
  ),
  "{1 수}n 분s 의p {1 수}n -> {1 수}n": op<number>(
    pure<number>((x, y) => y / x)
  ),
  "{1 수}n 를p {1 수}n 에서p 빼다v -> {1 수}v": op<number>(
    pure<number>((y, x) => x - y)
  ),
  "[{1 수}n 에서p] [{1 수}n 를p] 빼다v -> {1 수}v": op<number>(
    pure<number>((x, y) => x - y)
  ),

  "{1 참거짓}v -(으)ㄴ지e -> {1 참거짓}n": id,
  // "{1 참거짓}v -고e {1 참거짓}v -> {1 참거짓}v": op<boolean>(pure<boolean>((x, y) => x && y)),
  "{1 참거짓}v -거나e {1 참거짓}v -> {1 참거짓}v": op<boolean>(
    pure<boolean>((x, y) => x || y)
  ),
  "{1 참거짓}v -지e 아니하다v -> {1 참거짓}v": op<boolean>(
    pure<boolean>((x) => !x)
  ),
  "{1 참거짓}v -지e 않다v -> {1 참거짓}v": op<boolean>(
    pure<boolean>((x) => !x)
  ),
  "{1 참거짓}v -면e {n T}n 아니다v -면e {n T}n -> {n T}n": (
    env,
    pred,
    x,
    y
  ) => [env, pred.values[0] ? x : y],

  "[{1 T}n 를p] {1 이름}n 로p 두다v -> {}v": setID,
  "[{1 T}n 를p] {1 이름}n 로p 삼다v -> {}v": setID,
  "[{1 T}n 가p] {1 이름}n 가p 되다v -> {}v": setID,
  "[{1 T}n 가p] {1 이름}n 로p 되다v -> {}v": setID,
  "[{1 T}n 를p] {1 이름}n 로p 하다v -> {}v": setID,
  "[{1 T}n 를p] {1 이름}n 이라고p 하다v -> {}v": setID,

  "[{1 T}n 가p] {1 T}n 과p 같다v -> {1 참거짓}v": spread(
    op<Value>(
      pure<Value>((...args) => args.slice(1).every((x) => x === args[0]))
    )
  ),
  "[{2+ T}n 가p] 같다v -> {1 참거짓}v": spread(
    op<Value>(
      pure<Value>((...args) => args.slice(1).every((x) => x === args[0]))
    )
  ),
  "[{1 T}n 가p] {1 T}n 과p 다르다v -> {1 참거짓}v": spread(
    op<Value>(
      pure<Value>((...args) => args.slice(1).every((x) => x === args[0]))
    )
  ),
  "[{2+ T}n 가p] 다르다v -> {1 참거짓}v": spread(
    op<Value>(
      pure<Value>((...args) => args.slice(1).some((x) => x !== args[0]))
    )
  ),
  "[{1 T[]}n 가p] 비다v -> {1 참거짓}v": op<List>(
    pure<List>((x) => x.data.length === 0)
  ),
  "{1 T}n 가p {1 T}n 이다p -> {1 참거짓}v": op<Value>(
    pure<Value>((x, y) => x === y)
  ),
  "[{1 T}n 가p] {1 T} 가p 아니다v -> {1 참거짓}v": op<Value>(
    pure<Value>((x, y) => x !== y)
  ),
  // 사용자가 새 자료형 만들면 추가됨
  "{1 나눔}d 값n -> {1 수}n": op<나눔>(pure<나눔>((x) => x.값)),
  "{1 나눔}d 나머지n -> {1 수}n": op<나눔>(pure<나눔>((x) => x.나머지)),
  "{1 나눔}d 몫n -> {1 수}n": op<나눔>(pure<나눔>((x) => x.몫)),

  "{n T}v -(아/어)e 있다v -> {n T}v": id,

  // 위의 것으로 안되면 다음을 적용하고 재시도
  "{n T}d 것n -> {n T}n": id,

  "{n T}n 과p {1 T}n -> {n+1 T}n": function (env, acc, cur): [Env, ValuePack] {
    return [env, { values: acc.values.concat(cur.values) }];
  },
  "{n T}n 의p -> {n T}d": id,

  "{n T}v -(아/어)e -> {}": function (env, pack): [Env, ValuePack] {
    let newEnv = env.clone();
    newEnv.setRegister(pack);
    return [newEnv, { values: [] }];
  },
  "{n T}v -(으)ㄴe -> {n T}d": id,
  "{n T}v -(으)ㄴ다/-는다e -> {n T}v": id,
  "{n T}v -(으)ㄹe -> {n T}d": id,
  "{n T}v -(으)ㅁe -> {n T}n": id,
  "{n T}v -고e -> {}": function (env, pack): [Env, ValuePack] {
    let newEnv = env.clone();
    newEnv.setRegister(pack);
    return [newEnv, { values: [] }];
  },
  "{n T}v -기e -> {n T}n": id,
  "{n T}v -는e -> {n T}d": id,
  "{n T}v -다e -> {n T}v": id,
  "{n T}v -자e -> {n T}v": id,

  "{} {n T}v -> {n T}v": (env, _, cur) => [env, cur], // TODO: logical and
};

type SimpleTerm = { type: "simple"; token: Token; pos: POS };
type TermArity = number | [">=", number] | "n" | "n+1";
type GenericTerm = {
  type: "generic";
  arity: TermArity;
  pos: POS;
  name?: string;
};
type Term = SimpleTerm | GenericTerm;
type Phrase = { terms: Term[]; omit: boolean };

function defaultProcessor(term: Term): Processor | undefined {
  if (term.type === "generic")
    throw new ParseError("Internal Error defaultProcessor::GENERIC_TERM");
  let value: Value;
  if (term.token.type === "id") value = { type: "이름", id: term.token.lemma };
  else if (term.token.type === "number") value = term.token.number;
  else if (term.token.type === "word") {
    if (term.token.lemma === "참") value = true;
    else if (term.token.lemma === "거짓") value = false;
    else return;
  } else return;
  return (env: Env) => [env, { values: [value] }];
}

export class Tree {
  head: Term;
  children: Tree[];
  processor?: Processor;
  omitIndex?: number;

  constructor(
    head: Term,
    children?: Tree[],
    processor?: Processor,
    omitIndex?: number
  ) {
    if (head.type !== "simple" && typeof head.arity !== "number")
      throw new ParseError("Internal Error Tree::GENERIC_ARITY");

    this.head = head;
    this.children = children || [];
    this.processor = processor || defaultProcessor(head);
    this.omitIndex = omitIndex;
  }
}

class Pattern {
  _pattern: string;
  processor: Processor;
  inputPhrases: Phrase[];
  returnTerm: GenericTerm;
  minTerms: number;
  constructor(pattern: string, processor: Processor) {
    this._pattern = pattern;
    this.processor = processor;
    const [left, right] = pattern.split("->", 2);
    const returnTerm = this.parseTerm(right.trim());
    if (returnTerm.type === "simple")
      throw new ParseError("Internal Error Pattern::SIMPLE_RETURN_TERM");
    if (typeof returnTerm.arity === "object")
      throw new ParseError("Internal Error Pattern::RANGE_ARITY_RETURN_TERM");
    this.returnTerm = returnTerm;

    if (this._pattern === "{n T}v -다e -> {n T}v") {
      console.log("hi");
    }
    let totalTerms = 0;
    let maxOmit = 0;
    this.inputPhrases = [];
    let _phrases = left.trim().split(/\s*(\[.+?[^\[]\])\s*/g);
    if (!_phrases)
      throw new ParseError(
        "Internal Error Pattern::NO_INPUT_PHRASES " + pattern
      );
    for (let _phrase of _phrases) {
      _phrase = _phrase.trim();
      if (!_phrase) continue;
      const omit = _phrase[0] === "[";
      if (omit) _phrase = _phrase.slice(1, -1);

      let _terms = _phrase.match(/\{[^{}\s]+ [^{}\s]+\}\w?|\{\}\w?|[^{}\s]+/g);
      if (!_terms)
        throw new ParseError(
          "Internal Error Pattern::NO_INPUT_TERMS " + pattern
        );
      const terms = _terms.map((x) => this.parseTerm(x));
      this.inputPhrases.push({ terms, omit });

      totalTerms += terms.length;
      if (omit) maxOmit = Math.max(maxOmit, terms.length);
    }
    this.minTerms = totalTerms - maxOmit;
  }

  splitPOS(chunk: string): [string, POS] {
    const posMark: { [x: string]: string } = {
      n: "체언",
      v: "용언",
      d: "관형사",
      p: "조사",
      e: "어미",
      s: "접미사",
    };
    const pos = posMark[chunk[chunk.length - 1]];
    return pos ? [chunk.slice(0, -1), pos as POS] : [chunk, "부사"];
  }

  parseTerm(chunk: string): Term {
    const [lemma, pos] = this.splitPOS(chunk);
    if (!lemma.includes("{"))
      return { type: "simple", token: { type: "word", lemma, pos }, pos };

    if (lemma === "{}") return { type: "generic", arity: 0, pos };
    let [_arity, _] = lemma.slice(1, -1).split(" ", 2);
    let arity: TermArity;
    if (_arity === "n" || _arity === "n+1") arity = _arity;
    else if (_arity.slice(-1) === "+")
      arity = [">=", parseInt(_arity.slice(0, -1))];
    else arity = parseInt(_arity);
    return { type: "generic", arity, pos };
  }

  realize(arity: number | null): GenericTerm {
    let _arity: number;
    if (typeof this.returnTerm.arity === "number") {
      _arity = this.returnTerm.arity;
    } else {
      if (arity == null)
        throw new ParseError("Internal Error realize::NO_ARITY_REQUIREMENT");
      _arity = arity + (this.returnTerm.arity === "n" ? 0 : 1);
    }
    return {
      type: "generic",
      arity: _arity,
      pos: this.returnTerm.pos,
      name: this._pattern,
    };
  }

  sequenceCandidates(): [Term[], number | undefined][] {
    let cands: [Term[], number | undefined][] = [];
    cands.push([this.inputPhrases.flatMap((p) => p.terms), undefined]);

    for (let i = 0; i < this.inputPhrases.length; i++) {
      if (!this.inputPhrases[i].omit) continue;
      const phrasesOmitted = this.inputPhrases.filter((_, j) => j !== i);
      cands.push([phrasesOmitted.flatMap((p) => p.terms), i]);
    }
    return cands;
  }

  _matchTerm(tree: Tree, term: Term): boolean | number {
    if (tree.head.pos !== term.pos) return false;
    if (term.type === "simple") {
      return (
        tree.head.type === "simple" &&
        equalWord(tree.head.token, term.token as WordToken)
      );
    }
    if (tree.head.type === "simple") {
      if (tree.head.token.type === "word") return false;
      if (tree.head.token.type === "arity") return false;
      if (typeof term.arity === "number") return term.arity === 1;
      if (typeof term.arity === "object") return 1 >= term.arity[1];
      const n = term.arity === "n" ? 1 : 0;
      return n;
    }
    const treeArity = tree.head.arity;
    if (typeof treeArity !== "number" || term.arity === "n+1")
      throw new ParseError("Internal Error _matchTerm::GENERIC_ARITY");

    if (typeof term.arity === "number") return term.arity === treeArity;
    if (typeof term.arity === "object") return treeArity >= term.arity[1];
    return treeArity;
  }

  _match(trees: Tree[], candidate: Term[]): [GenericTerm, Tree[]] | null {
    if (trees.length !== candidate.length)
      throw new ParseError("Internal Error _match::LENGTH_MISMATCH");
    let args: Tree[] = [];
    let req: number | null = null;
    for (let i = 0; i < trees.length; i++) {
      const match = this._matchTerm(trees[i], candidate[i]);
      if (match === false) return null;
      if (candidate[i].type !== "simple") args.push(trees[i]);
      if (match === true) continue;
      if (match != null) {
        if (req == null) req = match;
        if (req !== match) return null;
      }
    }
    return [this.realize(req), args];
  }

  _hasComma(trees: (Tree | ",")[], consume: number): [Tree[], boolean] | null {
    if (trees.length < consume) return null;
    let target = trees.slice(-consume);

    if (target.every((x): x is Tree => x !== ",")) return [target, false];

    if (trees.length <= consume) return null;
    target = trees.slice(-consume - 1);

    let filtered = target.filter((x): x is Tree => x !== ",");
    let numComma = target.length - filtered.length;
    if (numComma > 1) return null;
    return [filtered, true];
  }

  match(trees: (Tree | ",")[]): [number, Tree] | "COMMA" | null {
    // ',' : it would have matched if there weren't comma
    if (trees.length < this.minTerms) return null;

    let hadComma = false;
    for (const [candidate, omitIndex] of this.sequenceCandidates()) {
      const targetHasComma = this._hasComma(trees, candidate.length);
      if (targetHasComma == null) continue;
      let [target, hasComma] = targetHasComma;
      let match = this._match(target, candidate);
      if (match == null) continue;
      if (hasComma) {
        hadComma = true;
        continue;
      }
      return [candidate.length, new Tree(...match, this.processor, omitIndex)];
    }
    return hadComma ? "COMMA" : null;
  }
}

let patternList: Pattern[] = Object.entries(BUILTIN_PATTERN).map(
  ([p, f]) => new Pattern(p, f)
);

function _stackOperation(
  stack: (Tree | ",")[]
): [number, Tree] | "COMMA" | null {
  for (const pattern of patternList) {
    const match = pattern.match(stack);
    if (!match) continue;
    return match;
  }
  return null;
}

function parseSentence(tokens: Token[]): Tree {
  let stream: (Tree | ",")[] = tokens.map(function (token) {
    if (token.type === "symbol") {
      if (token.symbol === ",") return ",";
      throw new ParseError("Internal Error parseSentence::ILLEGAL_SYMBOL");
    }
    return new Tree({ type: "simple", token, pos: token.pos });
  });

  let stack: (Tree | ",")[] = [];
  for (const leaf of stream) {
    stack.push(leaf);
    if (leaf === ",") continue;
    while (stack.length >= 2) {
      const match = _stackOperation(stack);
      if (!match) break;
      else if (match === "COMMA") {
        const idx = stack.lastIndexOf(",");
        if (idx === -1)
          throw new ParseError("Internal Error parseSentence::COMMA_NOT_FOUND");
        stack.splice(idx, 1);
        break;
      }

      const [consumed, output] = match;
      if (consumed === 0)
        throw new ParseError("Internal Error parseSentence::NOT_CONSUMED");
      stack.splice(-consumed, consumed, output);
    }
  }
  if (stack.length !== 1) throw new ParseError("구문이 올바르지 않습니다.");
  if (stack[0] === ",")
    throw new ParseError("Internal Error parseSentence::COMMA_RETURNED");
  return stack[0];
}

export function constructForest(tokens: Token[]): Tree[] {
  let sentence: Token[] = [];
  let forest: Tree[] = [];
  for (const token of tokens) {
    if (token.type === "symbol" && token.symbol === ".") {
      forest.push(parseSentence(sentence));
      sentence = [];
    } else {
      sentence.push(token);
    }
  }
  if (sentence.length) throw new ParseError("구문은 마침표로 끝나야 합니다.");
  return forest;
}
