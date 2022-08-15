import assert from "assert";
import { parse } from "../src/parser/parser";
import { Context, Prelude } from "../src/runner/module";
import { fromAbbr } from "../src/utils/utils";

let ctx: Context | null = null;

function assertForest(original: string, expected: string) {
  if (ctx == null) ctx = (Prelude as any).context;
  let tokens = original.split(" ").map(fromAbbr);
  tokens = (ctx as any).substituter.run(tokens);
  const forest = parse(tokens, (ctx as any).patterns);
  const formatted = forest.map((x) => x.debug()).join("");
  assert.deepStrictEqual(formatted.slice(0, -1), expected.slice(1));
}

describe("구문 분석", function () {
  it("기본", function () {
    assertForest(
      "4n 를p 2n 로p 나누다v -다e .",
      `
{}v -다e
  {}n 를p {}n 로p 나누다v
    4n
    2n`
    );
    assertForest(
      "2n 로p 4n 를p 나누다v -다e .",
      `
{}v -다e
  {}n 로p {}n 를p 나누다v
    2n
    4n`
    );
  });

  it("분수", function () {
    assertForest(
      "2n 분s 의p 1n .",
      `
{}n 분s 의p {}n
  2n
  1n`
    );
    assertForest(
      "2n 분s 의p 3n 분s 의p 1n .",
      `
{}n 분s 의p {}n
  {}n 분s 의p {}n
    2n
    3n
  1n`
    );
    assertForest(
      "2n 분s 의p , 3n 분s 의p 1n .",
      `
{}n 분s 의p {}n
  2n
  {}n 분s 의p {}n
    3n
    1n`
    );
  });
  it("거듭제곱", function () {
    assertForest(
      "3n 의p 제곱n .",
      `
{}n 의p {}n 제곱s
  3n
  두n`
    );
    assertForest(
      "-2n 의p 제곱n .",
      `
{}n 의p {}n 제곱s
  -2n
  두n`
    );
    assertForest(
      "0n 의p 제곱n .",
      `
{}n 의p {}n 제곱s
  0n
  두n`
    );
    assertForest(
      "1n 의p 0n 제곱s .",
      `
{}n 의p {}n 제곱s
  1n
  0n`
    );
    assertForest(
      "2n 의p 2n 제곱s .",
      `
{}n 의p {}n 제곱s
  2n
  2n`
    );
    assertForest(
      "-2n 의p 3n 제곱s .",
      `
{}n 의p {}n 제곱s
  -2n
  3n`
    );
    assertForest(
      "4n 의p 0.5n 제곱s .",
      `
{}n 의p {}n 제곱s
  4n
  0.5n`
    );
    assertForest(
      "9n 의p 0.5n 제곱s 의p 3n 제곱s .",
      `
{}n 의p {}n 제곱s
  {}n 의p {}n 제곱s
    9n
    0.5n
  3n`
    );
    assertForest(
      "-2n 의p 9n 의p 0.5n 제곱s 제곱s .",
      `
{}n 의p {}n 제곱s
  -2n
  {}n 의p {}n 제곱s
    9n
    0.5n`
    );
  });

  it("나열", function () {
    assertForest(
      "2n 과p 3n 를p 곱하다v -다e .",
      `
{}v -다e
  {}n 과p {}n 를p 곱하다v
    2n
    3n`
    );
    assertForest(
      "2n 과p 3n 의p 곱n .",
      `
{}n 의p 곱n
  ~과~
    2n
    3n`
    );
    assertForest(
      "2n 과p 3n 의p 곱n 과p 4n 의p 차n .",
      `
{}n 의p 차n
  ~과~
    {}n 의p 곱n
      ~과~
        2n
        3n
    4n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 6n 로p 나누다v -다e .",
      `
{}v -다e
  {}n 를p {}n 로p 나누다v
    {}n 의p 곱n
      ~과~
        4n
        3n
    6n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 2n 과p 4n 의p 합n 로p 나누다v -다e .",
      `
{}v -다e
  {}n 를p {}n 로p 나누다v
    {}n 의p 곱n
      ~과~
        4n
        3n
    {}n 의p 합n
      ~과~
        2n
        4n`
    );
  });

  it("순접", function () {
    assertForest(
      "1n 를p 2n 과p 더하다v -(아/어)e 3n 과p 곱하다v -다e .",
      `
{}v -다e
  {}v -(아/어)e {}v
    {}n 를p {}n 과p 더하다v
      1n
      2n
    {}n 과p 곱하다v
      3n`
    );
    assertForest(
      "1n 를p 2n 과p 더하다v -(아/어)e 3n 과p 곱하다v -(으)ㄴe 값n .",
      `
{}v -(으)ㄴe 값n
  {}v -(아/어)e {}v
    {}n 를p {}n 과p 더하다v
      1n
      2n
    {}n 과p 곱하다v
      3n`
    );
    assertForest(
      "1n 를p 2n 과p 더하다v -고e 3n 과p 곱하다v -다e .",
      `
{}n 를p {}n 과p 더하다v
  1n
  2n
-고e
3n
과p
곱하다v
-다e`
    );
    assertForest(
      "1n 를p 2n 과p 더하다v -고e 3n 과p 곱하다v -(으)ㄴe 값n .",
      `
{}n 를p {}n 과p 더하다v
  1n
  2n
-고e
3n
과p
곱하다v
-(으)ㄴe
값n`
    );
  });

  it("쉼표", function () {
    // TODO: 마지막 조사와 접사와 어미를 제외하고?
    assertForest(
      "0n 과p 1n 과p 2n 의p 곱n 과p , 3n 과p 4n 과p 5n 의p 곱n 의p , 합n .",
      `
{}n 의p 합n
  ~과~
    {}n 의p 곱n
      ~과~
        0n
        1n
        2n
    {}n 의p 곱n
      ~과~
        3n
        4n
        5n`
    );
  });

  it("생략 인수 중첩 방지", function () {
    assertForest(
      "3n 를p 제곱하다v -(아/어)e 2n 를p 더하다v -(으)ㄴe 것n 를p 곱하다v -다e .",
      `
{}v -(으)ㄴe 것n
  {}v -(아/어)e {}v
    {}n 를p 제곱하다v
      3n
    {}n 를p 더하다v
      2n
를p
곱하다v
-다e`
    );
  });
});
