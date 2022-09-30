@preprocessor typescript
@{%
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
%}

@lexer tokenizer

# Program
program -> exprStmtCont:? (statement {% id %} | spaceOrNewLine {% skip %}):+ {%
  ([expr, stmts]) => filter([intoExpr(expr), ...stmts])
%}
statement -> vocabDef {% id %}
           | synonymDef {% id %}
           | vocabFunDef {% id %}
           | funDef {% id %}
           | exprStmt {% id %}

# Vocab Definition
vocabDef -> vocabCore %EndOfLine {%
  ([vocab]) => ({ type: "VocabDef", vocab })
%}
synonymDef -> vocabCore "->" _text_ %EndOfLine {%
  ([vocab, , synonym]) => ({ type: "SynonymDef", vocab, synonym })
%}
vocabCore -> text_ "[" _text_ "]" maybeText {%
  ([lemma, , pos, , extra]) => ({
    lemma,
    pos,
    extra: extra && trimStringWithMetadata(extra),
  })
%}

# Function Definition
vocabFunDef -> vocabCore ":" body {%
  ([vocab, , body]) => ({ type: "VocabFunDef", vocab, body })
%}
funDef -> (pattern spaceOrNewLine:* {% id %}):* pattern body {%
  ([patterns, pattern, body]) => ({
    type: "FunDef",
    patterns: [...patterns, pattern],
    body,
  })
%}
pattern -> text_ ":" {% id %}

body -> exprBody:+ {% ([exprs]) => intoExpr(...exprs) %}
      | spaceOrNewLine:* %JS {%
          ([, block]) => ({ type: "JSBody", block: merge(block) })  // cast
        %}
exprBody -> %Whitespace:* expr {% ([spaces, expr]) => merge(...spaces, expr) %}
          | spaceOrNewLine:* %LineFeed %Whitespace:+ expr {%
              ([spaces, newLine, indents, expr]) =>
                merge(...spaces, newLine, ...indents, expr)
            %}

# Expr
exprStmt -> %LineFeed expr exprStmtCont:* {%
  ([, expr, exprs]) => intoExpr(expr, ...exprs)
%}
exprStmtCont -> spaceOrNewLine:* expr {%
  ([spaces, expr]) => merge(...spaces, expr)
%}

expr -> %Word (%Word {% id %} | spaceOrNewLine {% id %}):* %SentenceFinal {%
  ([text, texts, final]) => merge(text, ...texts, final)
%}

# Building blocks
spaceOrNewLine -> %Whitespace {% id %} | %EndOfLine {% id %} | %LineFeed {% id %}

_text_ -> %Whitespace:* text_ {% ([, text]) => text %}
text_ -> %Word maybeText {%
  ([text, maybeText]) => trimStringWithMetadata(merge(text, maybeText))
%}
maybeText -> (%Word {% id %} | %Whitespace {% id %}):* {%
  function ([texts]) {
    texts = filter(texts);
    if (texts.length === 0) return undefined;
    const text = merge(...texts);
    if (text.value.trim() === "") return undefined;
    return text;
  }
%}
