import { Tree } from "./parser";

type LiteralNode = number;
type Operator = "제곱" | "곱" | "합" | "차";
type OperationNode = { operator: Operator; operands: ASTNode[] };
type ASTNode = LiteralNode | OperationNode;

class ParseError extends Error {}

function checkUiAndGetChildren(tree: Tree): Tree[] {
  let ui = tree.children[0];
  if (ui.head.lemma !== "의" || ui.head.pos !== "조사") throw new ParseError();
  return ui.children;
}

export function treeToAST(tree: Tree): ASTNode {
  switch (tree.head.lemma) {
    case "제곱": {
      let operands = checkUiAndGetChildren(tree);
      if (operands.length !== 1) throw new ParseError();
      return { operator: tree.head.lemma, operands: operands.map(treeToAST) };
    }
    case "곱": {
      let operands = checkUiAndGetChildren(tree);
      if (operands.length === 0) throw new ParseError();
      return { operator: tree.head.lemma, operands: operands.map(treeToAST) };
    }
    case "합": {
      let operands = checkUiAndGetChildren(tree);
      if (operands.length === 0) throw new ParseError();
      return { operator: tree.head.lemma, operands: operands.map(treeToAST) };
    }
    case "차": {
      let operands = checkUiAndGetChildren(tree);
      if (operands.length !== 2) throw new ParseError();
      return { operator: tree.head.lemma, operands: operands.map(treeToAST) };
    }
    default:
      let num = parseFloat(tree.head.lemma);
      if (isNaN(num)) throw new ParseError();
      return num;
  }
}

export function run(ast: ASTNode): number {
  if (typeof ast === "number") return ast;

  switch (ast.operator) {
    case "제곱":
      return Math.pow(run(ast.operands[0]), 2);
    case "곱":
      return ast.operands.map(run).reduce((a, b) => a * b);
    case "합":
      return ast.operands.map(run).reduce((a, b) => a + b);
    case "차":
      return Math.abs(run(ast.operands[0]) - run(ast.operands[1]));
  }
}
