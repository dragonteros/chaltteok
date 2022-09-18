import { WithMetadata } from "../base/errors";
import { VocabEntry } from "../base/pos";

// Get as much as possible without runtime tokenization & parsing

export type Statement = VocabDef | SynonymDef | VocabFunDef | FunDef | Expr;
export type Expr = { type: "Expr"; expr: WithMetadata<string> };

export type VocabDef = { type: "VocabDef"; vocab: VocabEntry };
export type SynonymDef = {
  type: "SynonymDef";
  vocab: VocabEntry;
  synonym: WithMetadata<string>;
};
export type VocabFunDef = {
  type: "VocabFunDef";
  vocab: VocabEntry;
  body: Body;
};
export type FunDef = {
  type: "FunDef";
  patterns: WithMetadata<string>[];
  body: Body;
};

export type Body = JSBody | Expr;
export type JSBody = { type: "JSBody"; block: WithMetadata<string> };
