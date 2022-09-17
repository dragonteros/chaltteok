import assert from "assert";

import { parseStructure } from "../src/coarse/aggregator";

function assertCoarse(program, expected) {
  const span = { start: 0, end: program.length };
  assert.deepStrictEqual(
    parseStructure({ span, value: program }, { content: program }),
    expected
  );
}

describe("구조 해석", function () {
  describe("어휘 정의", function () {
    it("명사", function () {
      const program = `
명징 [명사]
직조 [명사]`;
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 1, end: 3 },
              value: "명징",
            },
            pos: {
              metadata: { file: "", start: 5, end: 7 },
              value: "명사",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 9, end: 11 },
              value: "직조",
            },
            pos: {
              metadata: { file: "", start: 13, end: 15 },
              value: "명사",
            },
          },
        },
      ]);
    });
    it("용언", function () {
      const program = `
심심하다 [형용사] 심심하여/심심해, 심심하니
사과하다 [동사] 사과하여/사과해, 사과하니`;
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 1, end: 5 },
              value: "심심하다",
            },
            pos: {
              metadata: { file: "", start: 7, end: 10 },
              value: "형용사",
            },
            extra: {
              metadata: { file: "", start: 12, end: 26 },
              value: "심심하여/심심해, 심심하니",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 27, end: 31 },
              value: "사과하다",
            },
            pos: {
              metadata: { file: "", start: 33, end: 35 },
              value: "동사",
            },
            extra: {
              metadata: { file: "", start: 37, end: 51 },
              value: "사과하여/사과해, 사과하니",
            },
          },
        },
      ]);
    });
    it("조사", function () {
      const program = `
은/는 [조사]
이/가 [조사]`;
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 1, end: 4 },
              value: "은/는",
            },
            pos: {
              metadata: { file: "", start: 6, end: 8 },
              value: "조사",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 10, end: 13 },
              value: "이/가",
            },
            pos: {
              metadata: { file: "", start: 15, end: 17 },
              value: "조사",
            },
          },
        },
      ]);
    });
    it("어미", function () {
      const program = `
-는가 [어미] 있다, 없다, 동사 뒤에
-ㄴ들 [어미]`;
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 1, end: 4 },
              value: "-는가",
            },
            pos: {
              metadata: { file: "", start: 6, end: 8 },
              value: "어미",
            },
            extra: {
              metadata: { file: "", start: 10, end: 23 },
              value: "있다, 없다, 동사 뒤에",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 24, end: 27 },
              value: "-ㄴ들",
            },
            pos: {
              metadata: { file: "", start: 29, end: 31 },
              value: "어미",
            },
          },
        },
      ]);
    });
    it("수식언", function () {
      const program = `

새 [관형사]
새로 [부사]
-새 [접미사]

`;
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 2, end: 3 },
              value: "새",
            },
            pos: {
              metadata: { file: "", start: 5, end: 8 },
              value: "관형사",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 10, end: 12 },
              value: "새로",
            },
            pos: {
              metadata: { file: "", start: 14, end: 16 },
              value: "부사",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 18, end: 20 },
              value: "-새",
            },
            pos: {
              metadata: { file: "", start: 22, end: 25 },
              value: "접미사",
            },
          },
        },
      ]);
    });
  });
  describe("동의어 정의", function () {
    it("기본", function () {
      const program = `
그 [관형사] ->그것의

얼마  [명사]->   어느 수 `;
      assertCoarse(program, [
        {
          type: "SynonymDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 1, end: 2 },
              value: "그",
            },
            pos: {
              metadata: { file: "", start: 4, end: 7 },
              value: "관형사",
            },
          },
          synomym: {
            metadata: { file: "", start: 11, end: 14 },
            value: "그것의",
          },
        },
        {
          type: "SynonymDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 16, end: 18 },
              value: "얼마",
            },
            pos: {
              metadata: { file: "", start: 21, end: 23 },
              value: "명사",
            },
          },
          synomym: {
            metadata: { file: "", start: 29, end: 33 },
            value: "어느 수",
          },
        },
      ]);
    });
  });
  describe("어휘 겸 함수 정의", function () {
    it("명사", function () {
      const program = `고양이[ 명사 ]  :애옹.  애옹 애옹.애옹. `;
      assertCoarse(program, [
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 0, end: 3 },
              value: "고양이",
            },
            pos: {
              metadata: { file: "", start: 5, end: 7 },
              value: "명사",
            },
          },
          body: {
            type: "Expr",
            expr: {
              metadata: { file: "", start: 12, end: 26 },
              value: "애옹.  애옹 애옹.애옹.",
            },
          },
        },
      ]);
    });
    it("동사", function () {
      const program = `
        짖다 [동사 ]: 개, 늑대 따위가
          멍멍 하고
          소리를 내다.
      `;
      assertCoarse(program, [
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file: "", start: 9, end: 11 },
              value: "짖다",
            },
            pos: {
              metadata: { file: "", start: 13, end: 15 },
              value: "동사",
            },
          },
          body: {
            type: "Expr",
            expr: {
              metadata: { file: "", start: 19, end: 62 },
              value: `개, 늑대 따위가
              멍멍 하고
              소리를 내다.`,
            },
          },
        },
      ]);
    });
  });
});
