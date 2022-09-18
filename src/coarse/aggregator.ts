import { Eomi, Yongeon } from "eomi-js";
import nearley from "nearley";
import { SourceSpan } from "../base/errors";
import { ChaltteokSyntaxError, SourceFile, WithMetadata } from "../base/errors";
import { POS, VocabEntry } from "../base/pos";
import { CompiledImpl, Processor } from "../finegrained/procedure";
import { Token } from "../finegrained/tokens";
import {
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../finegrained/types";
import { Analyzer, makeJosa } from "../lexer/analyzer";
import { parseTypeAnnotation } from "../parser/pattern";
import { Signature } from "../typechecker/signature";
import grammar from "./grammar";
import { JSBody, Statement } from "./structure";
import { CoarseTokenizer } from "./tokenizer";

export function* parseStructureInteractive(
): Generator<
  undefined,
  Statement[],
  WithMetadata<string>
> {
  const file: SourceFile = { content: '', path: "<stdin>" };

  const localGrammar = nearley.Grammar.fromCompiled(grammar);
  (localGrammar.lexer as CoarseTokenizer).file = file;
  const parser = new nearley.Parser(localGrammar);

  let span: SourceSpan | undefined = undefined;
  do {
    const line = yield;
    file.content += line.value;
    span = span == null ? line.span : { start: span.start, end: line.span.end };

    parser.feed(line.value);
    if (parser.results.length > 1) {
      throw new ChaltteokSyntaxError("구문이 중의적입니다.", file, span);
    }
  } while (parser.results.length !== 1);
  return parser.results[0];
}

export function parseStructure(
  program: WithMetadata<string>
): Statement[] {
  const localGrammar = nearley.Grammar.fromCompiled(grammar);
  (localGrammar.lexer as CoarseTokenizer).file = program.file;
  const parser = new nearley.Parser(localGrammar);

  parser.feed(program.value);
  const results = parser.results;
  if (results.length === 0) {
    throw new ChaltteokSyntaxError(
      "구문을 해석할 수 없습니다.",
      program.file,
      program.span
    );
  }
  if (results.length > 1) {
    throw new ChaltteokSyntaxError(
      "구문이 중의적입니다.",
      program.file,
      program.span
    );
  }
  return results[0];
}

export function addVocab(analyzer: Analyzer, vocab: VocabEntry): void {
  let lemma = vocab.lemma.value.trim();
  if (lemma.slice(0, 1) === "-") lemma = lemma.slice(1);
  const pos = vocab.pos.value;
  const extra = vocab.extra?.value ?? "";

  if (pos === "형용사" || pos === "동사") {
    const variants = [];
    if (!extra.trim()) variants.push(new Yongeon(lemma));
    else {
      const [hae, hani] = extra.split(",", 2);
      const haes = lemma.includes("/") ? [hae] : hae.split("/");
      for (const _hae of haes)
        variants.push(new Yongeon(lemma, _hae.trim(), hani.trim()));
    }
    if (pos === "형용사") variants.forEach((x) => analyzer.addAdj(x));
    else variants.forEach((x) => analyzer.addVerb(x));
  } else if (pos === "어미") {
    const all = extra.trim() === "";
    const attachTo = [];
    if (all || extra.includes("동사")) attachTo.push("동사");
    if (all || extra.includes("형용사")) attachTo.push("형용사");
    if (all || extra.includes("있다")) attachTo.push("있다");
    if (all || extra.includes("이다")) attachTo.push("이다");
    if (all || extra.includes("아니다")) attachTo.push("아니다");

    const [a, b] = lemma
      .replace("(아/어)", "어")
      .replace("(어/아)", "어")
      .split("/", 2);
    analyzer.addEomi(new Eomi(a, b), attachTo);
  } else if (pos === "조사") {
    const [a, b] = lemma.split("/", 2);
    const word = makeJosa(a, b);
    analyzer.addJosa(word);
  } else analyzer.add(lemma, pos);
}

export class Substituter {
  // TODO: analyze if cycle exists & recursively expand!
  synonyms: [Token, Token[]][];
  constructor(synonyms?: [Token, Token[]][]) {
    this.synonyms = synonyms || [];
  }
  clone() {
    return new Substituter(this.synonyms.slice());
  }
  add(src: Token, trg: Token[]) {
    this.synonyms.push([src, trg]);
  }
  _runSingle(token: Token): Token[] {
    if (token.type !== "word") return [token];
    for (const [src, trg] of this.synonyms) {
      if (src.type !== "word") continue;
      if (src.lemma !== token.lemma) continue;
      if (src.pos !== token.pos) continue;
      return trg;
    }
    return [token];
  }
  run(tokens: Token[]): Token[] {
    return tokens.flatMap((token) => this._runSingle(token));
  }
}

export function parseJS(
  body: JSBody,
): [CompiledImpl, Signature | undefined, POS | undefined] {
  let pos: POS | undefined = undefined;
  let param: TypeAnnotation[] | undefined = undefined;
  let antecedent: TypePack | VariableAnnotation | "any" | undefined = undefined;

  new Function("pos", "needs", "needsAntecedent", body.block.value)(
    function (_pos?: POS) {
      pos = _pos;
    },
    function (..._types: string[]) {
      param = _types.map(parseTypeAnnotation);
    },
    function (_antecedent: string) {
      const _type = parseTypeAnnotation(_antecedent);
      if (_type === "new" || _type === "lazy") {
        throw new ChaltteokSyntaxError(
          `선행사 타입 주석으로 ${_type}를 쓸 수 없습니다.`,
          body.block.file,
          body.block.span
        );
      }
      antecedent = _type;
    }
  );

  let signature: Signature | undefined = undefined;
  if (param != null) signature = { param, antecedent };

  const dummy = () => {
    // do nothing
  };
  const fn = new Function(
    "env",
    "pos",
    "needs",
    "needsAntecedent",
    "antecedent",
    body.block.value
  );
  const processor: Processor = (env) => (antecedent) =>
    fn(env, dummy, dummy, dummy, () => antecedent)(...env.args);
  const impl: CompiledImpl = {
    type: "compiled",
    body: processor,
  };

  return [impl, signature, pos];
}
