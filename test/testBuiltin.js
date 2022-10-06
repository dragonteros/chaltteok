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

describe("내장", function () {
  it("무엇이 무엇이다", function () {
    assertInterpret("2가 2다.", "참");
    assertInterpret("1.5가 2이다.", "거짓");
    assertInterpret("3을 2로 나눈 것이 1.5이다.", "참");
    assertInterpret("참이 참이다.", "참");
    assertInterpret("거짓이 참이다.", "거짓");
  });
  it("무엇이 무엇과 같다", function () {
    assertInterpret("2가 2와 같다.", "참");
    assertInterpret("1.5가 2와 같다.", "거짓");
    assertInterpret("3을 2로 나눈 것이 1.5와 같다.", "참");
    assertInterpret("참이 참과 같다.", "참");
    assertInterpret("거짓이 참과 같다.", "거짓");
  });
  it("무엇이 모두 같다", function () {
    assertInterpret("2와 2와 2가 모두 같다.", "참");
    assertInterpret("2와 3과 2가 모두 같다.", "거짓");
    assertInterpret("참과 거짓과 참이 모두 같다.", "거짓");
  });
  it("앞의 것과 뒤의 것", function () {
    assertInterpret(
      `어쩌구[명사]
      얼마의 어쩌구: 앞의 것.

      3의 어쩌구.`,
      "3"
    );
    assertInterpret(
      `어쩌구[명사]
      얼마와 얼마의 어쩌구: 앞의 것.

      3과 4의 어쩌구.`,
      "3"
    );
    assertInterpret(
      `어쩌구[명사]
      얼마와 얼마의 어쩌구: 뒤의 것.

      3과 4의 어쩌구.`,
      "4"
    );
  });
  it("종결어미", function () {
    assertInterpret("2를 3과 더한다.", "5");
    assertInterpret("2를 3과 더하다.", "5");
    assertInterpret("2가 3보다 작다.", "참");
    assertInterpret("2를 3과 더하자.", "5");
    assertInterpret("2를 3과 더해 -1을 곱하다.", "-5");
    assertInterpret("2를 '변수'라고 하여 '변수'와 -1을 곱하다.", "-2");
  });
  it("-(아/어)", function () {
    assertInterpret("2를 3과 더해 -1을 곱하다.", "-5");
    assertInterpret("2를 '변수'라고 하여 '변수'와 -1을 곱하다.", "-2");
  });
  it("해당 T", function () {
    assertInterpret(
      `어쩌구[명사]
      얼마의 어쩌구: 해당 수.

      3.5의 어쩌구.`,
      "3.5"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 정수의 어쩌구: 해당 정수.

      3의 어쩌구.`,
      "3"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 참거짓의 어쩌구: 해당 참거짓.

      참의 어쩌구.`,
      "참"
    );
  });
  it("앞의 T", function () {
    assertInterpret(
      `어쩌구[명사]
      얼마의 어쩌구: 앞의 수.

      3.5의 어쩌구.`,
      "3.5"
    );
    assertInterpret(
      `어쩌구[명사]
      얼마와 얼마의 어쩌구: 앞의 수.

      3.5와 4의 어쩌구.`,
      "3.5"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 정수의 어쩌구: 앞의 정수.

      3의 어쩌구.`,
      "3"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 정수의 몇 어쩌구: 앞의 정수.

      3의 다섯 어쩌구.`,
      "3"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 참거짓의 어쩌구: 앞의 참거짓.

      참의 어쩌구.`,
      "참"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 참거짓의 얼마 어쩌구: 앞의 참거짓.

      참의 5 어쩌구.`,
      "참"
    );
  });
  it("뒤의 T", function () {
    assertInterpret(
      `어쩌구[명사]
      얼마와 얼마의 어쩌구: 뒤의 수.

      3.5와 4의 어쩌구.`,
      "4"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 정수의 몇 어쩌구: 뒤의 정수.

      3의 다섯 어쩌구.`,
      "5"
    );
    assertInterpret(
      `어쩌구[명사]
      어느 참거짓과 어느 참거짓의 어쩌구: 뒤의 참거짓.

      참과 거짓의 어쩌구.`,
      "거짓"
    );
  });
  it("두 T", function () {
    assertInterpret(
      `어쩌구[명사]
      두 수의 어쩌구: 두 수의 합.

      3.5와 4의 어쩌구.`,
      "7.5"
    );
    assertInterpret(
      `어쩌구[명사]
      두 정수의 어쩌구: 두 정수의 합.

      3과 4의 어쩌구.`,
      "7"
    );
  });
});
