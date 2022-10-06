import { Eomi, Yongeon } from "eomi-js";
import { ChaltteokSyntaxError } from "../base/errors";
import { WithMetadata } from "../base/metadata";
import { POS, VocabEntry } from "../base/pos";
import { JSBody } from "../coarse/structure";
import { CompiledImpl, Processor } from "../finegrained/procedure";
import { Token, WordToken } from "../finegrained/tokens";
import {
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../finegrained/types";
import { Analyzer, makeJosa } from "../lexer/analyzer";
import { equalWord } from "../parser/matcher";
import { parseTypeAnnotation } from "../parser/pattern";
import { Signature } from "../typechecker/signature";

import { tokenize } from "../lexer/tokenizer";
import { Pattern } from "../parser/pattern";
import { IndexedPatterns } from "../parser/utils";

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
    if (all || extra.includes("없다")) attachTo.push("없다");
    if (all || extra.includes("이다")) attachTo.push("이다");
    if (all || extra.includes("아니다")) attachTo.push("아니다");

    const [a, b] = lemma
      .replace("(아/어)", "어")
      .replace("(어/아)", "어")
      .split("/", 2);
    analyzer.addEomi(new Eomi(a.trim(), b?.trim()), attachTo);
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
  _runSingle(token: WithMetadata<Token>): WithMetadata<Token>[] {
    if (token.value.type !== "word") return [token];
    for (const [src, trg] of this.synonyms) {
      if (src.type !== "word") continue;
      if (src.lemma !== token.value.lemma) continue;
      if (src.pos !== token.value.pos) continue;
      return trg.map((value) => ({ ...token, value }));
    }
    return [token];
  }
  run(tokens: WithMetadata<Token>[]): WithMetadata<Token>[] {
    return tokens.flatMap((token) => this._runSingle(token));
  }
}

const 다: WordToken = { lemma: "-다", pos: "어미", type: "word" };

export class Context {
  analyzer: Analyzer;
  substituter: Substituter;
  patterns: IndexedPatterns;

  constructor() {
    this.analyzer = new Analyzer();
    this.substituter = new Substituter();
    this.patterns = new IndexedPatterns();
  }

  tokenize(sentence: WithMetadata<string>): WithMetadata<Token>[] {
    return this.substituter.run(tokenize(sentence, this.analyzer));
  }

  loadVocab(vocab: VocabEntry): void {
    addVocab(this.analyzer, vocab);
  }
  loadSynonym(vocab: VocabEntry, synonym: WithMetadata<string>): void {
    const token: Token = {
      type: "word",
      lemma: vocab.lemma.value,
      pos: vocab.pos.value,
    };
    const target = tokenize(synonym, this.analyzer, false).map(
      (token) => token.value
    );
    if (equalWord(target[target.length - 1], 다)) target.pop();
    this.substituter.add(token, target);
  }

  loadPattern(pattern: Pattern) {
    this.patterns.push(pattern);
  }
}

export function parseJS(
  body: JSBody
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
          body.block.metadata
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
    fun: processor,
  };

  return [impl, signature, pos];
}
