export type ExprAST = NumberLiteralAST | IDLiteralAST | ArgRefAST | FunCallAST;
export type NumberLiteralAST = { type: "NumberLiteral"; value: number };
export type IDLiteralAST = { type: "IDLiteral"; value: string };
export type ArgRefAST = { type: "ArgRef"; value: number };
export type FunCallAST = {
  type: "FunCall";
  patternKey: string;
  arguments: ExprAST[];
};
