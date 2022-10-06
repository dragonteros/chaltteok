import assert from "assert";

import { parseStructure } from "./parser";

function assertCoarse(program, expected) {
  const metadata = {
    spans: [{ start: 0, end: program.length }],
    file: { path: "<test>", content: program },
  };
  assert.deepStrictEqual(
    parseStructure({ metadata, value: program }),
    expected
  );
}

describe("거시 해석", function () {
  describe("어휘 정의", function () {
    it("명사", function () {
      const program = `
명징 [명사]
직조 [명사]`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 3 }] },
              value: "명징",
            },
            pos: {
              metadata: { file, spans: [{ start: 5, end: 7 }] },
              value: "명사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 9, end: 11 }] },
              value: "직조",
            },
            pos: {
              metadata: { file, spans: [{ start: 13, end: 15 }] },
              value: "명사",
            },
            extra: undefined,
          },
        },
      ]);
    });
    it("용언", function () {
      const program = `
심심하다 [형용사] 심심하여/심심해, 심심하니
사과하다 [동사] 사과하여/사과해, 사과하니`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 5 }] },
              value: "심심하다",
            },
            pos: {
              metadata: { file, spans: [{ start: 7, end: 10 }] },
              value: "형용사",
            },
            extra: {
              metadata: { file, spans: [{ start: 12, end: 26 }] },
              value: "심심하여/심심해, 심심하니",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 27, end: 31 }] },
              value: "사과하다",
            },
            pos: {
              metadata: { file, spans: [{ start: 33, end: 35 }] },
              value: "동사",
            },
            extra: {
              metadata: { file, spans: [{ start: 37, end: 51 }] },
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
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 4 }] },
              value: "은/는",
            },
            pos: {
              metadata: { file, spans: [{ start: 6, end: 8 }] },
              value: "조사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 10, end: 13 }] },
              value: "이/가",
            },
            pos: {
              metadata: { file, spans: [{ start: 15, end: 17 }] },
              value: "조사",
            },
            extra: undefined,
          },
        },
      ]);
    });
    it("어미", function () {
      const program = `
-는가 [어미] 있다, 없다, 동사 뒤에
-ㄴ들 [어미]`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 4 }] },
              value: "-는가",
            },
            pos: {
              metadata: { file, spans: [{ start: 6, end: 8 }] },
              value: "어미",
            },
            extra: {
              metadata: { file, spans: [{ start: 10, end: 23 }] },
              value: "있다, 없다, 동사 뒤에",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 24, end: 27 }] },
              value: "-ㄴ들",
            },
            pos: {
              metadata: { file, spans: [{ start: 29, end: 31 }] },
              value: "어미",
            },
            extra: undefined,
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
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 2, end: 3 }] },
              value: "새",
            },
            pos: {
              metadata: { file, spans: [{ start: 5, end: 8 }] },
              value: "관형사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 10, end: 12 }] },
              value: "새로",
            },
            pos: {
              metadata: { file, spans: [{ start: 14, end: 16 }] },
              value: "부사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 18, end: 20 }] },
              value: "-새",
            },
            pos: {
              metadata: { file, spans: [{ start: 22, end: 25 }] },
              value: "접미사",
            },
            extra: undefined,
          },
        },
      ]);
    });
    it("종합", function () {
      const program = `
어떠하다 [형용사]어떠하여(본디말) ()/어떠해(준말),  어떠하니
 어떻다 [형용사 ]   어때, 어떠니/어떻니  

과/와[조사  ]
 (어디)까지 [  조()사  ]

    (애옹(애옹(애옹)))

-ㄴ다/는다 [어미] 있다, 없다, 동사 뒤에
-기 [ (명사형 전성)어미]

`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 5 }] },
              value: "어떠하다",
            },
            pos: {
              metadata: { file, spans: [{ start: 7, end: 10 }] },
              value: "형용사",
            },
            extra: {
              metadata: {
                file,
                spans: [
                  { start: 11, end: 15 },
                  { start: 20, end: 21 },
                  { start: 23, end: 27 },
                  { start: 31, end: 38 },
                ],
              },
              value: "어떠하여 /어떠해,  어떠하니",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 40, end: 43 }] },
              value: "어떻다",
            },
            pos: {
              metadata: { file, spans: [{ start: 45, end: 48 }] },
              value: "형용사",
            },
            extra: {
              metadata: {
                file,
                spans: [{ start: 53, end: 64 }],
              },
              value: "어때, 어떠니/어떻니",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 68, end: 71 }] },
              value: "과/와",
            },
            pos: {
              metadata: { file, spans: [{ start: 72, end: 74 }] },
              value: "조사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 83, end: 85 }] },
              value: "까지",
            },
            pos: {
              metadata: {
                file,
                spans: [
                  { start: 89, end: 90 },
                  { start: 92, end: 93 },
                ],
              },
              value: "조사",
            },
            extra: undefined,
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 116, end: 122 }] },
              value: "-ㄴ다/는다",
            },
            pos: {
              metadata: { file, spans: [{ start: 124, end: 126 }] },
              value: "어미",
            },
            extra: {
              metadata: {
                file,
                spans: [{ start: 128, end: 141 }],
              },
              value: "있다, 없다, 동사 뒤에",
            },
          },
        },
        {
          type: "VocabDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 142, end: 144 }] },
              value: "-기",
            },
            pos: {
              metadata: { file, spans: [{ start: 155, end: 157 }] },
              value: "어미",
            },
            extra: undefined,
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
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "SynonymDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 2 }] },
              value: "그",
            },
            pos: {
              metadata: { file, spans: [{ start: 4, end: 7 }] },
              value: "관형사",
            },
            extra: undefined,
          },
          synonym: {
            metadata: { file, spans: [{ start: 11, end: 14 }] },
            value: "그것의",
          },
        },
        {
          type: "SynonymDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 16, end: 18 }] },
              value: "얼마",
            },
            pos: {
              metadata: { file, spans: [{ start: 21, end: 23 }] },
              value: "명사",
            },
            extra: undefined,
          },
          synonym: {
            metadata: { file, spans: [{ start: 29, end: 33 }] },
            value: "어느 수",
          },
        },
      ]);
    });
  });
  describe("어휘 겸 함수 정의", function () {
    it("명사", function () {
      const program = `고양이[ 명사 ]  :애옹.  애옹 애옹.애옹. `;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 0, end: 3 }] },
              value: "고양이",
            },
            pos: {
              metadata: { file, spans: [{ start: 5, end: 7 }] },
              value: "명사",
            },
            extra: undefined,
          },
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 12, end: 26 }] },
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
          소리를 내다.`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 9, end: 11 }] },
              value: "짖다",
            },
            pos: {
              metadata: { file, spans: [{ start: 13, end: 15 }] },
              value: "동사",
            },
            extra: undefined,
          },
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 19, end: 62 }] },
              value: `개, 늑대 따위가
          멍멍 하고
          소리를 내다.`,
            },
          },
        },
      ]);
    });
    it("JS", function () {
      const program = `
