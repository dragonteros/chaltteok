import { josa } from "josa";
import { formatMetadata, SourceMetadata } from "./metadata";

export class InternalError extends Error {
  constructor(message: string) {
    super("Internal Error " + message);
  }
}

class ChaltteokError {
  private readonly messageCore: string;
  constructor(message: string, public traceback: SourceMetadata[]) {
    this.messageCore = message;
    // traceback: innermost first
  }
  get message(): string {
    return `${josa(this.messageCore)}

문제가 발생한 곳:
${this.traceback.map(formatMetadata).join("\n")}`.trim();
  }
}
export class ChaltteokSyntaxError extends ChaltteokError {
  constructor(message: string, metadata: SourceMetadata) {
    super("구문이 올바르지 않습니다. " + message, [metadata]);
  }
}
export class ChaltteokRuntimeError extends ChaltteokError {}
