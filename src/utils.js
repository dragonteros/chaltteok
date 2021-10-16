export function fromAbbr(chunk) {
  if (",.".includes(chunk))
    return { type: "symbol", symbol: chunk, abbr: chunk };
  const posMark = {
    n: "명사",
    v: "동사",
    a: "형용사",
    d: "관형사",
    p: "조사",
    e: "어미",
    s: "접미사",
  };
  const pos = posMark[chunk[chunk.length - 1]];
  if (!pos) return { type: "word", lemma: chunk, pos: "부사", abbr: chunk };
  const lemma = chunk.slice(0, -1);
  if (isNaN(+lemma)) return { type: "word", lemma, pos, abbr: chunk };
  return { type: "number", lemma, pos, number: +lemma, abbr: chunk };
}

export function toAbbr(tag) {
  if (tag.type === "symbol") return tag.symbol;
  const posMark = {
    명사: "n",
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
