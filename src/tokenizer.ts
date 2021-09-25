import { NOUNS, DETERMINERS, ADVERBS } from "./keywords";
import { nounAnalyzer } from "./analyzer_noun";
import { adjAnalyzer, verbAnalyzer } from "./analyzer_verb";

type Tag = { lemma: string; pos: string };

function _makeSet(items: Tag[][]) {
  let result = [];
  let keys: string[] = [];
  for (const item of items) {
    let key = JSON.stringify(item);
    if (!keys.includes(key)) {
      result.push(item);
      keys.push(key);
    }
  }
  return result;
}

function tagPOS(chunk: string): Tag[] {
  let results: Tag[][] = [];
  if (chunk === ',') results.push([{ lemma: '', pos: chunk }]);
  if (NOUNS.includes(chunk)) results.push([{ lemma: chunk, pos: "체언" }]);
  if (DETERMINERS.includes(chunk))
    results.push([{ lemma: chunk, pos: "관형사" }]);
  if (ADVERBS.includes(chunk)) results.push([{ lemma: chunk, pos: "부사" }]);

  for (const [stem, eomi] of adjAnalyzer.analyze(chunk)) {
    results.push([
      { lemma: stem.valueOf(), pos: "용언" },
      { lemma: eomi.valueOf(), pos: "어미" },
    ]);
  }

  for (const [stem, eomi] of verbAnalyzer.analyze(chunk)) {
    results.push([
      { lemma: stem.valueOf(), pos: "용언" },
      { lemma: eomi.valueOf(), pos: "어미" },
    ]);
  }

  for (const [noun, josa] of nounAnalyzer.analyze(chunk)) {
    if (josa.slice(0, 2) === "이-") {
      results.push([
        { lemma: noun, pos: "체언" },
        { lemma: "이", pos: "조사" },
        { lemma: josa.slice(2), pos: "어미" },
      ]);
    } else {
      results.push([
        { lemma: noun, pos: "체언" },
        { lemma: josa, pos: "조사" },
      ]);
    }
  }

  results = _makeSet(results);
  if (results.length > 1) throw Error("Ambiguity in parsing token " + chunk);
  if (results.length === 0) return [{ lemma: chunk, pos: "체언" }];
  return results[0];
}

function tokenize(sentence: string): Tag[] {
  const chunks = sentence.replace(',', ' , ').trim().split(/\s+/);
  const tokens = [];
  for (const chunk of chunks) {
    tokens.push(...tagPOS(chunk));
  }
  return tokens;
}

export { tokenize };
