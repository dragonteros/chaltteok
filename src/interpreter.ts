import { Yongeon } from "eomi-js";

import { Analyzer, ParseError, WordToken } from "./analyzer";
import { tokenize } from "./tokenizer";
import { constructForest, Tree, equalWord } from "./parser";

type LiteralNode = number;
type Operator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "차"
  | "제곱"
  | "거듭제곱"
  | "나누다"
  | "나누어떨어지다";
type OperationNode = { type: "op"; operator: Operator; operands: ASTNode[] };
type AttrAccessNode = { type: "attr"; object: ASTNode; attr: string };
export type ASTNode = LiteralNode | OperationNode | AttrAccessNode;

type Division = { valueOf: () => number; 몫: number; 나머지: number };
type Value = number | boolean | Division;

function interpret(ast: ASTNode, env: Definition[]): Value {
  if (typeof ast === "number") return ast;
  if (ast.type === "attr") {
    const operand = interpret(ast.object, env);
    if (typeof operand !== "object") throw new ParseError();
    if (ast.attr !== "몫" && ast.attr !== "나머지") throw new ParseError();
    return operand[ast.attr];
  }

  const f = (x: ASTNode) => interpret(x, env).valueOf();
  let operands;

  switch (ast.operator) {
    case "+":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return operands.reduce((a, b) => a + b);
    case "-":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return operands[0] - operands[1];
    case "*":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return operands.reduce((a, b) => a * b);
    case "/":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return operands[0] / operands[1];
    case "차":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return Math.abs(operands[0] - operands[1]);
    case "제곱":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return Math.pow(operands[0], 2);
    case "거듭제곱":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return Math.pow(operands[0], operands[1]);
    case "나누다": {
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      const [numerator, denominator] = operands;
      const remainder = numerator % denominator;
      const result: Division = {
        valueOf: () => numerator / denominator,
        몫: (numerator - remainder) / denominator,
        나머지: remainder,
      };
      return result;
    }
    case "나누어떨어지다":
      operands = ast.operands.map(f);
      if (!operands.every((x): x is number => typeof x === "number"))
        throw new ParseError();
      return operands[0] % operands[1] === 0;
  }
}

const 가: WordToken = { type: "word", lemma: "가", pos: "조사" };
const 를: WordToken = { type: "word", lemma: "를", pos: "조사" };
const 로: WordToken = { type: "word", lemma: "로", pos: "조사" };
const 에서: WordToken = { type: "word", lemma: "에서", pos: "조사" };
const 의: WordToken = { type: "word", lemma: "의", pos: "조사" };

const v2a: WordToken[] = [
  { type: "word", lemma: "-(으)ㄴ", pos: "어미" },
  { type: "word", lemma: "-는", pos: "어미" },
];

function matchAndUnwrap(children: Tree[], allowlist: WordToken[]): Tree[] {
  if (children.length !== 1) throw new ParseError();
  let child = children[0];
  if (!allowlist.some((x) => equalWord(child.head, x))) throw new ParseError();
  return child.children;
}

function processNoun(head: WordToken, children: Tree[]): ASTNode {
  let operands;
  switch (head.lemma) {
    case "제곱":
      if (head.pos === "체언") {
        operands = matchAndUnwrap(children, [의]);
        if (operands.length !== 1) throw new ParseError();
        return {
          type: "op",
          operator: head.lemma,
          operands: operands.map(concreteToAST),
        };
      } else if (head.pos === "접미사") {
        if (children.length !== 1) throw new ParseError();
      } else throw new ParseError();

    case "곱":
      operands = matchAndUnwrap(children, [의]);
      if (operands.length === 0) throw new ParseError();
      return {
        type: "op",
        operator: "*",
        operands: operands.map(concreteToAST),
      };

    case "합":
      operands = matchAndUnwrap(children, [의]);
      if (operands.length === 0) throw new ParseError();
      return {
        type: "op",
        operator: "+",
        operands: operands.map(concreteToAST),
      };

    case "차":
      operands = matchAndUnwrap(children, [의]);
      if (operands.length !== 2) throw new ParseError();
      return {
        type: "op",
        operator: head.lemma,
        operands: operands.map(concreteToAST),
      };

    case "몫":
    case "나머지":
      operands = matchAndUnwrap(children, [의]);
      if (operands.length !== 1) throw new ParseError();
      return {
        type: "attr",
        object: concreteToAST(operands[0]),
        attr: head.lemma,
      };

    case "것":
      operands = matchAndUnwrap(children, v2a);
      if (operands.length !== 1) throw new ParseError();
      return concreteToAST(operands[0]);

    default:
      throw new ParseError();
  }
}

