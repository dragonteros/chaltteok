import { PRELUDE } from "./prelude";
import { Value, ValuePack, Env, Tree, AST } from "./ast";

import { ParseError } from "./analyzer";
import { tokenize } from "./tokenizer";
import { parseProgram } from "./aggregator";

// function typeCheck(tree: Tree): AST {}

function interpret(env: Env, ast: AST): ValuePack {
  const strict = (x: AST): ValuePack => interpret(env, x);
  return ast.processor(env, strict)(...ast.arguments);
}

function toJSValue(env: Env, value: Value): number | boolean {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value.type === "이름") return toJSValue(env, env.get(value)[0]);
  throw new ParseError("범위 혹은 열 반환");
}

export function run(source: string): number | boolean {
  const [analyzer, substituter, patterns, main] = parseProgram([
    PRELUDE,
    source,
  ]);

  // 패턴 재정비
  // for (const patternArr of Object.values(patterns)) {
  //   for (const _pattern of patternArr.enumerate().flatMap((x) => x[2])) {
  //     const overloading = _pattern.overloading;
  //     if (overloading.input != null && overloading.output != null) continue;
  //     if (!Array.isArray(overloading.processor))
  //       throw new ParseError("Internal Error run::NO_TYPE_IN_PATTERN");
  //     const body = overloading.processor.map((sentence) => {
  //       let tokens = tokenize(sentence, analyzer);
  //       tokens = substituter.run(tokens);
  //     });
  //     // 무엇이 무엇이 아니다: 앞의 것이 뒤의 것이지 않다.
  //     // => 타입?? 오버로딩의 조합을 가져와 잘 엮는다
  //   }
  // }

  let env = new Env({});
  let value: ValuePack = [];
  // for (const command of program.main) {
  //   const tokens = tokenize(command, analyzer, synonyms);
  //   const forest = constructForest(tokens, patterns);
  //   for (const tree of forest) value = interpret(env, tree);
  // }
  if (value == null) throw new ParseError("Internal Error run::NO_COMMANDS");
  if (value.length !== 1) throw new ParseError("Too many output");
  return toJSValue(env, value[0]);
}
