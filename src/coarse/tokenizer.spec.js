import assert from "assert";

import { CoarseTokenizer } from "./tokenizer";

function assertCoarseTokenizer(program, expected) {
  const tokenizer = new CoarseTokenizer();
  const file = { path: "<test>", content: program };
  tokenizer.file = file;

  tokenizer.reset(program);
  let tokens = [];
  while (true) {
    const token = tokenizer.next();
    if (token == null) break;
    tokens.push([token.type, token.value]);
  }
  assert.deepStrictEqual(tokens, expected);
}

// CoarseTokenizer must preserve original text
describe("거시 분절", function () {
  it("어휘 정의", function () {
    const program = `
  앞 [명사]

어떠하다 [형용사]어떠하여(본디말) ()/어떠해(준말),  어떠하니
 어떻다 [형용사 ]   어때, 어떠니/어떻니  

과/와[조사  ]
 (어디)까지 [  조()사  ]

    (애옹(애옹(애옹)))

-ㄴ다/는다 [어미] 있다, 없다, 동사 뒤에
-기 [ (명사형 전성)어미]

`;
    assertCoarseTokenizer(program, [
      ["NewLine", "\n"],
      ["Whitespace", "  "],
      ["Word", "앞"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "명사"],
      ["Bracket", "]"],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["Word", "어떠하다"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "형용사"],
      ["Bracket", "]"],
      ["Word", "어떠하여"],
      ["Whitespace", " "],
      ["Word", "/어떠해"],
      ["Word", ","],
      ["Whitespace", "  "],
      ["Word", "어떠하니"],
      ["NewLine", "\n"],
      ["Whitespace", " "],
      ["Word", "어떻다"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "형용사"],
      ["Whitespace", " "],
      ["Bracket", "]"],
      ["Whitespace", "   "],
      ["Word", "어때,"],
      ["Whitespace", " "],
      ["Word", "어떠니/어떻니"],
      ["Whitespace", "  "],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["Word", "과/와"],
      ["Bracket", "["],
      ["Word", "조사"],
      ["Whitespace", "  "],
      ["Bracket", "]"],
      ["NewLine", "\n"],
      ["Whitespace", " "],
      ["Word", "까지"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Whitespace", "  "],
      ["Word", "조"],
      ["Word", "사"],
      ["Whitespace", "  "],
      ["Bracket", "]"],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["Whitespace", "    "],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["Word", "-ㄴ다/는다"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "어미"],
      ["Bracket", "]"],
      ["Whitespace", " "],
      ["Word", "있다,"],
      ["Whitespace", " "],
      ["Word", "없다,"],
      ["Whitespace", " "],
      ["Word", "동사"],
      ["Whitespace", " "],
      ["Word", "뒤에"],
      ["NewLine", "\n"],
      ["Word", "-기"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Whitespace", " "],
      ["Word", "어미"],
      ["Bracket", "]"],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["EndOfDocument", ""],
    ]);
  });
  it("동의어 정의", function () {
    const program = `갑절 [명사] -> 두 곱절`;
    assertCoarseTokenizer(program, [
      ["Word", "갑절"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "명사"],
      ["Bracket", "]"],
      ["Whitespace", " "],
      ["SynonymDef", "->"],
      ["Whitespace", " "],
      ["Word", "두"],
      ["Whitespace", " "],
      ["Word", "곱절"],
      ["EndOfDocument", ""],
    ]);
  });
  it("어휘 및 함수 정의", function () {
    const program = `
거짓 [명사]: { /* } is it robust? */
  return () => [false];
}
참 [명사] :
  {
  return () => [true];
}`;
    assertCoarseTokenizer(program, [
      ["NewLine", "\n"],
      ["Word", "거짓"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "명사"],
      ["Bracket", "]"],
      ["FunDef", ":"],
      ["Whitespace", " "],
      [
        "JS",
        `{ /* } is it robust? */
  return () => [false];
}`,
      ],
      ["NewLine", "\n"],
      ["Word", "참"],
      ["Whitespace", " "],
      ["Bracket", "["],
      ["Word", "명사"],
      ["Bracket", "]"],
      ["Whitespace", " "],
      ["FunDef", ":"],
      ["NewLine", "\n"],
      ["Whitespace", "  "],
      [
        "JS",
        `{
  return () => [true];
}`,
      ],
      ["EndOfDocument", ""],
    ]);
  });
  it("함수 정의", function () {
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
    assertCoarseTokenizer(program, [
      ["NewLine", "\n"],
      ["Word", "여러"],
      ["Whitespace", " "],
      ["Word", "수의"],
      ["Whitespace", " "],
      ["Word", "곱"],
      ["FunDef", ":"],
      ["NewLine", "\n"],
      ["Word", "여러"],
      ["Whitespace", " "],
      ["Word", "정수의"],
      ["Whitespace", " "],
      ["Word", "곱"],
      ["Whitespace", " "],
      ["FunDef", ":"],
      ["NewLine", "\n"],
      ["Whitespace", "  "],
      ["Word", "앞의"],
      ["Whitespace", " "],
      ["Word", "것을"],
      ["Whitespace", " "],
      ["Word", "모두"],
      ["NewLine", "\n"],
      ["Whitespace", "  "],
      ["Word", "곱한"],
      ["Whitespace", " "],
      ["Word", "것"],
      ["SentenceFinal", "."],
      ["Whitespace", "  "],
      ["NewLine", "\n"],
      ["NewLine", "\n"],
      ["Word", "어느"],
      ["Whitespace", " "],
      ["Word", "변수에"],
      ["Whitespace", " "],
      ["Word", "어느"],
      ["Whitespace", " "],
      ["Word", "정수를"],
      ["Whitespace", " "],
      ["Word", "곱해"],
      ["Whitespace", " "],
      ["Word", "놓다"],
      ["FunDef", ":"],
      ["NewLine", "\n"],
      ["Word", "어느"],
      ["Whitespace", " "],
      ["Word", "변수에"],
      ["Whitespace", " "],
      ["Word", "어느"],
      ["Whitespace", " "],
      ["Word", "정수를"],
      ["Whitespace", " "],
      ["Word", "곱해"],
      ["Whitespace", " "],
      ["Word", "두다"],
      ["FunDef", ":"],
      ["NewLine", "\n"],
      [
        "JS",
        `{
  needs("1 정수 변수", "1 정수");
  return function (box, [num]) {
    box.data[0].값 *= num.값;
    return [];
  };
}`,
      ],
      ["EndOfDocument", ""],
    ]);
  });
});