거짓 [명사]: { /* } is it robust? */
  return () => [false];
}
참 [명사] :
  {
  return () => [true];
}`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 1, end: 3 }] },
              value: "거짓",
            },
            pos: {
              metadata: { file, spans: [{ start: 5, end: 7 }] },
              value: "명사",
            },
            extra: undefined,
          },
          body: {
            type: "JSBody",
            block: {
              metadata: { file, spans: [{ start: 10, end: 59 }] },
              value: `{ /* } is it robust? */
  return () => [false];
}`,
            },
          },
        },
        {
          type: "VocabFunDef",
          vocab: {
            lemma: {
              metadata: { file, spans: [{ start: 60, end: 61 }] },
              value: "참",
            },
            pos: {
              metadata: { file, spans: [{ start: 63, end: 65 }] },
              value: "명사",
            },
            extra: undefined,
          },
          body: {
            type: "JSBody",
            block: {
              metadata: { file, spans: [{ start: 71, end: 97 }] },
              value: `{
  return () => [true];
}`,
            },
          },
        },
      ]);
    });
  });
  describe("함수 정의", function () {
    it("인수 없음", function () {
      const program = `
삶과 우주와 모든 것의 해답: 42.`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 1, end: 16 }] },
              value: "삶과 우주와 모든 것의 해답",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 18, end: 21 }] },
              value: "42.",
            },
          },
        },
      ]);
    });
    it("인수 하나", function () {
      const program = `
어느 정수의 영제곱:
어느 수의 영제곱: 일.`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 1, end: 11 }] },
              value: "어느 정수의 영제곱",
            },
            {
              metadata: { file, spans: [{ start: 13, end: 22 }] },
              value: "어느 수의 영제곱",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 24, end: 26 }] },
              value: "일.",
            },
          },
        },
      ]);
    });
    it("JS", function () {
      const program = `
어느 정수의 제곱:
어느 수의 제곱: {
  return ([{type, 값}]) => [{type, 값: 값 * 값}];
}`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 1, end: 10 }] },
              value: "어느 정수의 제곱",
            },
            {
              metadata: { file, spans: [{ start: 12, end: 20 }] },
              value: "어느 수의 제곱",
            },
          ],
          body: {
            type: "JSBody",
            block: {
              metadata: { file, spans: [{ start: 22, end: 71 }] },
              value: `{
  return ([{type, 값}]) => [{type, 값: 값 * 값}];
}`,
            },
          },
        },
      ]);
    });
    it("종합", function () {
      const program = `
여러 수의 곱:
여러 정수의 곱 :
  앞의 것을 모두
  곱한 것.  (TODO:

    해당 수들)

