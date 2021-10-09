import { Yongeon } from "eomi-js";

import { Analyzer, ParseError } from "./analyzer";
import { tokenize } from "./tokenizer";
import {
  constructForest,
  Tree,
  Value,
  ValuePack,
  Env,
  InterpretError,
} from "./parser";

function interpret(env: Env, ast: Tree): [Env, ValuePack] {
  if (!ast.processor)
    throw new ParseError("Internal Error interpret::NO_PROCESSOR");

  let frozenEnv: Env | null = null;
  let frozenArg: ValuePack = {values:[]};
  let newEnv: Env = env;
  let newArgs: ValuePack[] = [];
  while (true) {
    try {
      for (const child of ast.children) {
        let output;
        [newEnv, output] = interpret(newEnv, child);
        if (frozenEnv == null) frozenEnv = newEnv;
        newArgs.push(output);
      }
      if (ast.omitIndex != null)
        newArgs.splice(ast.omitIndex, 0, env.getRegister());
      return ast.processor(newEnv, ...newArgs);
    } catch (e) {
      if (e !== "StopIteration" && e !== "NextIteration") throw e;

      if (e === "StopIteration") {
        if (frozenEnv == null)
          throw new InterpretError("Internal Error interpret::NULL_FROZEN_ENV");
        return [frozenEnv, frozenArg];
      }
      frozenEnv = null;
      frozenArg = newArgs[1];
      newArgs = [];
    }
  }
}

/* *************** Function Definition *************** */

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

function toJSValue(env: Env, value: Value): number | boolean {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value;
  if (value.type === "나눔") return value.값;
  if (value.type === "이름") return toJSValue(env, env.get(value.id));
  throw new ParseError("범위 혹은 열 반환");
}

export function run(program: string): number | boolean {
  const blocks = program.split(/\n\n+/g);

  let env: Env = new Env({});
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
    // env.push(...defs);

    if (defs[0].head.pos === "명사") analyzer.addNoun(defs[0].head.word);
    else if (defs[0].head.pos === "형용사") analyzer.addAdj(defs[0].head.word);
    else if (defs[0].head.pos === "동사") analyzer.addVerb(defs[0].head.word);
  }

  let value: ValuePack | null = null;
  for (const command of commands) {
    const tokens = tokenize(command, analyzer);
    const forest = constructForest(tokens);
    for (const tree of forest) {
      [env, value] = interpret(env, tree); // TODO: update env
    }
  }
  if (value == null) throw new ParseError("Internal Error run::NO_COMMANDS");
  if (value.values.length !== 1) throw new ParseError("Too many output");
  return toJSValue(env, value.values[0]);
}
