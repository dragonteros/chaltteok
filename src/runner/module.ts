import { ExprAST } from "src/finegrained/ast";
import { Tree } from "src/finegrained/terms";
import {
  ChaltteokRuntimeError,
  ChaltteokSyntaxError,
  InternalError,
  SourceFile,
  WithSpan,
} from "../base/errors";
import { VocabEntry } from "../base/pos";
import { BUILTIN_PATTERNS } from "../builtin/builtin";
import { PRELUDE } from "../builtin/prelude";
import {
  addVocab,
  parseJS,
  parseStructure,
  Substituter,
} from "../coarse/aggregator";
import { Body, Statement } from "../coarse/structure";
import { Env } from "../finegrained/env";
import { Impl, Procedure, Protocol } from "../finegrained/procedure";
import { Token } from "../finegrained/tokens";
import { TypePack, VariableAnnotation } from "../finegrained/types";
import {
  getConcreteValues,
  NewBox,
  RefBox,
  StrictValuePack,
  Thunk,
  Value,
  ValuePack,
} from "../finegrained/values";
import { Analyzer } from "../lexer/analyzer";
import { tokenize } from "../lexer/tokenizer";
import { parse } from "../parser/parser";
import {
  deriveSignature,
  getPermutedPatterns,
  IndexedPatterns,
  parsePattern,
  Pattern,
} from "../parser/pattern";
import { isMoreSpecificSignature } from "../typechecker/resolver";
import { getType, matchesSignature, Signature } from "../typechecker/signature";
import { ListMap, overloaded, zip } from "../utils/utils";

function allEqual<T>(collection: T[]): boolean {
  if (collection.length === 0) return true;
  const serialized = collection.map((x) => JSON.stringify(x));
  return serialized.slice(1).every((x) => x === serialized[0]);
}

function assertCompatible(signatures: Signature[]): void {
  const features = signatures.map(shouldStrict);
  if (!allEqual(features)) throw new InternalError("assertCompatible");
}

function shouldStrict(signature: Signature): boolean[] {
  return signature.param.map((x) => x !== "lazy");
}

export class Context {
  analyzer: Analyzer;
  substituter: Substituter;
  patterns: IndexedPatterns;

  constructor() {
    this.analyzer = new Analyzer();
    this.substituter = new Substituter();
    this.patterns = new IndexedPatterns();
  }

  tokenize(sentence: WithSpan<string>): Token[] {
    return this.substituter.run(tokenize(sentence, this.analyzer));
  }

  loadVocab(vocab: VocabEntry): void {
    addVocab(this.analyzer, vocab);
  }
  loadSynonym(vocab: VocabEntry, synonym: WithSpan<string>): void {
    const token: Token = {
      type: "word",
      lemma: vocab.lemma.value,
      pos: vocab.pos.value,
    };
    this.substituter.add(token, tokenize(synonym, this.analyzer));
  }

  loadPattern(pattern: Pattern) {
    this.patterns.push(pattern);
  }
}

type Definition = { patterns: WithSpan<string>[]; body: Body };

export class Module {
  private readonly context: Context;
  private readonly vocab: VocabEntry[] = [];
  private readonly synonyms: Record<number, WithSpan<string>> = {};
  private readonly definitions: Definition[] = [];
  private readonly patterns: Pattern[] = [];
  readonly patternLocations: Record<string, Set<number>>;
  private readonly main: WithSpan<string>[] = [];

  // pattern -> signature -> procedure
  // looked up at runtime
  private readonly impls: Impl[] = [];
  protected readonly lookup: ListMap<[Signature, number, Protocol | undefined]>;

