import { ChaltteokRuntimeError, InternalError } from "../base/errors";
import { WithMetadata } from "../base/metadata";
import { VocabEntry } from "../base/pos";
import { Body, Statement } from "../coarse/structure";
import { Env } from "../finegrained/env";
import { Action, Impl, Procedure, Protocol } from "../finegrained/procedure";
import { Tree } from "../finegrained/terms";
import { Token } from "../finegrained/tokens";
import {
  TypeAnnotation,
  TypePack,
  VariableAnnotation,
} from "../finegrained/types";
import {
  getConcreteValues,
  NewBox,
  RefBox,
  StrictValuePack,
  Thunk,
  Value,
  ValuePack,
} from "../finegrained/values";
import { parse } from "../parser/parser";
import { getPermutedPatterns, parsePattern, Pattern } from "../parser/pattern";
import { isMoreSpecificSignature } from "../typechecker/resolver";
import { getType, matchesSignature, Signature } from "../typechecker/signature";
import { ListMap, overloaded, zip } from "../utils/utils";
import { Context, parseJS } from "./aggregator";
import { formatType } from "./formatter";

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

function deriveSignature(
  original: Signature,
  protocol: Protocol
): Signature | null {
  if (original.antecedent) return null;

  const param: TypeAnnotation[] = [];
  let antecedent: TypePack | VariableAnnotation | "any" | undefined = undefined;
  for (const [actual, virtual] of protocol.arguments.entries()) {
    if (virtual != null) param[virtual] = original.param[actual];
    else {
      const _antecedent = original.param[actual];
      if (_antecedent === "new") return null;
      if (_antecedent === "lazy") antecedent = "any";
      else antecedent = _antecedent;
    }
  }
  return { param, antecedent: antecedent };
}

type Definition = { patterns: WithMetadata<string>[]; body: Body };

export class Module {
  private readonly context: Context;
  private readonly vocab: VocabEntry[] = [];
  private readonly synonyms: Record<number, WithMetadata<string>> = {};
  private readonly definitions: Definition[] = [];
  private readonly patterns: Pattern[] = [];
  readonly patternLocations: Record<string, Set<number>>;
  private readonly main: WithMetadata<string>[] = [];

  // pattern -> signature -> procedure
  // looked up at runtime
  private readonly impls: Impl[] = [];
  protected readonly lookup: ListMap<[Signature, number, Protocol | undefined]>;

  constructor(public readonly imports: Module[], statements: Statement[]) {
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
    this.context = this.initContext();
    this.patternLocations = this.getPatternLocations();

    this.lookup = new ListMap();
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
      for (const pattern of module.patterns) {
        const key = pattern.key;
        if (!(key in patternLocations)) patternLocations[key] = new Set();
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

  build(): void {
    const tokenized: Array<
      [WithMetadata<Token>[], [string, Signature, Protocol | undefined][]]
    > = [];

    for (const definition of this.definitions) {
      if (definition.body.type === "JSBody") {
        const [impl, signature, pos] = parseJS(definition.body);
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
      const expr = parse(body, this.context.patterns);
      const implID = this.registerImpl({ type: "expr", expr: expr });
      for (const [key, sign, protocol] of expanded) {
        this.lookup.get(key).push([sign, implID, protocol]);
      }
    }
  }

  getSignatures(patternKey: string): Signature[] {
    return this.lookup.get(patternKey).map(([signature, ,]) => signature);
  }

  getAction(patternKey: string, signature: Signature): Action | undefined {
    const match = this.lookup
      .get(patternKey)
      .find(
        ([_signature, ,]) =>
          JSON.stringify(signature) === JSON.stringify(_signature)
      );
    if (match == null) return undefined;
    const [, implID, protocol] = match;
    return { type: "FunCall", fun: { impl: this.impls[implID], protocol } };
  }

  /**
   * Run in the context where the procedure was defined.
   */
  call(
    fun: Procedure,
    args: ValuePack[],
    antecedent?: Value[] | RefBox
  ): ValuePack {
    [args, antecedent] = unwrapProtocol(args, antecedent, fun.protocol);
    const env = new ModuleEnv(this, args);

    if (fun.impl.type === "compiled") return fun.impl.fun(env)(antecedent);

    let value: StrictValuePack = [];
    for (const expr of fun.impl.expr) {
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
    let value;
    try {
      value = this.env.interpret(this.expr, this.antecedent);
    } catch (error) {
      if (error instanceof ChaltteokRuntimeError)
        error.traceback.push(this.expr.metadata);
      throw error;
    }
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
    const err = new ChaltteokRuntimeError("표현식 해석에 실패했습니다.", []);

    const head = expr.head;
    if ("token" in head) {
      if (head.token.type === "id") return this.get(head.token.lemma);
      if (head.token.type === "number") {
        const type = Number.isInteger(head.token.number) ? "정수" : "수";
        return [{ type, 값: head.token.number }];
      }
      throw err;
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
  ): ValuePack {
    const signatureInfos = this.getSignatureInfos(key);
    if (signatureInfos.length === 0)
      throw new ChaltteokRuntimeError(
        `"${key}" 꼴에 대응하는 함수를 찾지 못했습니다.`,
        []
      );
    assertCompatible(signatureInfos.map(({ signature }) => signature));

    const children: ValuePack[] = zip(
      args,
      shouldStrict(signatureInfos[0].signature)
    ).map(([arg, should]) =>
      should && arg instanceof Thunk ? arg.strict() : arg
    );

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
    if (matched.length === 0) {
      const formatted = argTypes.map((x) => formatType(x ?? "lazy")).join(", ");
      throw new ChaltteokRuntimeError(
        `"${key}" 꼴의 함수 중 다음 자료형을 인수로 받는 것을 찾지 못했습니다: ${formatted}. `,
        []
      );
    }

    const { signature, origin } = matched.reduce((acc, cur) =>
      isMoreSpecificSignature(acc.signature, cur.signature) ? acc : cur
    ); // TODO: error when multiple such minimal ones exist
    const action = origin.getAction(key, signature);
    if (action == null)
      throw new InternalError("interpretGeneric::NULL_ACTION");
    if (action.type === "ArgRef") return this.getArg(action.index);

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
    return origin.call(action.fun, casted, antecedent);
  }
}
