/* Env */

import { RuntimeError } from "../errors";
import { Tree } from "../parser/ast";
import {
  Box,
  getConcreteValues,
  StrictValuePack,
  Thunk,
  ValuePack,
} from "./values";

/** Context in which the body of each procedure is evaluated. */
export abstract class Env {
  private readonly memory: Record<string, Box> = {};
  constructor(readonly args: ValuePack[]) {}
  getArg(idx: number): ValuePack {
    if (this.args.length <= idx)
      throw new RuntimeError(`${idx}번째 인수가 없습니다.`);
    return this.args[idx];
  }
  get(id: string): Box {
    let box = this.memory[id];
    if (box == null) {
      box = { data: undefined };
      this.memory[id] = box;
    }
    return box;
  }
  set(id: string, value: StrictValuePack) {
    this.memory[id].data = getConcreteValues(value);
  }
  abstract lazy(expr: Tree): Thunk;
}
