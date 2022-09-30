import { SourceFile } from "./base/metadata";
import { parseStructure } from "./coarse/parser";
import { formatValuePack } from "./runner/formatter";
import { Module } from "./runner/module";
import { loadPreludeModule } from "./runner/prelude";

/* Use interpreter semantics
>>> Lorem Ipsum:
...   Dolor sit amet.
...
>>> # AST is generated
*/

export function run(source: string, path: string): string {
  const file: SourceFile = { path, content: source };
  const program = parseStructure({
    metadata: { file, spans: [{ start: 0, end: source.length }] },
    value: source,
  });
  const module = new Module([loadPreludeModule()], program);
  module.build();
  const values = module.runMain();
  return formatValuePack(values);
}
