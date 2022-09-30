import { mb_strwidth } from "@demouth/mb_strwidth";
import { zip } from "../utils/utils";

export type SourceFile = {
  path: string;
  content: string;
};
export type SourceSpan = {
  start: number;
  end: number;
};
export type SourceMetadata = {
  file: SourceFile;
  spans: SourceSpan[];
};
export type WithMetadata<T> = {
  metadata: SourceMetadata;
  value: T;
};

function splitMetadata(
  metadata: SourceMetadata,
  index: number
): [SourceMetadata, SourceMetadata] {
  let spanIdx = metadata.spans.length;
  let offset = 0;
  let cur = 0;
  for (const [i, span] of metadata.spans.entries()) {
    const next = cur + span.end - span.start;
    if (cur <= index && index < next) {
      spanIdx = i;
      offset = index - cur;
      break;
    }
    cur = next;
  }

  const toSplit = metadata.spans[spanIdx];
  const firstSpans = metadata.spans.slice(0, spanIdx);
  const secondSpans = metadata.spans.slice(spanIdx);
  if (offset) {
    firstSpans.push({ ...toSplit, end: toSplit.start + offset });
    secondSpans[0] = { ...toSplit, start: toSplit.start + offset };
  }

  return [
    { ...metadata, spans: firstSpans },
    { ...metadata, spans: secondSpans },
  ];
}
export function splitStringWithMetadata(
  data: WithMetadata<string>,
  index: number
): [WithMetadata<string>, WithMetadata<string>] {
  const [firstMetadata, secondMetadata] = splitMetadata(data.metadata, index);
  return [
    { metadata: firstMetadata, value: data.value.slice(0, index) },
    { metadata: secondMetadata, value: data.value.slice(index) },
  ];
}
export function trimStringWithMetadata(
  data: WithMetadata<string>
): WithMetadata<string> {
  const start = data.value.match(/\S/)?.index ?? 0;
  const end = data.value.match(/\s*$/)?.index ?? data.value.length;
  return splitStringWithMetadata(
    splitStringWithMetadata(data, start)[1],
    end - start
  )[0];
}

export function mergeSpans(...spans: SourceSpan[]): SourceSpan[] {
  const result: SourceSpan[] = [];
  for (const span of spans) {
    if (span.start === span.end) continue;
    if (result.length === 0) {
      result.push(span);
      continue;
    }
    const last = result[result.length - 1];
    if (last.end === span.start) {
      result[result.length - 1] = { start: last.start, end: span.end };
    } else {
      result.push(span);
    }
  }
  return result;
}
export function mergeMetadata(...metadatas: SourceMetadata[]): SourceMetadata {
  const spans = mergeSpans(...metadatas.flatMap((metadata) => metadata.spans));
  return { ...metadatas[0], spans };
}

export function mergeStringWithMetadata(
  ...spans: WithMetadata<string>[]
): WithMetadata<string> {
  return {
    metadata: mergeMetadata(...spans.map((span) => span.metadata)),
    value: spans.map((x) => x.value).join(""),
  };
}

function formatSpans(
  content: string,
  spans: SourceSpan[],
  offset: number
): string {
  content = content.slice(offset);

  let spanIdx = 0;
  const result: string[] = [];
  for (const [i, c] of [...content].entries()) {
    const cur = i + offset;
    while (spanIdx < spans.length && cur >= spans[spanIdx].end) ++spanIdx;
    if (spanIdx >= spans.length) break;

    if (c === "\n") {
      result.push("\n");
    } else {
      const filler = cur < spans[spanIdx].start ? " " : "^";
      result.push(filler.repeat(mb_strwidth(c)));
    }
  }
  return zip(content.split("\n"), result.join("").split("\n"))
    .flat()
    .join("\n");
}
export function formatMetadata(metadata: SourceMetadata): string {
  const { path, content } = metadata.file;

  const before = content.slice(0, metadata.spans[0].start).split("\n");
  const startLineNo = before.length - 1;
  const startColNo = before[startLineNo].length;

  const offset = metadata.spans[0].start - startColNo;
  return `${path}, ${startLineNo + 1}번째 줄 ${startColNo + 1}번째 글자
${formatSpans(content, metadata.spans, offset)}`;
}
