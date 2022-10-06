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
program -> (statement {% id %} | spaceOrNewLine {% skip %}):* %EndOfDocument:? {%
  ([stmts]) => filter(stmts)
%}
statement -> vocabDef {% id %}
           | synonymDef {% id %}
           | vocabFunDef {% id %}
           | funDef {% id %}
           | expr {% ([expr]) => intoExpr(expr) %}

# Vocab Definition
vocabDef -> vocabCore (%NewLine | %EndOfDocument) {%
  ([vocab]) => ({ type: "VocabDef", vocab })
%}
synonymDef -> vocabCore "->" _text_ (%NewLine | %EndOfDocument) {%
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
vocabFunDef -> vocabCore ":" spaceOrNewLine:* body {%
  ([vocab, , , body]) => ({ type: "VocabFunDef", vocab, body })
%}
funDef -> pattern:+ body {%
  ([patterns, body]) => ({ type: "FunDef", patterns, body })
%}
pattern -> text_ ":" spaceOrNewLine:* {% id %}

body -> exprBody %Whitespace:* doubleNewLines {% ([expr]) => intoExpr(expr) %}
      | %JS {%
          ([block]) => ({ type: "JSBody", block: merge(block) })  // cast
        %}
exprBody -> expr {% ([expr]) => expr %}
          | exprBody maybeNewLine expr {% (exprs) => merge(...exprs) %}
doubleNewLines -> %EndOfDocument {% skip %}
                | %NewLine %Whitespace:* (%NewLine | %EndOfDocument) {% skip %}

# Expr
expr -> %Word (%Word {% id %} | spaceOrNewLine {% id %}):* %SentenceFinal {%
  ([text, texts, final]) => merge(text, ...texts, final)
%}

# Building blocks
spaceOrNewLine -> %Whitespace {% id %} | %NewLine {% id %} 
maybeNewLine -> %Whitespace:* {% ([spaces]) => merge(...spaces) %}
              | %Whitespace:* %NewLine %Whitespace:* {%
                  ([leading, newline, trailing]) =>
                    merge(...leading, newline, ...trailing)
                %}

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
