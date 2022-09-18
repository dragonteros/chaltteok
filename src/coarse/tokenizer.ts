import { InternalError, SourceFile } from "../base/errors";
import { formatMetadata, SourceSpan, WithMetadata } from "../base/errors";

// Concatenation should reproduce original
type JSToken = { type: "JS" } & WithMetadata<string>;
type CommentToken = { type: "Comment" } & WithMetadata<string>;

type TextToken = { type: "Text" } & WithMetadata<string>;
type Bracket = { type: "Bracket" } & WithMetadata<"[" | "]">;
type SynonymDefToken = { type: "SynonymDef" } & WithMetadata<"->">;
type FunDefToken = { type: "FunDef" } & WithMetadata<":">;
type NewLineToken = { type: "NewLine" } & WithMetadata<"\n">;
type SentenceFinalToken = { type: "SentenceFinal" } & WithMetadata<string>;
type WhitespaceToken = { type: "Whitespace" } & WithMetadata<string>;
type CoarseToken =
  | JSToken
  | CommentToken
  | TextToken
  | Bracket
  | SynonymDefToken
  | FunDefToken
  | NewLineToken
  | SentenceFinalToken
  | WhitespaceToken;

function consumeComment(data: string, fromIndex = 0): number | undefined {
  const parenPattern = /[()]/g;
  parenPattern.lastIndex = fromIndex;
  let level = 0;
  do {
    const match = parenPattern.exec(data);
    if (match == null) return undefined;
    match[0] === "(" ? ++level : --level;
  } while (level > 0);
  return parenPattern.lastIndex + 1;
}
function consumeBracket(data: string, fromIndex = 0): number | undefined {
  function isValidCode(target: string): boolean {
    try {
      new Function(target);
      return true;
    } catch (error) {
      return false;
    }
  }
  do {
    fromIndex = data.indexOf("}", fromIndex + 1);
    if (fromIndex === -1) return;
  } while (!isValidCode(data.slice(1, fromIndex)));
  return fromIndex + 1;
}

type CoarseTokenizerInfo = {
  cur: number;
  next?: number;
};

export class CoarseTokenizer {
  chunk = "";
  info: CoarseTokenizerInfo = { cur: 0 };
  file: SourceFile | undefined;

  private intoToken(value: string, span: SourceSpan): CoarseToken {
    if (this.file == null) throw new InternalError("CoarseTokenizer::intoToken::FILE_NOT_SET");
    if (value === "->") {
      return { span, type: "SynonymDef", value, file: this.file };
    } else if (value === "[" || value === "]") {
      return { span, type: "Bracket", value, file: this.file };
    } else if (value === ":") {
      return { span, type: "FunDef", value, file: this.file };
    } else if (value === "\n") {
      return { span, type: "NewLine", value, file: this.file };
    } else if (value.trim() === ".") {
      return { span, type: "SentenceFinal", value, file: this.file };
    } else if (value[0] === "(") {
      return { span, type: "Comment", value, file: this.file };
    } else if (value[0] === "{") {
      return { span, type: "JS", value, file: this.file };
    } else if (value.trim() === "") {
      return { span, type: "Whitespace", value, file: this.file };
    }
    return { span, type: "Text", value, file: this.file };
  }
  private consume(): undefined | number | [number, number] {
    if (this.info.cur >= this.chunk.length) return undefined;

    const lookahead = this.chunk[this.info.cur];
    if (lookahead === "(") return consumeComment(this.chunk, this.info.cur);
    if (lookahead === "{") return consumeBracket(this.chunk, this.info.cur);

    const pattern = /->|[\(\{\[:\]]|\n|\.\n\n|\.\s*$/g;
    pattern.lastIndex = this.info.cur;
    const match = pattern.exec(this.chunk);
    if (match == null) return this.chunk.length;

    const end = pattern.lastIndex;
    const next = end + match[0].length;
    return [end, next];
  }
  next(): CoarseToken | undefined {
    const consumed = this.consume();
    if (consumed == null) return undefined;

    const [end, next] =
      typeof consumed === "number" ? [consumed, undefined] : consumed;

    const span = { start: this.info.cur, end };
    const token = this.intoToken(
      this.chunk.slice(this.info.cur, end),
      span
    );
    this.info = { cur: end, next };
    return token;
  }
  save(): CoarseTokenizerInfo {
    return this.info;
  }
  reset(chunk: string, info?: CoarseTokenizerInfo) {
    this.chunk = chunk;
    this.info = info ?? { cur: 0 };
  }
  formatError(token: CoarseToken, message = ""): string {
    if (this.file == null) throw new InternalError("CoarseTokenizer::formatError::FILE_NOT_SET");
    return `${formatMetadata(this.file, token.span)}
${message}`.trim();
  }
  has(name: string): boolean {
    return [
      "JS",
      "Comment",
      "Bracket",
      "SynonymDef",
      "FunDef",
      "NewLine",
      "SentenceFinal",
      "Whitespace",
      "Text",
    ].includes(name);
  }
}
