export type POS =
  | "명사"
  | "대명사"
  | "동사"
  | "형용사"
  | "관형사"
  | "부사"
  | "조사"
  | "어미"
  | "접미사";

export type IDToken = { type: "id"; lemma: string; pos: "명사" };
export type WordToken = { type: "word"; lemma: string; pos: POS };
export type SymbolToken = { type: "symbol"; symbol: string };
export type ArityToken = {
  type: "arity";
  lemma: string;
  number: number;
  pos: "명사";
};
export type NumberToken = {
  type: "number";
  lemma: string;
  number: number;
  pos: "명사";
};

export type Token =
  | IDToken
  | WordToken
  | SymbolToken
  | ArityToken
  | NumberToken;
