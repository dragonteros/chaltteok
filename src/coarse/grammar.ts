// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var EndOfLine: any;
declare var JS: any;
declare var Whitespace: any;
declare var LineFeed: any;
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
    {"name": "program$ebnf$1", "symbols": ["exprStmtCont"], "postprocess": id},
    {"name": "program$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "program$ebnf$2$subexpression$1", "symbols": ["statement"], "postprocess": id},
    {"name": "program$ebnf$2$subexpression$1", "symbols": ["spaceOrNewLine"], "postprocess": skip},
    {"name": "program$ebnf$2", "symbols": ["program$ebnf$2$subexpression$1"]},
    {"name": "program$ebnf$2$subexpression$2", "symbols": ["statement"], "postprocess": id},
    {"name": "program$ebnf$2$subexpression$2", "symbols": ["spaceOrNewLine"], "postprocess": skip},
    {"name": "program$ebnf$2", "symbols": ["program$ebnf$2", "program$ebnf$2$subexpression$2"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "program", "symbols": ["program$ebnf$1", "program$ebnf$2"], "postprocess": 
        ([expr, stmts]) => filter([intoExpr(expr), ...stmts])
        },
    {"name": "statement", "symbols": ["vocabDef"], "postprocess": id},
    {"name": "statement", "symbols": ["synonymDef"], "postprocess": id},
    {"name": "statement", "symbols": ["vocabFunDef"], "postprocess": id},
    {"name": "statement", "symbols": ["funDef"], "postprocess": id},
    {"name": "statement", "symbols": ["exprStmt"], "postprocess": id},
    {"name": "vocabDef", "symbols": ["vocabCore", (tokenizer.has("EndOfLine") ? {type: "EndOfLine"} : EndOfLine)], "postprocess": 
        ([vocab]) => ({ type: "VocabDef", vocab })
        },
    {"name": "synonymDef", "symbols": ["vocabCore", {"literal":"->"}, "_text_", (tokenizer.has("EndOfLine") ? {type: "EndOfLine"} : EndOfLine)], "postprocess": 
        ([vocab, , synonym]) => ({ type: "SynonymDef", vocab, synonym })
        },
    {"name": "vocabCore", "symbols": ["text_", {"literal":"["}, "_text_", {"literal":"]"}, "maybeText"], "postprocess": 
        ([lemma, , pos, , extra]) => ({
          lemma,
          pos,
          extra: extra && trimStringWithMetadata(extra),
        })
        },
    {"name": "vocabFunDef", "symbols": ["vocabCore", {"literal":":"}, "body"], "postprocess": 
        ([vocab, , body]) => ({ type: "VocabFunDef", vocab, body })
        },
    {"name": "funDef$ebnf$1", "symbols": []},
    {"name": "funDef$ebnf$1$subexpression$1$ebnf$1", "symbols": []},
    {"name": "funDef$ebnf$1$subexpression$1$ebnf$1", "symbols": ["funDef$ebnf$1$subexpression$1$ebnf$1", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "funDef$ebnf$1$subexpression$1", "symbols": ["pattern", "funDef$ebnf$1$subexpression$1$ebnf$1"], "postprocess": id},
    {"name": "funDef$ebnf$1", "symbols": ["funDef$ebnf$1", "funDef$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "funDef", "symbols": ["funDef$ebnf$1", "pattern", "body"], "postprocess": 
        ([patterns, pattern, body]) => ({
          type: "FunDef",
          patterns: [...patterns, pattern],
          body,
        })
        },
    {"name": "pattern", "symbols": ["text_", {"literal":":"}], "postprocess": id},
    {"name": "body$ebnf$1", "symbols": ["exprBody"]},
    {"name": "body$ebnf$1", "symbols": ["body$ebnf$1", "exprBody"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "body", "symbols": ["body$ebnf$1"], "postprocess": ([exprs]) => intoExpr(...exprs)},
    {"name": "body$ebnf$2", "symbols": []},
    {"name": "body$ebnf$2", "symbols": ["body$ebnf$2", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "body", "symbols": ["body$ebnf$2", (tokenizer.has("JS") ? {type: "JS"} : JS)], "postprocess": 
        ([, block]) => ({ type: "JSBody", block: merge(block) })  // cast
                },
    {"name": "exprBody$ebnf$1", "symbols": []},
    {"name": "exprBody$ebnf$1", "symbols": ["exprBody$ebnf$1", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "exprBody", "symbols": ["exprBody$ebnf$1", "expr"], "postprocess": ([spaces, expr]) => merge(...spaces, expr)},
    {"name": "exprBody$ebnf$2", "symbols": []},
    {"name": "exprBody$ebnf$2", "symbols": ["exprBody$ebnf$2", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "exprBody$ebnf$3", "symbols": [(tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)]},
    {"name": "exprBody$ebnf$3", "symbols": ["exprBody$ebnf$3", (tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "exprBody", "symbols": ["exprBody$ebnf$2", (tokenizer.has("LineFeed") ? {type: "LineFeed"} : LineFeed), "exprBody$ebnf$3", "expr"], "postprocess": 
        ([spaces, newLine, indents, expr]) =>
          merge(...spaces, newLine, ...indents, expr)
                    },
    {"name": "exprStmt$ebnf$1", "symbols": []},
    {"name": "exprStmt$ebnf$1", "symbols": ["exprStmt$ebnf$1", "exprStmtCont"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "exprStmt", "symbols": [(tokenizer.has("LineFeed") ? {type: "LineFeed"} : LineFeed), "expr", "exprStmt$ebnf$1"], "postprocess": 
        ([, expr, exprs]) => intoExpr(expr, ...exprs)
        },
    {"name": "exprStmtCont$ebnf$1", "symbols": []},
    {"name": "exprStmtCont$ebnf$1", "symbols": ["exprStmtCont$ebnf$1", "spaceOrNewLine"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "exprStmtCont", "symbols": ["exprStmtCont$ebnf$1", "expr"], "postprocess": 
        ([spaces, expr]) => merge(...spaces, expr)
        },
    {"name": "expr$ebnf$1", "symbols": []},
    {"name": "expr$ebnf$1$subexpression$1", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word)], "postprocess": id},
    {"name": "expr$ebnf$1$subexpression$1", "symbols": ["spaceOrNewLine"], "postprocess": id},
    {"name": "expr$ebnf$1", "symbols": ["expr$ebnf$1", "expr$ebnf$1$subexpression$1"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "expr", "symbols": [(tokenizer.has("Word") ? {type: "Word"} : Word), "expr$ebnf$1", (tokenizer.has("SentenceFinal") ? {type: "SentenceFinal"} : SentenceFinal)], "postprocess": 
        ([text, texts, final]) => merge(text, ...texts, final)
        },
    {"name": "spaceOrNewLine", "symbols": [(tokenizer.has("Whitespace") ? {type: "Whitespace"} : Whitespace)], "postprocess": id},
    {"name": "spaceOrNewLine", "symbols": [(tokenizer.has("EndOfLine") ? {type: "EndOfLine"} : EndOfLine)], "postprocess": id},
    {"name": "spaceOrNewLine", "symbols": [(tokenizer.has("LineFeed") ? {type: "LineFeed"} : LineFeed)], "postprocess": id},
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
