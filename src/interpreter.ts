import { PRELUDE } from "./prelude";
import { Value, ValuePack, Env, Tree } from "./ast";

import {  ParseError,  } from "./analyzer";
import { parseProgram } from "./aggregator";

function interpret(env: Env, ast: Tree): [Env, ValuePack] {
  if (!ast.processor)
    throw new ParseError("Internal Error interpret::NO_PROCESSOR");

  let newEnv: Env = env;
  let newArgs: ValuePack[] = [];
  for (const child of ast.children) {
    let output;
    [newEnv, output] = interpret(newEnv, child);
    newArgs.push(output);
  }
  return [newEnv, newArgs[0]];
  // return ast.processor(newEnv, ...newArgs);
}

function toJSValue(env: Env, value: Value): number | boolean {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value.type === "나눔") return value.값;
  if (value.type === "이름") return toJSValue(env, env.get(value));
  throw new ParseError("범위 혹은 열 반환");
}

export function run(source: string): number | boolean {
  const [analyzer, synonyms, patterns] = parseProgram([PRELUDE, source]);

  let env = new Env({});
  let value: ValuePack = [];
  // for (const command of program.main) {
  //   const tokens = tokenize(command, analyzer, synonyms);
  //   const forest = constructForest(tokens, patterns);
  //   for (const tree of forest) [env, value] = interpret(env, tree);
  // }
  if (value == null) throw new ParseError("Internal Error run::NO_COMMANDS");
  if (value.length !== 1) throw new ParseError("Too many output");
  return toJSValue(env, value[0]);
}