function processVerb(head: WordToken, children: Tree[]): ASTNode {
  let operands: Tree[];
  switch (head.lemma) {
    case "곱하다":
      operands = matchAndUnwrap(children, [를]);
      if (operands.length === 0) throw new ParseError();
      return {
        type: "op",
        operator: "*",
        operands: operands.map(concreteToAST),
      };
    case "더하다":
      operands = matchAndUnwrap(children, [를]);
      if (operands.length === 0) throw new ParseError();
      return {
        type: "op",
        operator: "+",
        operands: operands.map(concreteToAST),
      };
    case "빼다": {
      let first = null;
      let second = null;
      for (const child of children) {
        if (equalWord(child.head, 에서)) {
          if (first != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          first = concreteToAST(child.children[0]);
        } else if (equalWord(child.head, 를)) {
          if (second != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          second = concreteToAST(child.children[0]);
        } else throw new ParseError();
      }
      if (first == null || second == null) throw new ParseError();
      return {
        type: "op",
        operator: "-",
        operands: [first, second],
      };
    }
    case "나누다": {
      let first = null;
      let second = null;
      for (const child of children) {
        if (equalWord(child.head, 를)) {
          if (first != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          first = concreteToAST(child.children[0]);
        } else if (equalWord(child.head, 로)) {
          if (second != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          second = concreteToAST(child.children[0]);
        } else throw new ParseError();
      }
      if (first == null || second == null) throw new ParseError();
      return {
        type: "op",
        operator: "나누다",
        operands: [first, second],
      };
    }
    case "나누어떨어지다": {
      let first = null;
      let second = null;
      for (const child of children) {
        if (equalWord(child.head, 가)) {
          if (first != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          first = concreteToAST(child.children[0]);
        } else if (equalWord(child.head, 로)) {
          if (second != null) throw new ParseError();
          if (children.length !== 1) throw new ParseError();
          second = concreteToAST(child.children[0]);
        } else throw new ParseError();
      }
      if (first == null || second == null) throw new ParseError();
      return {
        type: "op",
        operator: "나누어떨어지다",
        operands: [first, second],
      };
    }
    default:
      throw new ParseError();
  }
}

export function concreteToAST(tree: Tree): ASTNode {
  if (tree.head.type === "symbol") throw new ParseError();
  if (tree.head.type === "arity") throw new ParseError();
  if (tree.head.type === "number") {
    if (tree.children.length === 0) return tree.head.number;

    // m분의 n
    let operands = matchAndUnwrap(tree.children, [의]);
    if (operands.length !== 1) throw new ParseError();
    if (operands[0].head.type !== "word") throw new ParseError();
    if (operands[0].head.lemma !== "분") throw new ParseError();
    if (operands[0].children.length !== 1) throw new ParseError();
    let denominator = concreteToAST(operands[0].children[0]);
    return {
      type: "op",
      operator: "/",
      operands: [tree.head.number, denominator],
    };
  }
  if (tree.type === "체언") return processNoun(tree.head, tree.children);
  if (tree.type === "용언") return processVerb(tree.head, tree.children);
  throw new ParseError();
}

type Head =
  | { pos: "명사"; word: string }
  | { pos: "형용사" | "동사"; word: Yongeon };
type Definition = { head: Head; usage: string; body: string };

function isCommand(command: string): boolean {
  command = command.trim().replace(/"[^"]*"|"[^"]*$/g, "");
  if (command.length === 0 || command[command.length - 1] !== ".") return false;
  const pos = ["[명사]", "[형용사]", "[동사]"];
  return pos.every((x) => !command.includes(x));
}

function parseHead(args: string[], pos: string): Head | null {
  if (pos === "명사") {
    if (args.length !== 1) return null;
    return { pos, word: args[0] };
  } else if (pos === "형용사" || pos === "동사") {
    if (args.length === 0 || args.length > 3) return null;
    // @ts-ignore
    const word = new Yongeon(...args);
    return { pos, word };
  }
  return null;
}

function parseDefinition(definition: string): Definition[] {
  let split1 = definition.trim().split(/\[(명사|형용사|동사)\]/g);
  let word = split1.shift();
  if (word == null) return [];
  const headArgs = word.trim().split(/\s*[,;]\s*/);

  let results: Definition[] = [];
  for (let i = 0; i < split1.length; i += 2) {
    const head = parseHead(headArgs, split1[i]);
    if (!head) return [];
    const split2 = split1[i + 1].trim().split(/{([^{}]+)}/g);
    if (split2.length === 1) {
      results.push({ head, usage: "", body: split2[0] });
      continue;
    }
    for (let j = 0; j < split2.length; j += 2) {
      results.push({ head, usage: split2[j], body: split2[j + 1] });
    }
  }
  return results;
}

export function run(program: string): number | boolean {
  const blocks = program.split(/\n\n+/g);

  let env: Definition[] = [];
  let analyzer = new Analyzer();
  let commands: string[] = [];

  for (const block of blocks) {
    if (isCommand(block)) {
      commands.push(block);
      continue;
    }
    const defs = parseDefinition(block);
    if (defs.length === 0) {
      throw new ParseError("올바르지 않은 구문입니다.");
    } else if (defs.length > 1) {
      // TODO: relieve
      throw new ParseError("정의는 표제어마다 하나씩만 작성할 수 있습니다.");
    }
    env.push(...defs);

    if (defs[0].head.pos === "명사") analyzer.addNoun(defs[0].head.word);
    else if (defs[0].head.pos === "형용사") analyzer.addAdj(defs[0].head.word);
    else if (defs[0].head.pos === "동사") analyzer.addVerb(defs[0].head.word);
  }

  let value: Value | null = null;
  for (const command of commands) {
    const tokens = tokenize(command, analyzer);
    const forest = constructForest(tokens);
    for (const tree of forest) {
      value = interpret(concreteToAST(tree), env); // TODO: update env
    }
  }
  if (value == null) throw new ParseError();
  return value.valueOf();
}
