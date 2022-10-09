import { SourceFile } from "./base/metadata";
import { parseStructure, parseStructureInteractive } from "./coarse/parser";
import { Statement } from "./coarse/structure";
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
  const module = new Module([loadPreludeModule()]);
  const file: SourceFile = { path, content: source };
  const program = parseStructure({
    metadata: { file, spans: [{ start: 0, end: source.length }] },
    value: source,
  });
  module.add(program);

  const values = module.runMain();
  return formatValuePack(values);
}

export function* runInteractive(): Generator<string, void, string> {
  const prelude = loadPreludeModule();
  const module = new Module([prelude]);

  let line = yield ">>> ";
  while (line.trim().normalize("NFC") !== "종료") {
    const parser = parseStructureInteractive();
    parser.next();

    while (true) {
      const result = parser.next(line);
      if (result.done) {
        module.add(result.value);
        break;
      }
      line = yield "... ";
    }

    const values = module.runMain();
    line = yield formatValuePack(values) + "\n>>> ";
  }
}
