import { Yongeon, Eomi } from "eomi-js";

import { Analyzer, ParseError, makeJosa, POS, Token } from "./analyzer";
import {
  IndexedPatterns,
  Pattern,
  indexPatterns,
  parsePattern,
} from "./pattern";
import { BUILTIN_PATTERNS } from "./builtin";
import { tokenize } from "./tokenizer";
import { Term } from "./ast";

type VocabEntry = { lemma: string; pos: POS; extra: string };
type Definition = { patterns: string[]; body: string[] };
type _Program = {
  vocab: VocabEntry[];
  definitions: Definition[];
  main: string[];
};

const POS_MARK_PATTERN =
  /\[(명사|대명사|관형사|동사|형용사|부사|조사|어미|접미사)\]/;

function splitBlocks(x: string): [string, string][] {
  x = x.replace(/:\s*\{/g, ":{"); // Convert to K&R style

  const START = '"({';
  const END = '")}';
  let results: [string, string][] = [];
  let lastIdx = 0;
  let start = "";
  let end = "";
  let lastMode = "";
  let depth = 0;
  for (let i = 0; i < x.length; i++) {
    let isDelimiter = false;

    if (depth === 0) {
      let mode = START.indexOf(x[i]);
      if (mode !== -1) {
        isDelimiter = true;
        depth = 1;
        start = START[mode];
        end = END[mode];
      }
    } else {
      if (x[i] === end) {
        depth -= 1;
        if (depth === 0) {
          isDelimiter = true;
          start = end = "";
        }
      } else if (x[i] === start) depth += 1;
    }

    if (isDelimiter) {
      results.push([lastMode, x.slice(lastIdx, i)]);
      lastIdx = i + 1;
      lastMode = start + end;
    }
  }
  if (lastIdx < x.length) results.push([lastMode, x.slice(lastIdx, x.length)]);

  return results;
}

function splitProgram(program: string): string[] {
  let blocks = splitBlocks(program).filter(([mode, _]) => mode !== "()");
  let channel: string[] = [];
  function push(...args: string[]) {
    for (const arg of args) {
      if (!arg || !arg.trim()) continue;
      if (arg === "{END}")
        if (!channel.length || channel[channel.length - 1] === "{END}")
          continue;
      channel.push(arg);
    }
  }
  for (const [mode, block] of blocks) {
    if (mode === '""') {
      push('"', block, '"');
      continue;
    } else if (mode === "{}") {
      push("{JS}", block, "{END}");
      continue;
    }

    const lines = block.split("\n");
    for (let line of lines) {
      if (line.trim() === "") {
        push("{END}");
        continue;
      }

      const colonIdx = line.indexOf(":");
      const def = colonIdx !== -1 ? line.slice(0, colonIdx) : line;
      if (def.trim() === "")
        throw new ParseError("구문 정의 형식이 올바르지 않습니다: " + line);
      const vocabMatch = def.split(POS_MARK_PATTERN, 3);

      if (colonIdx === -1 && vocabMatch.length <= 1) {
        push(...line.split(/(\.)/));
        continue;
      }

      if (vocabMatch.length <= 1) push("{PATTERN}", def, "{END}");
      else {
        const [lemma, pos, extra] = vocabMatch;
        if (lemma.trim() === "")
          throw new ParseError("단어 정의 형식이 올바르지 않습니다: " + line);
        push("{WORD}", lemma, pos, extra, "{END}");
      }

      if (colonIdx !== -1)
        push("{BODY}", ...line.slice(colonIdx + 1).split(/(\.)/));
    }
  }
  push("{END}");
  return channel;
}

function _parseProgram(program: string): _Program {
  let vocab: VocabEntry[] = [];
  let definitions: Definition[] = [];
  let main: string[] = [];

  let patterns: string[] = [];
  const packets = splitProgram(program);
  let state: string = "END";
  for (let i = 0; i < packets.length; i++) {
    const packet = packets[i];
    if (!packet) continue;
    const cmd = "{.".includes(packet[0]) ? packet : "*";
    switch (state + "-" + cmd + "->") {
      case "END-*->":
        main.push(packet);
        state = "MAIN";
        break;
      case "END-{WORD}->":
        patterns = [];
        state = "WORD";
        break;
      case "END-{PATTERN}->":
        patterns = [];
        state = "PATTERN";
        break;

      case "MAIN-*->":
        main[main.length - 1] += packet;
        state = "MAIN";
        break;
      case "MAIN-.->":
        state = ".";
        break;

      case ".-*->":
        main.push(packet);
        state = "MAIN";
        break;
      case ".-{WORD}->":
        patterns = [];
        state = "WORD";
        break;
      case ".-{PATTERN}->":
        patterns = [];
        state = "PATTERN";
        break;
      case ".-{END}->":
        state = "END";
        break;

      case "WORD-*->": {
        const lemma = packets[i++].trim();
        const pos: POS = packets[i++].trim() as POS;
        const extra = packets[i] === "{END}" ? "" : packets[i++].trim();
        const word: VocabEntry = { lemma, pos, extra };
        vocab.push(word);
        patterns.push(lemma);
        state = "END DEF";
        break;
      }
      case "PATTERN-*->":
        patterns.push(packets[i++]);
        state = "END DEF";
        break;

      case "END DEF-*->":
        patterns = [];
        main.push(packet);
        state = "MAIN";
        break;
      case "END DEF-{WORD}->":
        patterns = [];
        state = "WORD";
        break;
      case "END DEF-{PATTERN}->":
        patterns = [];
        state = "PATTERN";
        break;
      case "END DEF-{BODY}->":
        state = "BODY";
        break;

      case "BODY-{WORD}->":
        state = "WORD";
        break;
      case "BODY-{PATTERN}->":
        state = "PATTERN";
        break;
      case "BODY-*->": {
        definitions.push({ patterns, body: [packet] });
        state = "BODY GO";
        break;
      }
      case "BODY-{JS}->": {
        let body = [];
        body.push(packets[i++]);
        body.push(packets[i++]);
        const def: Definition = { patterns, body };
        definitions.push(def);
        state = "END";
        break;
      }

      case "BODY GO-*->": {
        let body = definitions[definitions.length - 1].body;
        body[body.length - 1] += packet;
        state = "BODY GO";
        break;
      }
      case "BODY GO-.->":
        state = "BODY STOP";
        break;
      case "BODY STOP-*->":
        definitions[definitions.length - 1].body.push("");
        state = "BODY GO";
        break;
      case "BODY STOP-{WORD}->":
        state = "WORD";
        break;
      case "BODY STOP-{PATTERN}->":
        state = "PATTERN";
        break;
      case "BODY STOP-{END}->":
        state = "END";
        break;

      default:
        throw new ParseError(
          "Internal Error parseProgram::ILLEGAL_STATE_PACKET: " +
            state +
            ", " +
            packet
        );
    }
  }
  return { vocab, definitions, main };
}

function addVocab(analyzer: Analyzer, vocab: VocabEntry): string | null {
  let lemma = vocab.lemma.trim();
  if (lemma.slice(0, 1) === "-") lemma = lemma.slice(1);
  const pos = vocab.pos;
  let [extra, synonym] = vocab.extra.split("->", 2);

  if (pos === "형용사" || pos === "동사") {
    let variants = [];
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
    let attachTo = [];
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
    let [a, b] = lemma.split("/", 2);
    const word = makeJosa(a, b);
    analyzer.addJosa(word);
  } else analyzer.add(lemma, pos);

  return synonym ? synonym.trim() : null;
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
      if (src.type === "symbol") continue;
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

function _getPOS(body: string): POS | undefined {
  function dummy() {}
  let pos: POS | undefined = undefined;
  try {
    new Function("needs", "returns", "f", body)(
      dummy,
      function (_: string, _pos?: POS) {
        pos = _pos;
      },
      dummy
    );
  } catch (e) {
    throw e + body;
  }
  return pos;
}

// type Definition = { patterns: string[]; body: string[] };
// type _Program = {
//   definitions: Definition[];
//   main: string[];
// };

export function parseProgram(
  sources: string[]
): [Analyzer, Substituter, IndexedPatterns] {
  const program = _parseProgram(sources.join("\n\n"));

  let analyzer = new Analyzer();
  let _synonyms: [VocabEntry, string][] = [];
  for (const entry of program.vocab) {
    let synonym = addVocab(analyzer, entry);
    if (synonym != null) _synonyms.push([entry, synonym]);
  }

  let substituter: Substituter = new Substituter();
  for (const [entry, synonym] of _synonyms) {
    const src: Token = { type: "word", lemma: entry.lemma, pos: entry.pos };
    const trg = tokenize(synonym, analyzer);
    substituter.add(src, trg);
  }

  let patterns: Pattern[] = BUILTIN_PATTERNS.slice();
  for (const definition of program.definitions) {
    let pos: POS | undefined = undefined;
    if (definition.body[0] === "{JS}") pos = _getPOS(definition.body[1]);

    for (const _pattern of definition.patterns) {
      let tokens = tokenize(_pattern, analyzer);
      tokens = substituter.run(tokens);
      patterns.push(...parsePattern(tokens, pos));
    }
  }

  const indexed = indexPatterns(patterns);
  return [analyzer, substituter, indexed];
}
