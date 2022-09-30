import { WithMetadata } from "./metadata";

export const PARTS_OF_SPEECH = [
  "명사",
  "동사",
  "형용사",
  "관형사",
  "부사",
  "조사",
  "어미",
  "접미사",
] as const;
export const POS_PATTERN = PARTS_OF_SPEECH.join("|");

export type POS = typeof PARTS_OF_SPEECH[number];

export type VocabEntry = {
  lemma: WithMetadata<string>;
  pos: WithMetadata<POS>;
  extra?: WithMetadata<string>;
};
