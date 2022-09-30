import { getKeyFromTerm } from "../finegrained/terms";
import { DefaultArray, ListMap } from "../utils/utils.js";
import { Pattern } from "./pattern";

export class PatternArray {
  data: DefaultArray<DefaultArray<ListMap<Pattern>>>;
  constructor(data?: DefaultArray<DefaultArray<ListMap<Pattern>>>) {
    if (data != null) this.data = data;
    else {
      this.data = new DefaultArray<DefaultArray<ListMap<Pattern>>>(
        () => new DefaultArray(() => new ListMap())
      );
    }
  }
  add(i: number, pattern: Pattern) {
    const length = pattern.input.length;
    this.data
      .get(i)
      .get(length - (i + 1))
      .get(pattern.key)
      .push(pattern);
  }
  sliceBefore(start?: number, end?: number): PatternArray {
    return new PatternArray(this.data.slice(start, end));
  }
  sliceAfter(start?: number, end?: number): PatternArray {
    return new PatternArray(this.data.map((x) => x.slice(start, end)));
  }
  clone(): PatternArray {
    const data = this.data.map((row) =>
      row.map((patterns) => patterns.clone())
    );
    return new PatternArray(data);
  }
  concat(other: PatternArray): PatternArray {
    const result = this.clone();

    for (let i = 0; i < other.data.length; i++) {
      if (!other.data.hasValueAt(i)) continue;

      const srcRow = other.data.get(i);
      const trgRow = result.data.get(i);
      for (let j = 0; j < srcRow.length; j++) {
        if (!srcRow.hasValueAt(j)) continue;
        trgRow.get(j).update(srcRow.get(j));
      }
    }
    return result;
  }
  enumerate(): [number, number, Pattern[]][] {
    const list = this.data.enumerate().flatMap(function ([i, row]) {
      return row.enumerate().flatMap(function ([j, _map]) {
        return _map.values().map((x): [number, number, Pattern[]] => [i, j, x]);
      });
    });
    list.reverse();
    return list;
  }
}

export class IndexedPatterns {
  data: Record<string, PatternArray>;
  _first: Pattern | null = null; // used for test
  constructor(data?: Record<string, PatternArray>) {
    this.data = data || {};
  }
  clone(): IndexedPatterns {
    const data: Record<string, PatternArray> = {};
    for (const [key, value] of Object.entries(this.data)) {
      data[key] = value.clone();
    }
    return new IndexedPatterns(data);
  }
  has(key: string): boolean {
    return key in this.data;
  }
  get(key: string): PatternArray | undefined {
    return this.data[key];
  }
  values() {
    return Object.values(this.data);
  }
  push(...patterns: Pattern[]) {
    for (const pattern of patterns) {
      const terms = pattern.input;
      for (let i = 0; i < terms.length; i++) {
        const key = getKeyFromTerm(terms[i]);
        if (this.data[key] == null) this.data[key] = new PatternArray();
        this.data[key].add(i, pattern);
      }
      this._first = this._first || pattern;
    }
  }
}
