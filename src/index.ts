import { parseProgram } from "./parser/aggregator";
import { formatValuePack } from "./runner/formatter";
import { Module, Prelude } from "./runner/module";

export function run(source: string): string {
  const program = parseProgram(source);
  const module = new Module(
    [Prelude],
    program.vocab,
    program.definitions,
    program.main
  );
  const values = module.runMain();
  return formatValuePack(values);
}
