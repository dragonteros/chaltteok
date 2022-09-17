// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any {
  return d[0];
}
declare var Text: any;
declare var SentenceFinal: any;
declare var Whitespace: any;
declare var JS: any;

import { mergeSpan, trimSpan } from "../base/errors";
import { Expr } from "./structure";
import { CoarseTokenizer } from "./tokenizer";

const tokenizer = new CoarseTokenizer();

interface NearleyToken {
  value: any;
  [key: string]: any;
}

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
}

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
}

type NearleySymbol =
  | string
  | { literal: any }
  | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
}

const grammar: Grammar = {
  Lexer: tokenizer,
  ParserRules: [
    { name: "statement", symbols: ["expr"] },
    { name: "statement", symbols: ["vocabDef"] },
    { name: "statement", symbols: ["synonymDef"] },
    { name: "statement", symbols: ["vocabFunDef"] },
    { name: "statement", symbols: ["funDef"] },
    {
      name: "expr$ebnf$1$subexpression$1",
      symbols: [tokenizer.has("Text") ? { type: "Text" } : Text],
    },
    { name: "expr$ebnf$1$subexpression$1", symbols: [{ literal: "\n" }] },
    { name: "expr$ebnf$1", symbols: ["expr$ebnf$1$subexpression$1"] },
    {
      name: "expr$ebnf$1$subexpression$2",
      symbols: [tokenizer.has("Text") ? { type: "Text" } : Text],
    },
    { name: "expr$ebnf$1$subexpression$2", symbols: [{ literal: "\n" }] },
    {
      name: "expr$ebnf$1",
      symbols: ["expr$ebnf$1", "expr$ebnf$1$subexpression$2"],
      postprocess: (d) => d[0].concat([d[1]]),
    },
    {
      name: "expr",
      symbols: [
        "expr$ebnf$1",
        tokenizer.has("SentenceFinal")
          ? { type: "SentenceFinal" }
          : SentenceFinal,
      ],
      postprocess: ([texts, final]) => ({
        type: "Expr",
        expr: trimSpan(mergeSpan(...texts, final)),
      }),
    },
    {
      name: "vocabCore$ebnf$1",
      symbols: [tokenizer.has("Text") ? { type: "Text" } : Text],
      postprocess: id,
    },
    { name: "vocabCore$ebnf$1", symbols: [], postprocess: () => null },
    {
      name: "vocabCore",
      symbols: [
        tokenizer.has("Text") ? { type: "Text" } : Text,
        { literal: "[" },
        tokenizer.has("Text") ? { type: "Text" } : Text,
        { literal: "]" },
        "vocabCore$ebnf$1",
      ],
      postprocess: ([lemma, , pos, , extra]) => ({
        lemma: trimSpan(lemma),
        pos: trimSpan(pos),
        extra: extra && trimSpan(extra),
      }),
    },
    {
      name: "vocabDef",
      symbols: ["vocabCore", { literal: "\n" }],
      postprocess: ([vocab]) => ({ type: "VocabDef", vocab }),
    },
    {
      name: "synonymDef",
      symbols: [
        "vocabCore",
        { literal: "->" },
        tokenizer.has("Text") ? { type: "Text" } : Text,
        { literal: "\n" },
      ],
      postprocess: ([vocab, , synonym]) => ({
        type: "SynonymDef",
        vocab,
        synonym: trimSpan(synonym),
      }),
    },
    {
      name: "body$ebnf$1",
      symbols: [
        tokenizer.has("Whitespace") ? { type: "Whitespace" } : Whitespace,
      ],
      postprocess: id,
    },
    { name: "body$ebnf$1", symbols: [], postprocess: () => null },
    {
      name: "body",
      symbols: ["body$ebnf$1", tokenizer.has("JS") ? { type: "JS" } : JS],
      postprocess: ([, block]) => ({ type: "JSBody", block }),
    },
    { name: "body$ebnf$2", symbols: ["expr"] },
    {
      name: "body$ebnf$2",
      symbols: ["body$ebnf$2", "expr"],
      postprocess: (d) => d[0].concat([d[1]]),
    },
    {
      name: "body",
      symbols: ["body$ebnf$2"],
      postprocess: ([exprs]) => ({
        type: "Expr",
        expr: mergeSpan(...exprs.map((x: Expr) => x.expr)),
      }),
    },
    {
      name: "vocabFunDef",
      symbols: ["vocabCore", { literal: ":" }, "body"],
      postprocess: ([vocab, , body]) => ({ type: "VocabFunDef", vocab, body }),
    },
    {
      name: "pattern",
      symbols: [
        tokenizer.has("Text") ? { type: "Text" } : Text,
        { literal: ":" },
      ],
      postprocess: ([pattern]) => trimSpan(pattern),
    },
    { name: "funDef$ebnf$1", symbols: ["pattern"] },
    {
      name: "funDef$ebnf$1",
      symbols: ["funDef$ebnf$1", "pattern"],
      postprocess: (d) => d[0].concat([d[1]]),
    },
    {
      name: "funDef",
      symbols: ["funDef$ebnf$1", "body"],
      postprocess: ([patterns, body]) => ({ type: "FunDef", patterns, body }),
    },
  ],
  ParserStart: "statement",
};

export default grammar;
