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
});
