import assert from "assert";
import { fromAbbr, toAbbr } from "../src/utils.js";
import {
  constructForest,
  PRELUDE,
  parseProgram,
} from "../dist/chaltteok.js";

let patterns = null;
let substituter = null;

function _loadPrelude() {
  if (patterns != null) return;
  let _;
  [_, substituter, patterns] = parseProgram([PRELUDE]);
}

function prettyForest(nodes, level = 0) {
  let result = "";
  for (let node of nodes) {
    for (let i = 0; i < level; i++) result += " ";
    if (node.head.type === "generic") result += node.head.name + "\n";
    else result += toAbbr(node.head.token) + "\n";
    result += prettyForest(node.children, level + 2);
  }
  return result;
}

function assertForest(original, expected) {
  _loadPrelude();
  let tokens = original.split(" ").map(fromAbbr);
  tokens = substituter.run(tokens)
  const forest = constructForest(tokens, patterns);
  assert.deepStrictEqual(prettyForest(forest).slice(0, -1), expected.slice(1));
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
{}d {}n 제곱s
  {}n 의p
    3n
  두n`
    );
    assertForest(
      "-2n 의p 제곱n .",
      `
{}d {}n 제곱s
  {}n 의p
    -2n
  두n`
    );
    assertForest(
      "0n 의p 제곱n .",
      `
{}d {}n 제곱s
  {}n 의p
    0n
  두n`
    );
    assertForest(
      "1n 의p 0n 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    1n
  0n`
    );
    assertForest(
      "2n 의p 2n 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    2n
  2n`
    );
    assertForest(
      "-2n 의p 3n 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    -2n
  3n`
    );
    assertForest(
      "4n 의p 0.5n 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    4n
  0.5n`
    );
    assertForest(
      "9n 의p 0.5n 제곱s 의p 3n 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    {}d {}n 제곱s
      {}n 의p
        9n
      0.5n
  3n`
    );
    assertForest(
      "-2n 의p 9n 의p 0.5n 제곱s 제곱s .",
      `
{}d {}n 제곱s
  {}n 의p
    -2n
  {}d {}n 제곱s
    {}n 의p
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
{}d 곱n
  {}n 의p
    {}n 과p {}n
      2n
      3n`
    );
    assertForest(
      "2n 과p 3n 의p 곱n 과p 4n 의p 차n .",
      `
{}d 차n
  {}n 의p
    {}n 과p {}n
      {}d 곱n
        {}n 의p
          {}n 과p {}n
            2n
            3n
      4n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 6n 로p 나누다v -다e .",
      `
{}v -다e
  {}n 를p {}n 로p 나누다v
    {}d 곱n
      {}n 의p
        {}n 과p {}n
          4n
          3n
    6n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 2n 과p 4n 의p 합n 로p 나누다v -다e .",
      `
{}v -다e
  {}n 를p {}n 로p 나누다v
    {}d 곱n
      {}n 의p
        {}n 과p {}n
          4n
          3n
    {}d 합n
      {}n 의p
        {}n 과p {}n
          2n
          4n`
    );
  });

  it("순접", function () {
    assertForest(
      "1n 를p 2n 과p 더하다v -고e 3n 과p 곱하다v -다e .",
      `
{}v -다e
  {} {}v
    {}v -고e
      {}n 를p {}n 과p 더하다v
        1n
        2n
    {}n 과p 곱하다v
      3n`
    );
    assertForest(
      "1n 를p 2n 과p 더하다v -고e 3n 과p 곱하다v -(으)ㄴe 값n .",
      `
{}d 값n
  {}v -(으)ㄴe
    {} {}v
      {}v -고e
        {}n 를p {}n 과p 더하다v
          1n
          2n
      {}n 과p 곱하다v
        3n`
    );
  });

  it("쉼표", function () {
    assertForest(
      "0n 과p 1n 과p 2n 의p 곱n 과p , 3n 과p 4n 과p 5n 의p 곱n 의p 합n .",
      `
{}d 합n
  {}n 의p
    {}n 과p {}n
      {}d 곱n
        {}n 의p
          {}n 과p {}n 과p {}n
            0n
            1n
            2n
      {}d 곱n
        {}n 의p
          {}n 과p {}n 과p {}n
            3n
            4n
            5n`
    );
  });
});
