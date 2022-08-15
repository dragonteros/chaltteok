import { BUILTIN_PATTERNS } from "../builtin";
import { Analyzer } from "../lexer/analyzer";
import { tokenize } from "../lexer/tokenizer";
import { RuntimeError, SyntaxError, Token } from "../lexer/tokens";
import {
  addVocab,
  Definition,
  parseJS,
  parseProgram,
  Substituter,
  VocabEntry,
} from "../parser/aggregator";
import { Tree } from "../parser/ast";
import { parse } from "../parser/parser";
import {
  deriveSignature,
  getPermutedPatterns,
  IndexedPatterns,
  parsePattern,
  Pattern,
} from "../parser/pattern";
import { PRELUDE } from "../prelude/prelude";
import {
  getType,
  isMoreSpecificSignature,
  matchesSignature,
} from "../typechecker/typechecker";
import { ListMap, overloaded, zip } from "../utils/utils";
import {
  Env,
  getConcreteValues,
  Impl,
  NewBox,
  Procedure,
  Protocol,
  RefBox,
  Signature,
  StrictValuePack,
  Thunk,
  TypePack,
  Value,
  ValuePack,
  VariableAnnotation,
} from "./values";

function allEqual<T>(collection: T[]): boolean {
  if (collection.length === 0) return true;
  const serialized = collection.map((x) => JSON.stringify(x));
  return serialized.slice(1).every((x) => x === serialized[0]);
}

function assertCompatible(signatures: Signature[]): void {
  const features = signatures.map(shouldStrict);
  if (!allEqual(features))
    throw new RuntimeError("Internal Error assertCompatible");
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

  tokenize(sentence: string): Token[] {
    return this.substituter.run(tokenize(sentence, this.analyzer));
  }

  loadVocab(vocab: VocabEntry): [Token, string][] {
    const synonym = addVocab(this.analyzer, vocab);
    if (synonym == null) return [];
    const src: Token = { type: "word", lemma: vocab.lemma, pos: vocab.pos };
    return [[src, synonym]];
  }

  loadSynonym(token: Token, synonym: string): void {
    this.substituter.add(token, tokenize(synonym, this.analyzer));
  }

  loadPattern(pattern: Pattern) {
    this.patterns.push(pattern);
  }
}

export class Module {
  private readonly context: Context;
  private readonly patterns: Pattern[] = [];
  readonly patternLocations: Record<string, Set<number>>;

  // pattern -> signature -> procedure
  // looked up at runtime
  private readonly impls: Impl[] = [];
  protected readonly lookup: ListMap<[Signature, number, Protocol | undefined]>;

  constructor(
    public readonly imports: Module[],
    private readonly vocab: VocabEntry[],
    private readonly definitions: Definition[],
    private readonly main: string
  ) {
    this.context = this.initContext();
    this.patternLocations = this.getPatternLocations();

    this.lookup = new ListMap();

    this.build();
  }

  private initContext(): Context {
    const context = new Context();
    const synonyms: [Token, string][] = [];

    for (const vocab of this.vocab) {
      synonyms.push(...context.loadVocab(vocab));
    }
    for (const module of this.imports) {
      for (const vocab of module.vocab) {
        synonyms.push(...context.loadVocab(vocab));
      }
      for (const pattern of module.patterns) {
        context.loadPattern(pattern);
      }
    }
    for (const [src, trg] of synonyms) {
      context.loadSynonym(src, trg);
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

  protected antecedentPattern(pattern: Pattern): void {
    this.patterns.push(pattern);
    this.context.loadPattern(pattern);
  }

  protected antecedentImpl(impl: Impl): number {
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
      [Token[][], [string, Signature, Protocol | undefined][]]
    > = [];

    for (const definition of this.definitions) {
      if (definition.body[0] === "{JS}") {
        const [impl, signature, pos] = parseJS(definition.body[1]);
        const implID = this.antecedentImpl(impl);

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
              this.antecedentPattern(ptn);
              this.lookup.get(ptn.key).push([sign, implID, protocol]);
            }
          }
        }
      } else {
        const body = definition.body.map((x) => this.context.tokenize(x));
        const expanded: [string, Signature, Protocol | undefined][] = [];

        for (const pattern of definition.patterns) {
          const tokens = this.context.tokenize(pattern);
          const [newPatterns, newSignature] = parsePattern(tokens);
          for (const newPattern of newPatterns) {
            for (const [ptn, sign, protocol] of this.expandPatterns(
              newPattern,
              newSignature
            )) {
              this.antecedentPattern(ptn);
              expanded.push([ptn.key, sign, protocol]);
            }
          }
        }
        // wait until all patterns are antecedented
        tokenized.push([body, expanded]);
      }
    }

    for (const [body, expanded] of tokenized) {
      const _body = body.flatMap((x) => parse(x, this.context.patterns));
      const implID = this.antecedentImpl({ type: "expr", body: _body });
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
          JSON.stringify(signature) == JSON.stringify(_signature)
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
    const tokens = this.context.tokenize(this.main);
    const exprs = parse(tokens, this.context.patterns);

    const env = new ModuleEnv(this, []);
    let value: StrictValuePack = [];
    for (const expr of exprs) {
      value = env.lazy(expr).strict();
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
        throw new RuntimeError("Internal Error unwrapProtocol::WRONG_ARITY.");
      }
      inputs.push(args[i]);
    } else if (antecedent != null) {
      inputs.push(antecedent);
      antecedent = undefined;
    } else {
      throw new RuntimeError("Internal Error unwrap_protocol::NO_ANTECEDENT.");
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

  interpret(expr: Tree, antecedent?: Value[] | RefBox): ValuePack {
    const err = new SyntaxError("표현식 해석에 실패했습니다.");
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
    const err = new RuntimeError("인수의 타입에 맞는 함수를 찾지 못했습니다.");

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
        throw new Error("Internal Error casted::NEW_BOX");

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
    const program = parseProgram(PRELUDE);
    super([], program.vocab, program.definitions, program.main);
  }

  protected build(): void {
    for (const [pattern, signature, proc] of BUILTIN_PATTERNS) {
      if (proc == null) {
        this.antecedentPattern(pattern);
        continue;
      }
      const implID = this.antecedentImpl({ type: "compiled", body: proc });
      for (const [ptn, sign, protocol] of this.expandPatterns(
        pattern,
        signature
      )) {
        this.antecedentPattern(ptn);
        this.lookup.get(ptn.key).push([sign, implID, protocol]);
      }
    }

    super.build();
  }
}

export const Prelude = new PreludeModule();
