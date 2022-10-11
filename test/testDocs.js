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

describe("문서", function () {
  it("README", function () {
    const defs = `
    짝수 [명사]
    어느 정수가 짝수이다: 해당 정수가 2로 나누어떨어진다.

    홀수 [명사]
    어느 정수가 홀수이다: 해당 정수가 짝수이지 않다.

    소수 [명사]
    어느 정수가 소수이다:
      해당 정수가 2거나
      ,해당 정수가 3 이상이고 해당 정수가 홀수이고,
        해당 정수가 3 이상 해당 정수의 0.5제곱 이하의 홀수로 나누어떨어지지 않는다.

    어느 정수가 3 이상 얼마 이하의 홀수로 나누어떨어지다:
      뒤의 수의 정수부를 '상한'이라고 하자.
      '상한'이 짝수면 '상한'에서 1을 빼고 아니면 그대로 두자.
      '상한'이 3 이상이고,
        앞의 수가 '상한'으로 나누어떨어지거나
        앞의 수가 3 이상 '상한'과 2의 차 이하의 홀수로 나누어떨어지다.

    `;
    assertInterpret(defs + "2가 짝수이다.", "참");
    assertInterpret(defs + "3이 짝수이다.", "거짓");
    assertInterpret(defs + "4가 짝수이다.", "참");

    assertInterpret(defs + "2가 홀수이다.", "거짓");
    assertInterpret(defs + "3이 홀수이다.", "참");
    assertInterpret(defs + "4가 홀수이다.", "거짓");

    assertInterpret(defs + "0이 소수이다.", "거짓");
    assertInterpret(defs + "1이 소수이다.", "거짓");
    assertInterpret(defs + "2가 소수이다.", "참");
    assertInterpret(defs + "3이 소수이다.", "참");
    assertInterpret(defs + "4가 소수이다.", "거짓");
    assertInterpret(defs + "5가 소수이다.", "참");
    assertInterpret(defs + "6이 소수이다.", "거짓");
    assertInterpret(defs + "7이 소수이다.", "참");
    assertInterpret(defs + "15가 소수이다.", "거짓");
    assertInterpret(defs + "99가 소수이다.", "거짓");
    assertInterpret(defs + "101이 소수이다.", "참");
  });
  it("examples", function () {
    assertInterpret("1과 2의 합.", "3");
    assertInterpret("3.25와 5.5의 차.", "2.25");
    assertInterpret("1과 2과 3을 모두 더한 값.", "6");
    assertInterpret("영점오와 마이너스 사를 곱한 값.", "-2");
    assertInterpret("7을 2로 나눈 값.", "3.5");
    assertInterpret("7을 2로 나눈 몫.", "3");
    assertInterpret("7을 2로 나눈 나머지.", "1");
    assertInterpret("1과 2를 더해 3과 곱한 값.", "9");
    assertInterpret(
      `일을 '초깃값'으로 삼자.
      마이너스 이를 '차분'으로 두자.

      '초깃값'과 '차분'의 합.`,
      "-1"
    );
    assertInterpret(
      `1을 '변수'라고 하자.
      '변수'가 5보다 작으면 10 아니면 0을
        -5와 더한 값.`,
      "5"
    );
    assertInterpret(
      `0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 0과 같을 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더하자.

      '결과'.`,
      "2"
    );
    assertInterpret(
      `0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 2와 같을 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더하자.

      '결과'.`,
      "16"
    );
    assertInterpret(
      `역수 [명사]
      얼마의 역수: 1을 해당 수로 나눈 값.

      4의 역수.`,
      "0.25"
    );
    assertInterpret(
      `짝수 [명사]
      어느 정수가 짝수이다:
        해당 정수가 2로 나누어떨어지다.

      홀수 [명사]
      어느 정수가 홀수이다:
        해당 정수가 짝수이지 않다.

      3이 홀수이고 8이 짝수이다.`,
      "참"
    );
    assertInterpret(
      `논리합 [명사]
      어느 참거짓과 어느 참거짓의 논리합:
        앞의 것이 참이거나 뒤의 것이 참이면 참 아니면 거짓.

      참과 거짓의 논리합.`,
      "참"
    );
    assertInterpret(
      `제곱근 [명사] -> 0.5제곱

      16의 제곱근.`,
      "4"
    );
  });
});