  constructor(
    public readonly imports: Module[],
    public readonly sourceFile: SourceFile,
    statements: Statement[]
  ) {
    this.context = this.initContext();
    this.patternLocations = this.getPatternLocations();

    for (const statement of statements) {
      switch (statement.type) {
        case "Expr":
          this.main.push(statement.expr);
          break;
        case "VocabDef":
          this.vocab.push(statement.vocab);
          break;
        case "SynonymDef":
          this.synonyms[this.vocab.length] = statement.synonym;
          this.vocab.push(statement.vocab);
          break;
        case "VocabFunDef":
          this.vocab.push(statement.vocab);
          this.definitions.push({
            patterns: [statement.vocab.lemma],
            body: statement.body,
          });
          break;
        case "FunDef":
          this.definitions.push(statement);
          break;
      }
    }

    this.lookup = new ListMap();
    this.build();
  }

  private initContext(): Context {
    const context = new Context();

    for (const vocab of this.vocab) {
      context.loadVocab(vocab);
    }
    for (const module of this.imports) {
      for (const vocab of module.vocab) {
        context.loadVocab(vocab);
      }
      for (const [vocabIdx, synonym] of Object.entries(module.synonyms)) {
        context.loadSynonym(module.vocab[+vocabIdx], synonym);
      }
      for (const pattern of module.patterns) {
        context.loadPattern(pattern);
      }
    }
    for (const [vocabIdx, synonym] of Object.entries(this.synonyms)) {
      context.loadSynonym(this.vocab[+vocabIdx], synonym);
    }

    return context;
  }

  private getPatternLocations(): Record<string, Set<number>> {
    const patternLocations: Record<string, Set<number>> = {};
    for (const [i, module] of this.imports.entries()) {
      for (const key of module.lookup.keys()) {
        if (!(key in patternLocations)) {
          patternLocations[key] = new Set();
        }
        patternLocations[key].add(i);
      }
    }
    return patternLocations;
  }

  protected registerPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
    this.context.loadPattern(pattern);
  }

  protected registerImpl(impl: Impl): number {
    const implID = this.impls.length;
    this.impls.push(impl);
    return implID;
  }

  protected expandPatterns(
    pattern: Pattern,
    signature: Signature
  ): [Pattern, Signature, Protocol | undefined][] {
    const results: [Pattern, Signature, Protocol | undefined][] = [];
    results.push([pattern, signature, undefined]);
    for (const [newPattern, protocol] of getPermutedPatterns(pattern)) {
      const newSignature = deriveSignature(signature, protocol);
      if (newSignature == null) continue;
      results.push([newPattern, newSignature, protocol]);
    }
    return results;
  }

  protected build(): void {
    const tokenized: Array<
      [Token[], [string, Signature, Protocol | undefined][]]
    > = [];

    for (const definition of this.definitions) {
      if (definition.body.type === "JSBody") {
        const [impl, signature, pos] = parseJS(
          definition.body,
          this.sourceFile
        );
        const implID = this.registerImpl(impl);

        for (const pattern of definition.patterns) {
          const tokens = this.context.tokenize(pattern);
          const [newPatterns, newSignature] = parsePattern(
            tokens,
            signature,
            pos
          );
          for (const newPattern of newPatterns) {
            for (const [ptn, sign, protocol] of this.expandPatterns(
              newPattern,
              newSignature
            )) {
              this.registerPattern(ptn);
              this.lookup.get(ptn.key).push([sign, implID, protocol]);
            }
          }
        }
      } else {
        const body = this.context.tokenize(definition.body.expr);
        const expanded: [string, Signature, Protocol | undefined][] = [];

        for (const pattern of definition.patterns) {
          const tokens = this.context.tokenize(pattern);
          const [newPatterns, newSignature] = parsePattern(tokens);
          for (const newPattern of newPatterns) {
            for (const [ptn, sign, protocol] of this.expandPatterns(
              newPattern,
              newSignature
            )) {
              this.registerPattern(ptn);
              expanded.push([ptn.key, sign, protocol]);
            }
          }
        }
        // wait until all patterns are antecedented
        tokenized.push([body, expanded]);
      }
    }

    for (const [body, expanded] of tokenized) {
      const _body = parse(body, this.context.patterns);
      const implID = this.registerImpl({ type: "expr", body: _body });
      for (const [key, sign, protocol] of expanded) {
        this.lookup.get(key).push([sign, implID, protocol]);
      }
    }
  }

  getSignatures(patternKey: string): Signature[] {
    return this.lookup.get(patternKey).map(([signature, ,]) => signature);
  }

  getProcedure(
    patternKey: string,
    signature: Signature
  ): Procedure | undefined {
    const match = this.lookup
      .get(patternKey)
      .find(
        ([_signature, ,]) =>
          JSON.stringify(signature) === JSON.stringify(_signature)
      );
    if (match == null) return undefined;
    const [, implID, protocol] = match;
    return { impl: this.impls[implID], protocol };
  }

  /**
   * Run in the context where the procedure was defined.
   */
  call(
    fun: Procedure,
    args: ValuePack[],
    antecedent?: Value[] | RefBox
  ): StrictValuePack {
    [args, antecedent] = unwrapProtocol(args, antecedent, fun.protocol);
    const env = new ModuleEnv(this, args);

    if (fun.impl.type === "compiled") {
      const result = fun.impl.body(env)(antecedent);
      return result instanceof Thunk ? result.strict() : result;
    }

    let value: StrictValuePack = [];
    for (const expr of fun.impl.body) {
      const thunk = env.lazy(expr);
      thunk.antecedent = antecedent;
      value = thunk.strict();
      antecedent = undefined;
    }
    return value;
  }

  runMain(): StrictValuePack {
    let value: StrictValuePack = [];
    const env = new ModuleEnv(this, []);

    for (const main of this.main) {
      const tokens = this.context.tokenize(main);
      const exprs = parse(tokens, this.context.patterns);
      for (const expr of exprs) value = env.lazy(expr).strict();
    }
    return value;
  }
}

