import nearley from "nearley";
import { ChaltteokSyntaxError } from "../base/errors";
import {
  mergeSpans,
  SourceFile,
  SourceSpan,
  WithMetadata,
} from "../base/metadata";
import grammar from "./grammar";
import { Statement } from "./structure";
import { CoarseTokenizer } from "./tokenizer";

export function* parseStructureInteractive(): Generator<
  undefined,
  Statement[],
  WithMetadata<string>
> {
  const file: SourceFile = { content: "", path: "<stdin>" };

  const localGrammar = nearley.Grammar.fromCompiled(grammar);
  (localGrammar.lexer as CoarseTokenizer).file = file;
  const parser = new nearley.Parser(localGrammar);

  let spans: SourceSpan[] = [];
  do {
    const line = yield;
    file.content += line.value;
    spans = mergeSpans(...spans, ...line.metadata.spans);

    parser.feed(line.value);
    if (parser.results.length > 1) {
      throw new ChaltteokSyntaxError("구문이 중의적입니다.", { file, spans });
    }
  } while (parser.results.length !== 1);
  return parser.results[0];
}

export function parseStructure(program: WithMetadata<string>): Statement[] {
  const localGrammar = nearley.Grammar.fromCompiled(grammar);
  (localGrammar.lexer as CoarseTokenizer).file = program.metadata.file;
  const parser = new nearley.Parser(localGrammar);

  parser.feed(program.value);
  const results = parser.results;
  if (results.length === 0) {
    throw new ChaltteokSyntaxError(
      "구문을 해석할 수 없습니다.",
      program.metadata
    );
  }
  if (results.length > 1) {
    throw new ChaltteokSyntaxError("구문이 중의적입니다.", program.metadata);
  }
  return results[0];
}
