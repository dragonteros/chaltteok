import { SourceFile } from "../base/metadata";
import { BUILTIN_PATTERNS } from "../builtin/builtin";
import { PRELUDE } from "../builtin/prelude";
import { parseStructure } from "../coarse/parser";
import { Action } from "../finegrained/procedure";
import { Signature } from "../typechecker/signature";
import { Module } from "./module";

class PreludeModule extends Module {
  private specialLookup: Record<string, Action> = {};

  constructor() {
    super([]);
  }

  build(): void {
    for (const [pattern, signature, action] of BUILTIN_PATTERNS) {
      if (action.type === "ArgRef") {
        this.registerPattern(pattern);
        this.specialLookup[pattern.key] = action;
        continue;
      }
      const implID = this.registerImpl(action.fun.impl);
      for (const [ptn, sign, protocol] of this.expandPatterns(
        pattern,
        signature
      )) {
        this.registerPattern(ptn);
        this.lookup.get(ptn.key).push([sign, implID, protocol]);
      }
    }

    const file: SourceFile = {
      path: "<built-in module>",
      content: PRELUDE,
    };
    const program = parseStructure({
      value: PRELUDE,
      metadata: { spans: [{ start: 0, end: PRELUDE.length }], file },
    });
    super.add(program);
  }

  getSignatures(patternKey: string): Signature[] {
    if (patternKey in this.specialLookup) return [{ param: [] }];
    return super.getSignatures(patternKey);
  }

  getAction(patternKey: string, signature: Signature): Action | undefined {
    if (patternKey in this.specialLookup) return this.specialLookup[patternKey];
    return super.getAction(patternKey, signature);
  }
}

let Prelude: PreludeModule | undefined = undefined;
export function loadPreludeModule(): PreludeModule {
  if (Prelude == null) {
    Prelude = new PreludeModule();
    Prelude.build();
  }
  return Prelude;
}
