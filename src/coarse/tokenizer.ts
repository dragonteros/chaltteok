import { InternalError } from "../base/errors";
import {
  formatMetadata,
  SourceFile,
  SourceMetadata,
  WithMetadata,
} from "../base/metadata";

// Concatenation should reproduce original
export type JSToken = { type: "JS" } & WithMetadata<string>;
export type CommentToken = { type: "Comment" } & WithMetadata<string>;

export type WordToken = { type: "Word" } & WithMetadata<string>;
export type Bracket = { type: "Bracket" } & WithMetadata<"[" | "]">;
export type SynonymDefToken = { type: "SynonymDef" } & WithMetadata<"->">;
export type FunDefToken = { type: "FunDef" } & WithMetadata<":">;
export type SentenceFinalToken = {
  type: "SentenceFinal";
} & WithMetadata<".">;
export type WhitespaceToken = { type: "Whitespace" } & WithMetadata<string>;
export type EndOfLineToken = { type: "EndOfLine" } & WithMetadata<"">;
export type LineFeedToken = { type: "LineFeed" } & WithMetadata<"\n">;
export type CoarseToken =
  | JSToken
  | CommentToken
  | WordToken
  | Bracket
  | SynonymDefToken
  | FunDefToken
  | SentenceFinalToken
  | WhitespaceToken
  | EndOfLineToken
  | LineFeedToken;

function consumeComment(data: string, fromIndex = 0): number | undefined {
  const parenPattern = /[()]/g;
  parenPattern.lastIndex = fromIndex;
  let level = 0;
  do {
    const match = parenPattern.exec(data);
    if (match == null) return undefined;
    match[0] === "(" ? ++level : --level;
  } while (level > 0);
  return parenPattern.lastIndex;
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
  let cur = fromIndex;
  do {
    cur = data.indexOf("}", cur + 1);
    if (cur === -1) return;
  } while (!isValidCode(data.slice(fromIndex + 1, cur)));
  return cur + 1;
}

export type CoarseTokenizerInfo = {
  cur: number;
  next?: number;
  emiittedEndOfDocument?: true;
};

export class CoarseTokenizer {
  chunk = "";
  info: CoarseTokenizerInfo = { cur: 0 };
  file: SourceFile | undefined;

  private intoToken(value: string, metadata: SourceMetadata): CoarseToken {
    if (value === "") return { metadata, type: "EndOfLine", value };

    if (value === "[") return { metadata, type: "Bracket", value };
    if (value === "]") return { metadata, type: "Bracket", value };
    if (value === ":") return { metadata, type: "FunDef", value };
    if (value === "->") return { metadata, type: "SynonymDef", value };
    if (value === "\n") return { metadata, type: "LineFeed", value };
    if (value === ".") return { metadata, type: "SentenceFinal", value };
    if (value[0] === "(") return { metadata, type: "Comment", value };
    if (value[0] === "{") return { metadata, type: "JS", value };
    if (value.trim() === "") return { metadata, type: "Whitespace", value };
    return { metadata, type: "Word", value };
  }
  private consume(): undefined | number | [number, number] {
    if (this.info.cur >= this.chunk.length) {
      if (this.info.emiittedEndOfDocument) return undefined;
      this.info.emiittedEndOfDocument = true;
      return this.info.cur;
    }
    if (this.info.next != null) return this.info.next;

    const lookahead = this.chunk[this.info.cur];
    if (lookahead === "\n") return [this.info.cur, this.info.cur + 1];
    if (lookahead === "{") return consumeBracket(this.chunk, this.info.cur);
    if (lookahead === "(") {
      const cur = consumeComment(this.chunk, this.info.cur);
      if (cur == null) return undefined;
      this.info.cur = cur; // skip Comment
      return this.consume();
    }

    const pattern = /->|[({[:\]]|\n|[^\S\n]+|(?<!\d)\.|\.(?!\d)/g;
    pattern.lastIndex = this.info.cur;
    const match = pattern.exec(this.chunk);
    if (match == null) return this.chunk.length;

    const end = match.index;
    if ("\n({".includes(match[0])) return end; // Use lookahead

    const next = pattern.lastIndex;
    if (this.info.cur === end) return next;
    return [end, next];
  }
  next(): CoarseToken | undefined {
    if (this.file == null)
      throw new InternalError("CoarseTokenizer::next::FILE_NOT_SET");
    const consumed = this.consume();
    if (consumed == null) return undefined;

    const [end, next] =
      typeof consumed === "number" ? [consumed, undefined] : consumed;

    const metadata = {
      file: this.file,
      spans: [{ start: this.info.cur, end }],
    };
    const token = this.intoToken(
      this.chunk.slice(this.info.cur, end),
      metadata
    );
    this.info = { ...this.info, cur: end, next };
    return token;
  }
  save(): CoarseTokenizerInfo {
    return this.info;
  }
  reset(chunk: string, info?: CoarseTokenizerInfo) {
    this.chunk = chunk.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    this.info = info ?? { cur: 0 };
  }
  formatError(token: CoarseToken, message = ""): string {
    return `${formatMetadata(token.metadata)}
${message}`.trim();
  }
  has(name: string): boolean {
    return [
      "JS",
      "Comment",
      "Word",
      "Bracket",
      "SynonymDef",
      "FunDef",
      "SentenceFinal",
      "Whitespace",
      "LineFeed",
      "EndOfLine",
    ].includes(name);
  }
}
