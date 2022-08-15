import { josa } from "josa";

class ChaltteokError extends Error {
  constructor(message: string) {
    super(josa(message));
  }
}
export class SyntaxError extends ChaltteokError {}
export class RuntimeError extends ChaltteokError {}
export class TypeError extends ChaltteokError {}
