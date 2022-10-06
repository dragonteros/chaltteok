// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var EndOfDocument: any;
declare var NewLine: any;
declare var Whitespace: any;
declare var JS: any;
declare var Word: any;
declare var SentenceFinal: any;

import {
  mergeStringWithMetadata,
  trimStringWithMetadata,
  WithMetadata,
} from "../base/metadata";
import { CoarseTokenizer } from "./tokenizer";
import { Expr } from "./structure";

const tokenizer = new CoarseTokenizer();

const skip = () => null;
const filter = <T>(arr: (T | null)[]) => arr.filter((x): x is T => x != null);

const merge = (...texts: (WithMetadata<string> | null)[]) =>
  mergeStringWithMetadata(...filter(texts));

function intoExpr(...texts: (WithMetadata<string> | null)[]) {
  texts = filter(texts);
  if (texts.length === 0) return null;
  return {
    type: "Expr",
    expr: trimStringWithMetadata(merge(...texts)),
  };
}

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: tokenizer,
  ParserRules: [
    {"name": "program$ebnf$1", "symbols": []},
    {"name": "program$ebnf$1$subexpression$1", "symbols": ["statement"], "postprocess": id},
    {"name": "program$ebnf$1$subexpression$1", "symbols": ["spaceOrNewLine"], "postprocess": skip},
    {"name": "program$ebnf$1", "symbols": ["program$ebnf$1", "program$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "program$ebnf$2", "symbols": [(tokenizer.has("EndOfDocument") ? {type: "EndOfDocument"} : EndOfDocument)], "postprocess": id},
    {"name": "program$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "program", "symbols": ["program$ebnf$1", "program$ebnf$2"], "postprocess": 
        ([stmts]) => filter(stmts)
        },
    {"name": "statement", "symbols": ["vocabDef"], "postprocess": id},
    {"name": "statement", "symbols": ["synonymDef"], "postprocess": id},
    {"name": "statement", "symbols": ["vocabFunDef"], "postprocess": id},
    {"name": "statement", "symbols": ["funDef"], "postprocess": id},
    {"name": "statement", "symbols": ["expr"], "postprocess": ([expr]) => intoExpr(expr)},
    {"name": "vocabDef$subexpression$1", "symbols": [(tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine)]},
    {"name": "vocabDef$subexpression$1", "symbols": [(tokenizer.has("EndOfDocument") ? {type: "EndOfDocument"} : EndOfDocument)]},
    {"name": "vocabDef", "symbols": ["vocabCore", "vocabDef$subexpression$1"], "postprocess": 
        ([vocab]) => ({ type: "VocabDef", vocab })
        },
    {"name": "synonymDef$subexpression$1", "symbols": [(tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine)]},
    {"name": "synonymDef$subexpression$1", "symbols": [(tokenizer.has("EndOfDocument") ? {type: "EndOfDocument"} : EndOfDocument)]},
    {"name": "synonymDef", "symbols": ["vocabCore", {"literal":"->"}, "_text_", "synonymDef$subexpression$1"], "postprocess": 
        ([vocab, , synonym]) => ({ type: "SynonymDef", vocab, synonym })
        },
    {"name": "vocabCore", "symbols": ["text_", {"literal":"["}, "_text_", {"literal":"]"}, "maybeText"], "postprocess": 
        ([lemma, , pos, , extra]) => ({
          lemma,
          pos,
          extra: extra && trimStringWithMetadata(extra),
        })
        },
    {"name": "vocabFunDef$ebnf$1", "symbols": []},
    {"name": "vocabFunDef$ebnf$1", "symbols": ["vocabFunDef$ebnf$1", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "vocabFunDef", "symbols": ["vocabCore", {"literal":":"}, "vocabFunDef$ebnf$1", "body"], "postprocess": 
        ([vocab, , , body]) => ({ type: "VocabFunDef", vocab, body })
        },
    {"name": "funDef$ebnf$1", "symbols": ["pattern"]},
    {"name": "funDef$ebnf$1", "symbols": ["funDef$ebnf$1", "pattern"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "funDef", "symbols": ["funDef$ebnf$1", "body"], "postprocess": 
        ([patterns, body]) => ({ type: "FunDef", patterns, body })
        },
    {"name": "pattern$ebnf$1", "symbols": []},
    {"name": "pattern$ebnf$1", "symbols": ["pattern$ebnf$1", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "pattern", "symbols": ["text_", {"literal":":"}, "pattern$ebnf$1"], "postprocess": id},
    {"name": "body$ebnf$1", "symbols": []},
    {"name": "body$ebnf$1", "symbols": ["body$ebnf$1", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "body", "symbols": ["exprBody", "body$ebnf$1", "doubleNewLines"], "postprocess": ([expr]) => intoExpr(expr)},
    {"name": "body", "symbols": [(tokenizer.has("JS") ? {type: "JS"} : JS)], "postprocess": 
        ([block]) => ({ type: "JSBody", block: merge(block) })  // cast
                },
    {"name": "exprBody", "symbols": ["expr"], "postprocess": ([expr]) => expr},
    {"name": "exprBody", "symbols": ["exprBody", "maybeNewLine", "expr"], "postprocess": (exprs) => merge(...exprs)},
    {"name": "doubleNewLines", "symbols": [(tokenizer.has("EndOfDocument") ? {type: "EndOfDocument"} : EndOfDocument)], "postprocess": skip},
    {"name": "doubleNewLines$ebnf$1", "symbols": []},
    {"name": "doubleNewLines$ebnf$1", "symbols": ["doubleNewLines$ebnf$1", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "doubleNewLines$subexpression$1", "symbols": [(tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine)]},
    {"name": "doubleNewLines$subexpression$1", "symbols": [(tokenizer.has("EndOfDocument") ? {type: "EndOfDocument"} : EndOfDocument)]},
    {"name": "doubleNewLines", "symbols": [(tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine), "doubleNewLines$ebnf$1", "doubleNewLines$subexpression$1"], "postprocess": skip},
    {"name": "expr$ebnf$1", "symbols": []},
    {"name": "expr$ebnf$1$subexpression$1", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word)], "postprocess": id},
    {"name": "expr$ebnf$1$subexpression$1", "symbols": ["spaceOrNewLine"], "postprocess": id},
    {"name": "expr$ebnf$1", "symbols": ["expr$ebnf$1", "expr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "expr", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word), "expr$ebnf$1", (tokenizer.has("SentenceFinal") ? {type: "SentenceFinal"} : SentenceFinal)], "postprocess": 
        ([text, texts, final]) => merge(text, ...texts, final)
        },
    {"name": "spaceOrNewLine", "symbols": [(tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": id},
    {"name": "spaceOrNewLine", "symbols": [(tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine)], "postprocess": id},
    {"name": "maybeNewLine$ebnf$1", "symbols": []},
    {"name": "maybeNewLine$ebnf$1", "symbols": ["maybeNewLine$ebnf$1", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "maybeNewLine", "symbols": ["maybeNewLine$ebnf$1"], "postprocess": ([spaces]) => merge(...spaces)},
    {"name": "maybeNewLine$ebnf$2", "symbols": []},
    {"name": "maybeNewLine$ebnf$2", "symbols": ["maybeNewLine$ebnf$2", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "maybeNewLine$ebnf$3", "symbols": []},
    {"name": "maybeNewLine$ebnf$3", "symbols": ["maybeNewLine$ebnf$3", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "maybeNewLine", "symbols": ["maybeNewLine$ebnf$2", (tokenizer.has("NewLine") ? {type: "NewLine"} : NewLine), "maybeNewLine$ebnf$3"], "postprocess": 
        ([leading, newline, trailing]) =>
          merge(...leading, newline, ...trailing)
                        },
    {"name": "_text_$ebnf$1", "symbols": []},
    {"name": "_text_$ebnf$1", "symbols": ["_text_$ebnf$1", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "_text_", "symbols": ["_text_$ebnf$1", "text_"], "postprocess": ([, text]) => text},
    {"name": "text_", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word), "maybeText"], "postprocess": 
        ([text, maybeText]) => trimStringWithMetadata(merge(text, maybeText))
        },
    {"name": "maybeText$ebnf$1", "symbols": []},
    {"name": "maybeText$ebnf$1$subexpression$1", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word)], "postprocess": id},
    {"name": "maybeText$ebnf$1$subexpression$1", "symbols": [(tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": id},
    {"name": "maybeText$ebnf$1", "symbols": ["maybeText$ebnf$1", "maybeText$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "maybeText", "symbols": ["maybeText$ebnf$1"], "postprocess": 
        function ([texts]) {
          texts = filter(texts);
          if (texts.length === 0) return undefined;
          const text = merge(...texts);
          if (text.value.trim() === "") return undefined;
          return text;
        }
        }
  ],
  ParserStart: "program",
};

export default grammar;
