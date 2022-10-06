import assert from "assert";

import { run } from "../src/index";

function assertInterpret(
  original,
  expected
  // , stdin = ""
  // , stdout = ""
) {
  try {
    assert.deepStrictEqual(run(original, "<test>"), expected);
  } catch (err) {
    console.error(`"${original}"을 실행하는 중 다음 오류가 발생했습니다:`);
    throw err;
  }
}

describe("꼴 정의", function () {
  it("무엇", function () {
    assertInterpret(
      `어쩌구[명사]
      무엇의 어쩌구: 앞의 것.

      3의 어쩌구가 3과 같고
      3.5의 어쩌구가 3.5와 같고
      참의 어쩌구가 참과 같다.`,
      "참"
    );
  });
  it("몇", function () {
    assertInterpret(
      `어쩌구[명사]
      몇의 어쩌구: 앞의 것.

      다섯의 어쩌구.`,
      "5"
    );
    assertInterpret(
      `어쩌구[명사]
      몇 어쩌구: 앞의 것.

      다섯 어쩌구와 두 어쩌구의 합.`,
      "7"
    );
  });
  it("어찌하다", function () {
    assertInterpret(
      `-었다[어미]
      어쨌다: 앞의 것.

      5와 3을 곱했다.`,
      "15"
    );
  });
  it("어떠하다", function () {
    assertInterpret(
      `-었다[어미]
      어땠다: 앞의 것.

      2가 3보다 작았다.`,
      "참"
    );
  });
  it("어찌/어떠하다", function () {
    assertInterpret(
      `-었다[어미]
      어찌/어떠하였다: 앞의 것.

      2가 3보다 작았다.`,
      "참"
    );
    assertInterpret(
      `-었다[어미]
      어찌/어떠하였다: 앞의 것.

      6이 3으로 나누어떨어졌다.`,
      "참"
    );
  });
  it("어느 변수", function () {
    assertInterpret(
      `맞바꾸다[동사] 맞바꿔, 맞바꾸니
      어느 변수와 어느 변수를 맞바꾸다: { // TODO
        return function(x, y) {
          const tmp = x.data;
          x.data = y.data;
          y.data = tmp;
          return [];
        }
      }

      2를 '갑'으로 놓고 3을 '을'로 놓자. '갑'과 '을'을 맞바꾸자.
      '갑'의 제곱과 '을'의 곱.`,
      "18"
    );
  });
  it("어느 T 변수", function () {
    assertInterpret(
      `맞바꾸다[동사] 맞바꿔, 맞바꾸니
      어느 정수 변수와 어느 정수 변수를 맞바꾸다: { // TODO
        return function(x, y) {
          const tmp = x.data;
          x.data = y.data;
          y.data = tmp;
          return [];
        }
      }

      2를 '갑'으로 놓고 3을 '을'로 놓자. '갑'과 '을'을 맞바꾸자.
      '갑'의 제곱과 '을'의 곱.`,
      "18"
    );
    assertInterpret(
      `맞바꾸다[동사] 맞바꿔, 맞바꾸니
      어느 수 변수와 어느 수 변수를 맞바꾸다: {
        return function(x, y) {
          const tmp = x.data;
          x.data = y.data;
          y.data = tmp;
          return [];
        }
      }

      0.5를 '갑'으로 놓고 2를 '을'로 놓자. '갑'과 '을'을 맞바꾸자.
      '갑'의 제곱과 '을'의 곱.`,
      "2"
    );
  });
  it("어느 T", function () {
    assertInterpret(
      `어쩌구[명사]
      어느 정수의 어쩌구: 앞의 것.

      2의 어쩌구.`,
      "2"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 수의 어쩌구: 앞의 것.

      3의 어쩌구와, 2.5의 어쩌구의, 합.`,
      "5.5"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 참거짓의 어쩌구: 앞의 것.

      참의 어쩌구.`,
      "참"
    );
  });
  it("여러 T", function () {
    assertInterpret(
      `어쩌구[명사]
      여러 정수의 어쩌구: 앞의 것의 합.

      2와 3과 4의 어쩌구.`,
      "9"
    );
    assertInterpret(
      `어쩌구[명사]
      여러 수의 어쩌구: 앞의 것의 합.

      2.5와 3.25과 -5의 어쩌구.`,
      "0.75"
    );
  });
  it("두 T", function () {
    assertInterpret(
      `어쩌구[명사]
      두 정수의 어쩌구: 두 정수의 합.

      2와 3의 어쩌구.`,
      "5"
    );
    assertInterpret(
      `어쩌구[명사]
      두 수의 어쩌구: 두 수의 합.

      2.5와 3.25의 어쩌구.`,
      "5.75"
    );
  });
  it("의/", function () {
    assertInterpret(
      `어쩌구[명사]
      얼마의/ 어쩌구: 해당 수.
        (TODO: 좀 불편하긴 한데...)
      2 어쩌구와, 3의 어쩌구의, 합.`,
      "5"
    );
  });
});
