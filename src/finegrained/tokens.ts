import { InternalError } from "../base/errors";
import { POS } from "../base/pos";

export type IDToken = { type: "id"; lemma: string; pos: "명사" };
export type WordToken = { type: "word"; lemma: string; pos: POS };
export type SymbolToken = { type: "symbol"; symbol: "," | "." };
export type NumberToken = {
  type: "number";
  native: boolean;
  number: number;
  pos: "명사" | "관형사";
};

export type Token = IDToken | WordToken | SymbolToken | NumberToken;

export function restoreTokenFromKey(key: string): Token {
  if (key === "," || key === ".") return { type: "symbol", symbol: key };
  if (key[0] === "'") {
    return { type: "id", lemma: key.slice(1, -1), pos: "명사" };
  }
  const match = key.match(/^(.+)\[(.+)\]$/);
  if (match == null)
    throw new InternalError("restoreTokenFromKey::WRONG_FORMAT");

  const [, lemma, pos] = match;
  if (pos.endsWith("수사") || pos.endsWith("수관형사")) {
    const number = Number(lemma);
    if (Number.isNaN(number))
      throw new InternalError("restoreTokenFromKey::NOT_NUMBER");
    return {
      type: "number",
      native: pos.startsWith("순우리말"),
      number,
      pos: pos.endsWith("수사") ? "명사" : "관형사",
    };
  }

  return { type: "word", lemma, pos: pos as any };
}

export function getKeyFromToken(token: Token): string {
  if (token.type === "symbol") return token.symbol;
  if (token.type === "id") return `'${token.lemma}'`;
  if (token.type === "word") return `${token.lemma}[${token.pos}]`;
  const origin = token.native ? "순우리말" : "한자어";
  const pos = token.pos === "명사" ? "수사" : "수관형사";
  return `${token.number}[${origin}${pos}]`;
}
