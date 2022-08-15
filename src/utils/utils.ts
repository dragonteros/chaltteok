import { POS, Token } from "../lexer/tokens";

export function fromAbbr(chunk: string): Token {
  if (chunk === "," || chunk === ".") return { type: "symbol", symbol: chunk };
  const posMark: Record<string, POS> = {
    n: "명사",
    v: "동사",
    a: "형용사",
    d: "관형사",
    p: "조사",
    e: "어미",
    s: "접미사",
  };
  const pos = posMark[chunk[chunk.length - 1]];
  if (!pos) return { type: "word", lemma: chunk, pos: "부사" };
  const lemma = chunk.slice(0, -1);
  if (isNaN(+lemma)) return { type: "word", lemma, pos };
  if (pos !== "명사") throw new Error("Internal Error fromAbbr::WRONG_POS");
  return { type: "number", lemma, pos, number: +lemma };
}

export function toAbbr(tag: Token): string {
  if (tag.type === "symbol") return tag.symbol;
  const posMark: Record<POS, string> = {
    명사: "n",
    대명사: "n",
    동사: "v",
    형용사: "a",
    관형사: "d",
    부사: "",
    조사: "p",
    어미: "e",
    접미사: "s",
  };
  return tag.lemma + posMark[tag.pos];
}

export const range = (length: number) => Array.from({ length }, (_, i) => i);
export function zip<T, U>(a: T[], b: U[]): [T, U][] {
  return range(Math.min(a.length, b.length)).map((i) => [a[i], b[i]]);
}
export function splitArray<T, U>(arr: T[], mapper: (x: T) => U | null): U[][] {
  const result = [];
  let buffer = [];
  for (const x of arr) {
    const mapped = mapper(x);
    if (mapped == null) {
      result.push(buffer);
      buffer = [];
    } else buffer.push(mapped);
  }
  result.push(buffer);
  return result;
}

export class DefaultArray<T> {
  constructor(
    protected readonly prepare: () => T,
    protected readonly data: (T | undefined)[] = []
  ) {}
  get length(): number {
    return this.data.length;
  }
  hasValueAt(i: number): boolean {
    return this.data[i] != null;
  }
  get(i: number): T {
    let item = this.data[i];
    if (item != null) return item;
    item = this.data[i] = this.prepare();
    return item;
  }
  set(i: number, item: T): void {
    this.data[i] = item;
  }
  slice(start?: number, end?: number): DefaultArray<T> {
    return new DefaultArray(this.prepare, this.data.slice(start, end));
  }
  map(f: (x: T) => T): DefaultArray<T> {
    const data = this.data.map((x) => (x == null ? x : f(x)));
    return new DefaultArray(this.prepare, data);
  }
  enumerate(): [number, T][] {
    const result: [number, T][] = [];
    for (let i = 0; i < this.data.length; i++) {
      const item = this.data[i];
      if (item != null) result.push([i, item]);
    }
    return result;
  }
}

export class DefaultMap<T> {
  constructor(
    protected readonly prepare: () => T,
    protected readonly cloneInner?: (obj: T) => T,
    protected readonly data: Record<string, T> = {}
  ) {}
  clone(): DefaultMap<T> {
    const data: Record<string, T> = {};
    for (const [key, value] of Object.entries(this.data)) {
      data[key] = this.cloneInner ? this.cloneInner(value) : value;
    }
    return new DefaultMap(this.prepare, this.cloneInner, data);
  }
  has(key: string): boolean {
    return key in this.data;
  }
  get(key: string): T {
    if (!this.has(key)) this.data[key] = this.prepare();
    return this.data[key];
  }
  set(key: string, value: T): void {
    this.data[key] = value;
  }
  reset(key: string): void {
    delete this.data[key];
  }
  update(other: DefaultMap<T>): void {
    for (const [key, value] of Object.entries(other.data)) {
      this.data[key] = value;
    }
  }
  keys(): string[] {
    return this.entries().map(([k]) => k);
  }
  values(): T[] {
    return this.entries().map(([, v]) => v);
  }
  entries(): [string, T][] {
    return Object.entries(this.data);
  }
}

export class ListMap<T> extends DefaultMap<T[]> {
  constructor(data: Record<string, T[]> = {}) {
    super(
      () => [],
      (x) => x.slice(),
      data
    );
  }
  has(key: string): boolean {
    return super.has(key) && this.data[key].length > 0;
  }
  entries(): [string, T[]][] {
    return super.entries().filter(([, v]) => v.length > 0);
  }
}

export function overloaded<A1, R1, A2, R2>(f: {
  (a: A1): R1;
  (a: A2): R2;
}): (a: A1 | A2) => R1 | R2;
export function overloaded<A1, R1, A2, R2, A3, R3>(f: {
  (a: A1): R1;
  (a: A2): R2;
  (a: A3): R3;
}): (a: A1 | A2 | A3) => R1 | R2 | R3;
export function overloaded(f: any) {
  return f;
}

export function toMultiVariate<T>(f: (a: T, b: T) => T | undefined) {
  return function g(...args: T[]): T | undefined {
    if (args.length === 0) return undefined;
    return args
      .slice(1)
      .reduce((a: T | undefined, b) => (a != null ? f(a, b) : a), args[0]);
  };
}
export function nullAccepting<T, U>(f: (...args: T[]) => U) {
  // Accepts multi-variate function only
  return function (...args: (T | null | undefined)[]): U | undefined {
    const newArgs = args.filter((x): x is T => x != null);
    if (newArgs.length === 0) return undefined;
    return f(...newArgs);
  };
}

export const intersection = toMultiVariate(
  <T>(a: Set<T>, b: Set<T>) => new Set([...a].filter((x) => b.has(x)))
);
export function union<T>(...sets: Set<T>[]): Set<T> | undefined {
  if (sets.length === 0) return undefined;
  const elements = sets.flatMap((x) => [...x]);
  return new Set(elements);
}