function unwrapProtocol(
  args: ValuePack[],
  antecedent?: Value[] | RefBox,
  protocol?: Protocol
): [ValuePack[], Value[] | RefBox | undefined] {
  if (protocol == null) return [args, antecedent];

  const inputs: ValuePack[] = [];
  for (const i of protocol.arguments) {
    if (i != null) {
      if (i < 0 || i >= args.length) {
        throw new InternalError("unwrapProtocol::WRONG_ARITY.");
      }
      inputs.push(args[i]);
    } else if (antecedent != null) {
      inputs.push(antecedent);
      antecedent = undefined;
    } else {
      throw new InternalError("unwrap_protocol::NO_ANTECEDENT.");
    }
  }
  return [inputs, antecedent];
}

class ModuleEnvThunk extends Thunk {
  constructor(private readonly env: ModuleEnv, private readonly expr: Tree) {
    super();
  }
  strict(): StrictValuePack {
    const value = this.env.interpret(this.expr, this.antecedent);
    return value instanceof Thunk ? value.strict() : value;
  }
}

class ModuleEnv extends Env {
  constructor(readonly module: Module, args: ValuePack[]) {
    super(args);
  }

  lazy(expr: Tree): ModuleEnvThunk {
    return new ModuleEnvThunk(this, expr);
  }

  getSignatureInfos(key: string): { signature: Signature; origin: Module }[] {
    const infos: { signature: Signature; origin: Module }[] = this.module
      .getSignatures(key)
      .map((signature) => ({ signature, origin: this.module }));
    if (key in this.module.patternLocations) {
      for (const i of this.module.patternLocations[key]) {
        infos.push(
          ...this.module.imports[i]
            .getSignatures(key)
            .map((signature) => ({ signature, origin: this.module.imports[i] }))
        );
      }
    }
    return infos;
  }

