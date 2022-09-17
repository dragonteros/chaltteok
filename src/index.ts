import { parseStructure } from "./coarse/aggregator";
import { formatValuePack } from "./runner/formatter";
import { Module, Prelude } from "./runner/module";

export function run(source: string, path: string): string {
  const program = parseStructure(
    { span: { start: 0, end: source.length }, value: source },
    { path, content: source }
  );
  const module = new Module([Prelude], program);
  const values = module.runMain();
  return formatValuePack(values);
}
