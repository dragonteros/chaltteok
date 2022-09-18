import { josa } from "josa";
import { zip } from "../utils/utils";

export class InternalError extends Error {
  constructor(message: string) {
    super("Internal Error " + message);
  }
}

export type SourceSpan = {
  start: number;
  end: number;
};
export type SourceFile = {
  path: string;
  content: string;
};
export type WithMetadata<T> = { file: SourceFile; span: SourceSpan; value: T; };

export function trimSpan(data: WithMetadata<string>): WithMetadata<string> {
  const start = data.value.match(/\S/)?.index ?? 0;
  const end = data.value.match(/\s*$/)?.index ?? data.value.length;
  return {
    span: { start: data.span.start + start, end: data.span.start + end },
    value: data.value.slice(start, end),
    file: data.file,
  };
}
export function mergeSpan(...spans: WithMetadata<string>[]): WithMetadata<string> {
  return {
    span: { start: spans[0].span.start, end: spans[spans.length - 1].span.end },
    value: spans.map((x) => x.value).join(""),
    file: spans[0].file,
  };
}


function formatLines(
  before: string[],
  span: string[],
  after: string[]
): string {
  const main = [before[before.length - 1], span.join("\n"), after[0]]
    .join("")
    .split("\n");

  const underlines: string[] = [
    before[before.length - 1].replace(/./g, " "),
    span.map((x) => x.replace(/./g, "^")).join("\n"),
    after[0].replace(/./g, " "),
  ]
    .join("")
    .split("\n");

  return zip(main, underlines).flat().join("\n");
}
export function formatMetadata(file: SourceFile, span: SourceSpan): string {
  const before = file.content.slice(0, span.start).split("\n");
  const main = file.content.slice(span.start, span.end).split("\n");
  const after = file.content.slice(span.end).split("\n");

  const startLineNo = before.length;
  const startColNo = before[startLineNo - 1].length;

  return `${file.path}, ${startLineNo}번째 줄 ${startColNo}번째 글자
    ${formatLines(before, main, after)}`;
}

class ChaltteokError {
  message: string;
  constructor(message: string, public traceback: [SourceFile, SourceSpan][]) {
    this.message = `${traceback
      .map(([file, span]) => formatMetadata(file, span))
      .join("\n")}
${josa(message)}`.trim();
  }
}
export class ChaltteokSyntaxError extends ChaltteokError {
  constructor(message: string, sourceFile: SourceFile, sourceSpan: SourceSpan) {
    super("구문이 올바르지 않습니다. " + message, [[sourceFile, sourceSpan]]);
  }
}
export class ChaltteokRuntimeError extends ChaltteokError { }
export class ChaltteokTypeError extends ChaltteokError { }
