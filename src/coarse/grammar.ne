@preprocessor typescript
@{%
import { CoarseTokenizer } from "./tokenizer";
import { mergeSpan, trimSpan } from "../base/errors";
import { Expr } from "./structure";

const tokenizer = new CoarseTokenizer();
%}

@lexer tokenizer

program -> statement:+

statement -> expr
           | vocabDef
           | synonymDef
           | vocabFunDef
           | funDef

expr -> (%Text | "\n"):+ %SentenceFinal {%
  ([texts, final]) => ({
    type: "Expr", expr: trimSpan(mergeSpan(...texts, final))
  })
%}

# Vocab Definition
vocabCore -> %Text "[" %Text "]" %Text:? {%
  ([lemma, , pos, , extra]) => ({
    lemma: trimSpan(lemma), pos: trimSpan(pos), extra: extra && trimSpan(extra)
  })
%}
vocabDef -> vocabCore "\n" {%
  ([vocab]) => ({type: "VocabDef", vocab})
%}
synonymDef -> vocabCore "->" %Text "\n" {%
  ([vocab, , synonym]) => ({
    type: "SynonymDef", vocab, synonym: trimSpan(synonym)
  })
%}

# Function Definition
body -> %Whitespace:? %JS {% ([, block]) => ({type: "JSBody", block}) %}
      | expr:+ {% ([exprs]) => ({
          type: "Expr", expr: mergeSpan(...exprs.map((x: Expr) => x.expr))
        }) %}
vocabFunDef -> vocabCore ":" body {%
  ([vocab, , body]) => ({type: "VocabFunDef", vocab, body})
%}
pattern -> %Text ":" {% ([pattern]) => trimSpan(pattern) %}
funDef -> pattern:+ body {%
  ([patterns, body]) => ({type: "FunDef", patterns, body})
%}