  interpret(expr: ExprAST, antecedent?: Value[] | RefBox): ValuePack {
    const err = new ChaltteokSyntaxError("표현식 해석에 실패했습니다.");
    if ("index" in expr.head) {
      return this.getArg(expr.head.index);
    }
    if ("token" in expr.head) {
      if (expr.head.token.type === "id") return this.get(expr.head.token.lemma);
      if (expr.head.token.type === "number") {
        const type = Number.isInteger(expr.head.token.number) ? "정수" : "수";
        return [{ type, 값: expr.head.token.number }];
      }
      throw err; // TODO: arity?
    }
    const children = expr.children.map((x) => this.lazy(x));

    if (expr.key === "~과~") {
      const argValues: Value[][] = [];
      for (const child of children) {
        child.antecedent = antecedent;
        argValues.push(getConcreteValues(child.strict()));
        antecedent = undefined;
      }
      const param: TypePack[] = argValues.map(() => ({
        arity: 1,
        type: "T",
      }));
      const argTypes = argValues.map((x) => getType(x));
      if (!matchesSignature(argTypes, undefined, { param })) throw err;
      return argValues.map(([x]) => x);
    }

    return this.interpretGeneric(expr.key, children, antecedent);
  }

  interpretGeneric(
    key: string,
    args: ValuePack[],
    antecedent?: Value[] | RefBox
  ): StrictValuePack {
    const err = new ChaltteokRuntimeError(
      "인수의 타입에 맞는 함수를 찾지 못했습니다."
    );

    const signatureInfos = this.getSignatureInfos(key);
    if (signatureInfos.length === 0) throw err;

    assertCompatible(signatureInfos.map(({ signature }) => signature));
    const children: ValuePack[] = [];
    for (const [arg, should] of zip(
      args,
      Array.from(shouldStrict(signatureInfos[0].signature).values())
    )) {
      children.push(should && arg instanceof Thunk ? arg.strict() : arg);
    }
    const argTypes = children.map((x) =>
      x instanceof Thunk
        ? undefined
        : overloaded<
            Value[],
            TypePack,
            RefBox,
            VariableAnnotation,
            NewBox,
            "new"
          >(getType)(x)
    );
    const antType =
      antecedent &&
      overloaded<Value[], TypePack, RefBox, VariableAnnotation>(getType)(
        antecedent
      );
    const matched = signatureInfos.filter(({ signature }) =>
      matchesSignature(argTypes, antType, signature)
    );
    if (matched.length === 0) throw err;

    const { signature, origin } = matched.reduce((acc, cur) =>
      isMoreSpecificSignature(acc.signature, cur.signature) ? acc : cur
    ); // TODO: error when multiple such minimal ones exist
    const fun = origin.getProcedure(key, signature);
    if (fun == null) throw err;
    const casted = zip(children, signature.param).map(([child, param]) => {
      if (param === "lazy") return child;
      if (child instanceof Thunk) return child.strict();
      if (param === "new") return child;
      if ("data" in child && child.data == null)
        throw new InternalError("casted::NEW_BOX");

      function unwrap(x: Value[] | RefBox) {
        return "data" in x ? x.data : x;
      }
      if (param === "any") return unwrap(child);
      if ("variableOf" in param) return child;
      return unwrap(child);
    });
    return origin.call(fun, casted, antecedent);
  }
}

class PreludeModule extends Module {
  constructor() {
    const sourceFile: SourceFile = {
      path: "prelude", // TODO
      content: PRELUDE,
    };
    const program = parseStructure(
      { value: PRELUDE, span: { start: 0, end: PRELUDE.length } },
      sourceFile
    );
    super([], sourceFile, program);
  }

  protected build(): void {
    for (const [pattern, signature, action] of BUILTIN_PATTERNS) {
      if (action[0] === "ArgRef" || action[0] === "NumberLiteral") {
        this.registerPattern(pattern);
        // TODO
        continue;
      }
      const [actionType, actionValue] = action;
      const implID = this.registerImpl({ type: "compiled", body: action[1] });
      for (const [ptn, sign, protocol] of this.expandPatterns(
        pattern,
        signature
      )) {
        this.registerPattern(ptn);
        this.lookup.get(ptn.key).push([sign, implID, protocol]);
      }
    }

    super.build();
  }
}

export const Prelude = new PreludeModule();