어느 변수에 어느 정수를 곱해 놓다:
어느 변수에 어느 정수를 곱해 두다:
{
  needs("1 정수 변수", "1 정수");
  return function (box, [num]) {
    box.data[0].값 *= num.값;
    return [];
  };
}`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 1, end: 8 }] },
              value: "여러 수의 곱",
            },
            {
              metadata: { file, spans: [{ start: 10, end: 18 }] },
              value: "여러 정수의 곱",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 23, end: 39 }] },
              value: `앞의 것을 모두
  곱한 것.`,
            },
          },
        },
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 61, end: 80 }] },
              value: "어느 변수에 어느 정수를 곱해 놓다",
            },
            {
              metadata: { file, spans: [{ start: 82, end: 101 }] },
              value: "어느 변수에 어느 정수를 곱해 두다",
            },
          ],
          body: {
            type: "JSBody",
            block: {
              metadata: { file, spans: [{ start: 103, end: 215 }] },
              value: `{
  needs("1 정수 변수", "1 정수");
  return function (box, [num]) {
    box.data[0].값 *= num.값;
    return [];
  };
}`,
            },
          },
        },
      ]);
    });
  });
  describe("표현식", function () {
    it("기본", function () {
      const program = `
어흥.
나는 사나운

호랑이다. `;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 1, end: 4 }] },
            value: `어흥.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 5, end: 18 }] },
            value: `나는 사나운

호랑이다.`,
          },
        },
      ]);
    });
    it("문단", function () {
      const program = `
어흥.
  나는 사나운

호랑이다.

멍.
나는 하룻강아지.`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 1, end: 4 }] },
            value: `어흥.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 7, end: 20 }] },
            value: `나는 사나운

호랑이다.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 22, end: 24 }] },
            value: `멍.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 25, end: 34 }] },
            value: `나는 하룻강아지.`,
          },
        },
      ]);
    });
    it("주석", function () {
      const program = `
어흥.
나는 사나운

호랑이(사실 고양이

아니 사실 호양이)다. `;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 1, end: 4 }] },
            value: `어흥.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: {
              file,
              spans: [
                { start: 5, end: 16 },
                { start: 35, end: 37 },
              ],
            },
            value: `나는 사나운

호랑이다.`,
          },
        },
      ]);
    });
  });
  describe("주석", function () {
    it("기본", function () {
      const program = ` (어흥. 나는 사나운

        호랑이다.) `;
      assertCoarse(program, []);
    });
  });

  describe("종합", function () {
    it("표현식 소속 결정", function () {
      const program = `
어느 정수가 어느 정수로 나누어떨어지다:
  앞의 정수를 뒤의 정수로 나눈 것을

  '갑'이라고 하자.
(애 옹)갑의 나머지가 0이 되다.

 얼마의 정수부:


  해당 수에서 해당 수의 

소수부를 뺀
  
    정수.

  5를 2로 나눠 그 정수부.
5가 2로 나누어떨어진다.
`;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 1, end: 22 }] },
              value: "어느 정수가 어느 정수로 나누어떨어지다",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: {
                file,
                spans: [
                  { start: 26, end: 60 },
                  { start: 65, end: 79 },
                ],
              },
              value: `앞의 정수를 뒤의 정수로 나눈 것을

  '갑'이라고 하자.
갑의 나머지가 0이 되다.`,
            },
          },
        },
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 82, end: 89 }] },
              value: "얼마의 정수부",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: { file, spans: [{ start: 95, end: 127 }] },
              value: `해당 수에서 해당 수의 

소수부를 뺀
  
    정수.`,
            },
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 131, end: 146 }] },
            value: `5를 2로 나눠 그 정수부.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 147, end: 161 }] },
            value: `5가 2로 나누어떨어진다.`,
          },
        },
      ]);
    });
    it("처음에 표현식", function () {
      const program = `
        나는 퍼리가 좋아. 퍼리를 사랑해.
        잘생긴 늑대 퍼리 보고 싶다: 눈 마주치면 씨익 웃는 늑대. 최고야.
      `;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 9, end: 19 }] },
            value: `나는 퍼리가 좋아.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 20, end: 28 }] },
            value: `퍼리를 사랑해.`,
          },
        },
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 37, end: 52 }] },
              value: "잘생긴 늑대 퍼리 보고 싶다",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: {
                file,
                spans: [{ start: 54, end: 75 }],
              },
              value: `눈 마주치면 씨익 웃는 늑대. 최고야.`,
            },
          },
        },
      ]);
    });
    it("끝에 표현식", function () {
      const program = `
        잘생긴 늑대 퍼리 보고 싶다: 눈 마주치면 씨익 웃는 늑대. 최고야.

        나는 퍼리가 좋아.

        퍼리를 사랑해.
      `;
      const file = { path: "<test>", content: program };
      assertCoarse(program, [
        {
          type: "FunDef",
          patterns: [
            {
              metadata: { file, spans: [{ start: 9, end: 24 }] },
              value: "잘생긴 늑대 퍼리 보고 싶다",
            },
          ],
          body: {
            type: "Expr",
            expr: {
              metadata: {
                file,
                spans: [{ start: 26, end: 47 }],
              },
              value: `눈 마주치면 씨익 웃는 늑대. 최고야.`,
            },
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 57, end: 67 }] },
            value: `나는 퍼리가 좋아.`,
          },
        },
        {
          type: "Expr",
          expr: {
            metadata: { file, spans: [{ start: 77, end: 85 }] },
            value: `퍼리를 사랑해.`,
          },
        },
      ]);
    });
  });
});
