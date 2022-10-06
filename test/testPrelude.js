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

describe("산술 내장", function () {
  it("갑절", function () {
    assertInterpret("0의 갑절.", "0");
    assertInterpret("1의 갑절.", "2");
    assertInterpret("-1의 갑절.", "-2");
    assertInterpret("10의 갑절.", "20");
  });
  it("값", function () {
    assertInterpret("1과 2의 합의 값.", "3");
    assertInterpret("1과 -2를 더한 값.", "-1");
    assertInterpret("0.25와 -4의 곱의 값.", "-1");
    assertInterpret("-0.5와 7을 곱한 값.", "-3.5");
    assertInterpret("3을 1.5로 나눈 값.", "2");
  });
  it("것", function () {
    assertInterpret("1에서 -2를 뺀 것.", "3");
    assertInterpret("-0.5를 제곱한 것.", "0.25");
    assertInterpret("3을 1.5로 나눈 것.", "2");
  });
  it("곱", function () {
    assertInterpret("1과 2의 곱.", "2");
    assertInterpret("1과 -2와 3의 곱.", "-6");
    assertInterpret("-3.5와 -2의 곱.", "7");
    assertInterpret("0.125와 2와 -2의 곱.", "-0.5");
  });
  it("곱절", function () {
    assertInterpret("-1의 세 곱절.", "-3");
    assertInterpret("-0.5의 다섯 곱절.", "-2.5");
    assertInterpret("-1의 백 곱절.", "-100");
    assertInterpret("0.5의 백 곱절.", "50");
  });
  it("곱하다", function () {
    assertInterpret("0.5에 3.5를 곱하다.", "1.75");
    assertInterpret("-1.5와 2를 곱하다.", "-3");
    assertInterpret("10에 5를 곱하다.", "50");
    assertInterpret("-123에 -1을 곱하다.", "123");
    assertInterpret("0.5와 0.25과 -1을 모두 곱하다.", "-0.125");
    assertInterpret("2와 3과 4를 모두 곱하다.", "24");
  });
  it("곱하다 (변수)", function () {
    assertInterpret(
      "0.5를 '변수'라고 하고 '변수'에 0.5를 곱하자. '변수'.",
      "0.25"
    );
    assertInterpret("5를 '변수'라고 하고 '변수'에 5를 곱하자. '변수'.", "25");
  });
  it("나눔", function () {
    // assertInterpret("3을 2로 나누어 그 값.", "1.5");
    assertInterpret("3을 2로 나눈 값.", "1.5");
    assertInterpret("3을 2로 나눈 것.", "1.5");
    assertInterpret("3을 2로 나눈 몫.", "1");
    assertInterpret("3을 2로 나눈 나머지.", "1");
  });
  it("나누다", function () {
    assertInterpret("1.5를 0.25로 나누다.", "6");
    assertInterpret("15를 2로 나누다.", "7.5");
  });
  it("나누다 (변수)", function () {
    assertInterpret(
      "0.5를 '변수'라고 하고 '변수'를 0.25로 나누자. '변수'.",
      "2"
    );
  });
  it("나누어떨어지다", function () {
    assertInterpret("13이 5로 나누어떨어진다.", "거짓");
    assertInterpret("5로 -15가 나누어떨어진다.", "참");
  });
  it("더하다", function () {
    assertInterpret("0.5에 3.25를 더하다.", "3.75");
    assertInterpret("0.5를 3.25에 더하다.", "3.75");
    assertInterpret("-1.5와 2를 더하다.", "0.5");
    assertInterpret("10에 5를 더하다.", "15");
    assertInterpret("-123을 -1과 더하다.", "-124");
    assertInterpret("0.5와 0.25과 -1을 모두 더하다.", "-0.25");
    assertInterpret("2와 3과 4를 모두 더하다.", "9");
  });
  it("더하다 (변수)", function () {
    assertInterpret(
      "0.5를 '변수'라고 하고 '변수'에 0.25를 더하자. '변수'.",
      "0.75"
    );
    assertInterpret("5를 '변수'라고 하고 '변수'에 5를 더하자. '변수'.", "10");
  });
  it("반올림", function () {
    assertInterpret("0.5의 반올림.", "1");
    assertInterpret("-1.5의 반올림.", "-1");
    assertInterpret("10의 반올림.", "10");
    assertInterpret("-10의 반올림.", "-10");
    assertInterpret("0.25의 반올림.", "0");
    assertInterpret("-0.75의 반올림.", "-1");
  });
  it("배", function () {
    assertInterpret("0.5의 두 배.", "1");
    assertInterpret("-1.5의 세 배.", "-4.5");
    assertInterpret("-0.125의 백 배.", "-12.5");
    assertInterpret("-1.5의 0.5배.", "-0.75");
    assertInterpret("10의 2배.", "20");
  });
  it("버림", function () {
    assertInterpret("0.5의 버림.", "0");
    assertInterpret("-1.5의 버림.", "-2");
    assertInterpret("10의 버림.", "10");
    assertInterpret("-10의 버림.", "-10");
    assertInterpret("0.25의 버림.", "0");
    assertInterpret("-0.75의 버림.", "-1");
  });
  it("분", function () {
    assertInterpret("2분의 1.", "0.5");
    assertInterpret("이분의 1.", "0.5");
    assertInterpret("2분의 일.", "0.5");
    assertInterpret("이분의 일.", "0.5");
    assertInterpret("8분의 3.", "0.375");
    assertInterpret("-4분의 -3.", "0.75");
    assertInterpret("마이너스 사분의 삼.", "-0.75");
  });
  it("빼다", function () {
    assertInterpret("0.5에서 3.25를 빼다.", "-2.75");
    assertInterpret("-1.5를 2에서 빼다.", "3.5");
    assertInterpret("10에서 5를 빼다.", "5");
    assertInterpret("-123을 -1에서 빼다.", "122");
  });
  it("빼다 (변수)", function () {
    assertInterpret(
      "0.5를 '변수'라고 하고 '변수'에서 0.25를 빼자. '변수'.",
      "0.25"
    );
    assertInterpret(
      "0.25를 '변수'라고 하고 '변수'에서 0.5를 빼자. '변수'.",
      "-0.25"
    );
    assertInterpret("5를 '변수'라고 하고 '변수'에서 5를 빼자. '변수'.", "0");
  });
  it("소수부", function () {
    assertInterpret("0.5의 소수부.", "0.5");
    assertInterpret("-1.5의 소수부.", "-0.5");
    assertInterpret("10의 소수부.", "0");
    assertInterpret("-10의 소수부.", "0");
    assertInterpret("4.25의 소수부.", "0.25");
    assertInterpret("-0.75의 소수부.", "-0.75");
  });
  it("올림", function () {
    assertInterpret("0.5의 올림.", "1");
    assertInterpret("-1.5의 올림.", "-1");
    assertInterpret("10의 올림.", "10");
    assertInterpret("-10의 올림.", "-10");
    assertInterpret("4.25의 올림.", "5");
    assertInterpret("-0.75의 올림.", "0");
  });
  it("절댓값", function () {
    assertInterpret("0.5의 절댓값.", "0.5");
    assertInterpret("-1.5의 절댓값.", "1.5");
    assertInterpret("10의 절댓값.", "10");
    assertInterpret("-10의 절댓값.", "10");
    assertInterpret("4.25의 절댓값.", "4.25");
    assertInterpret("-0.75의 절댓값.", "0.75");
  });
  it("정수부", function () {
    assertInterpret("0.5의 정수부.", "0");
    assertInterpret("-1.5의 정수부.", "-1");
    assertInterpret("10의 정수부.", "10");
    assertInterpret("-10의 정수부.", "-10");
    assertInterpret("4.25의 정수부.", "4");
    assertInterpret("-0.75의 정수부.", "0");
  });
  it("제곱", function () {
    assertInterpret("2의 여섯제곱.", "64");
    assertInterpret("3의 0제곱.", "1");
    assertInterpret("4의 -1제곱.", "0.25");
    assert.throws(
      () => assertInterpret("0의 -1제곱.", ""),
      /0의 음수 거듭제곱을 시도했습니다/
    );
    assertInterpret("0.5의 2제곱.", "0.25");
    assertInterpret("4의 0.5제곱.", "2");
    assertInterpret("0.25의 -1제곱.", "4");
    assert.throws(
      () => assertInterpret("0의 -1.5제곱.", ""),
      /0의 음수 거듭제곱을 시도했습니다/
    );

    assertInterpret("2의 제곱.", "4");
    assertInterpret("2.5의 제곱.", "6.25");
    assertInterpret("2의 다섯제곱.", "32");
    assertInterpret("0의 백제곱.", "0");

    assertInterpret("2를 제곱하다.", "4");
    assertInterpret("-2를 다섯 제곱하다.", "-32");
    assertInterpret("1을 백 제곱하다.", "1");

    assertInterpret("-1의 두제곱.", "1");
    assertInterpret("3의 세제곱.", "27");
    assertInterpret("-2의 네제곱.", "16");
    assertInterpret("0의 스무제곱.", "0");
    assertInterpret("1.5를 두제곱하다.", "2.25");
    assertInterpret("0.5를 세제곱하다.", "0.125");
    assertInterpret("3을 네제곱하다.", "81");
  });
  it("차", function () {
    assertInterpret("0.5와 3.5의 차.", "3");
    assertInterpret("-1.5와 2의 차.", "3.5");
    assertInterpret("10과 5의 차.", "5");
    assertInterpret("-123와 -1의 차.", "122");
  });
  it("합", function () {
    assertInterpret("0.5와 0.25과 -1의 합.", "-0.25");
    assertInterpret("2와 3과 4의 합.", "9");
  });
});

describe("논리 내장", function () {
  it("참거짓", function () {
    assertInterpret("참.", "참");
    assertInterpret("거짓.", "거짓");
  });
  it("-지 아니하다", function () {
    assertInterpret("10이 5로 나누어떨어지지 않는다.", "거짓");
    assertInterpret("3이 2.5보다 작지 아니하다.", "참");
  });
  it("-거나", function () {
    assertInterpret("4가 2보다 크거나 4가 5보다 작다.", "참");
    assertInterpret("4가 2보다 크거나 4가 4보다 작다.", "참");
    assertInterpret("4가 4보다 크거나 4가 5보다 작다.", "참");
    assertInterpret("4가 4보다 크거나 4가 4보다 작다.", "거짓");
    assertInterpret("6이 2로 나누어떨어지거나 6이 3으로 나누어떨어진다.", "참");
    assertInterpret("6이 2로 나누어떨어지거나 6이 4로 나누어떨어진다.", "참");
    assertInterpret("6이 4로 나누어떨어지거나 6이 2로 나누어떨어진다.", "참");
    assertInterpret("6이 4로 나누어떨어지거나 6이 5로 나누어떨어진다.", "거짓");
  });
  it("-고", function () {
    assertInterpret("4가 2보다 크고 4가 5보다 작다.", "참");
    assertInterpret("4가 2보다 크고 4가 4보다 작다.", "거짓");
    assertInterpret("4가 4보다 크고 4가 5보다 작다.", "거짓");
    assertInterpret("4가 4보다 크고 4가 4보다 작다.", "거짓");
    assertInterpret("6이 2로 나누어떨어지고 6이 3으로 나누어떨어진다.", "참");
    assertInterpret("6이 2로 나누어떨어지고 6이 4로 나누어떨어진다.", "거짓");
    assertInterpret("6이 4로 나누어떨어지고 6이 2로 나누어떨어진다.", "거짓");
    assertInterpret("6이 4로 나누어떨어지고 6이 5로 나누어떨어진다.", "거짓");
  });
  it("같다", function () {
    assertInterpret("4를 2로 나눈 것이 2와 같다.", "참");
    assertInterpret("-1을 2로 나눈 것이 -0.5와 같다.", "참");
    assertInterpret("1과 -1의 곱이 -1과 다르다.", "거짓");
    assertInterpret("0.5와 2의 곱이 1과 같다.", "참");

    assertInterpret("참이 참과 같다.", "참");
    assertInterpret("거짓이 참과 다르다.", "참");
  });
  it("아니다", function () {
    assertInterpret("4를 2로 나눈 것이 2가 아니다.", "거짓");
    assertInterpret("-1을 2로 나눈 것이 -0.5가 아니다.", "거짓");
    assertInterpret("1과 -1의 곱이 1이 아니다.", "참");
  });
  it("작다", function () {
    assertInterpret("4가 5보다 작다.", "참");
    assertInterpret("4보다 4가 작다.", "거짓");
    assertInterpret("3보다 4가 작다.", "거짓");
    assertInterpret("0.5가 0.7보다 작거나 같다.", "참");
    assertInterpret("0.5보다 0.5가 작거나 같다.", "참");
    assertInterpret("0.5가 0.3보다 작거나 같다.", "거짓");
  });
  it("크다", function () {
    assertInterpret("4가 5보다 크다.", "거짓");
    assertInterpret("4보다 4가 크다.", "거짓");
    assertInterpret("3보다 4가 크다.", "참");
    assertInterpret("0.5가 0.7보다 크거나 같다.", "거짓");
    assertInterpret("0.5보다 0.5가 크거나 같다.", "참");
    assertInterpret("0.5가 0.3보다 크거나 같다.", "참");
  });
  it("이상", function () {
    assertInterpret("4가 5의 이상이다.", "거짓");
    assertInterpret("4가 4 이상이다.", "참");
    assertInterpret("4가 3 이상이다.", "참");
    assertInterpret("0.5가 0.7 이상이다.", "거짓");
    assertInterpret("0.5가 0.5의 이상이다.", "참");
    assertInterpret("0.5가 0.3 이상이다.", "참");
  });
  it("이하", function () {
    assertInterpret("4가 5의 이하다.", "참");
    assertInterpret("4가 4 이하이다.", "참");
    assertInterpret("4가 3 이하다.", "거짓");
    assertInterpret("0.5가 0.7 이하다.", "참");
    assertInterpret("0.5가 0.5의 이하이다.", "참");
    assertInterpret("0.5가 0.3 이하이다.", "거짓");
  });
  it("초과", function () {
    assertInterpret("4가 5의 초과다.", "거짓");
    assertInterpret("4가 4 초과이다.", "거짓");
    assertInterpret("4가 3 초과다.", "참");
    assertInterpret("0.5가 0.7 초과다.", "거짓");
    assertInterpret("0.5가 0.5의 초과이다.", "거짓");
    assertInterpret("0.5가 0.3 초과이다.", "참");
    assertInterpret("-2가 -10을 넘는다.", "참");
    assertInterpret("-2가 10을 넘는다.", "거짓");
    assertInterpret("-2가 -2를 넘는다.", "거짓");
    assertInterpret("2가 1을 초과한다.", "참");
    assertInterpret("2가 2를 초과한다.", "거짓");
    assertInterpret("2가 5를 초과한다.", "거짓");
  });
  it("미만", function () {
    assertInterpret("4가 5의 미만이다.", "참");
    assertInterpret("4가 4 미만이다.", "거짓");
    assertInterpret("4가 3 미만이다.", "거짓");
    assertInterpret("0.5가 0.7 미만이다.", "참");
    assertInterpret("0.5가 0.5의 미만이다.", "거짓");
    assertInterpret("0.5가 0.3 미만이다.", "거짓");
  });
  it("이상 미만", function () {
    assertInterpret("2가 3 이상 5 미만이다.", "거짓");
    assertInterpret("3이 3의 이상 5 미만이다.", "참");
    assertInterpret("4가 3 이상 5의 미만이다.", "참");
    assertInterpret("5가 3의 이상 5의 미만이다.", "거짓");
    assertInterpret("6이 3의 이상 5의 미만이다.", "거짓");
    assertInterpret("2.5가 3.5 이상 5.5 미만이다.", "거짓");
    assertInterpret("3.5가 3.5의 이상 5.5 미만이다.", "참");
    assertInterpret("4.5가 3.5 이상 5.5의 미만이다.", "참");
    assertInterpret("5.5가 3.5의 이상 5.5의 미만이다.", "거짓");
    assertInterpret("6.5이 3.5의 이상 5.5의 미만이다.", "거짓");
  });
  it("이상 이하", function () {
    assertInterpret("2가 3 이상 5 이하이다.", "거짓");
    assertInterpret("3이 3의 이상 5 이하이다.", "참");
    assertInterpret("4가 3 이상 5의 이하다.", "참");
    assertInterpret("5가 3의 이상 5의 이하이다.", "참");
    assertInterpret("6이 3의 이상 5의 이하다.", "거짓");
    assertInterpret("2.5가 3.5 이상 5.5 이하다.", "거짓");
    assertInterpret("3.5가 3.5의 이상 5.5 이하이다.", "참");
    assertInterpret("4.5가 3.5 이상 5.5의 이하다.", "참");
    assertInterpret("5.5가 3.5의 이상 5.5의 이하이다.", "참");
    assertInterpret("6.5이 3.5의 이상 5.5의 이하다.", "거짓");
  });
  it("초과 미만", function () {
    assertInterpret("2가 3 초과 5 미만이다.", "거짓");
    assertInterpret("3이 3의 초과 5 미만이다.", "거짓");
    assertInterpret("4가 3 초과 5의 미만이다.", "참");
    assertInterpret("5가 3의 초과 5의 미만이다.", "거짓");
    assertInterpret("6이 3의 초과 5의 미만이다.", "거짓");
    assertInterpret("2.5가 3.5 초과 5.5 미만이다.", "거짓");
    assertInterpret("3.5가 3.5의 초과 5.5 미만이다.", "거짓");
    assertInterpret("4.5가 3.5 초과 5.5의 미만이다.", "참");
    assertInterpret("5.5가 3.5의 초과 5.5의 미만이다.", "거짓");
    assertInterpret("6.5이 3.5의 초과 5.5의 미만이다.", "거짓");
  });
  it("초과 이하", function () {
    assertInterpret("2가 3 초과 5 이하이다.", "거짓");
    assertInterpret("3이 3의 초과 5 이하이다.", "거짓");
    assertInterpret("4가 3 초과 5의 이하다.", "참");
    assertInterpret("5가 3의 초과 5의 이하이다.", "참");
    assertInterpret("6이 3의 초과 5의 이하다.", "거짓");
    assertInterpret("2.5가 3.5 초과 5.5 이하다.", "거짓");
    assertInterpret("3.5가 3.5의 초과 5.5 이하이다.", "거짓");
    assertInterpret("4.5가 3.5 초과 5.5의 이하다.", "참");
    assertInterpret("5.5가 3.5의 초과 5.5의 이하이다.", "참");
    assertInterpret("6.5이 3.5의 초과 5.5의 이하다.", "거짓");
  });
});

describe("제어 내장", function () {
  it("되다", function () {
    assertInterpret("거짓이 참이 된다.", "거짓");
    assertInterpret("1과 1의 합이 2가 된다.", "참");
  });
  it("변수 할당", function () {
    assertInterpret("5를 '변수'로 놓자. '변수'.", "5");
    assertInterpret("참을 '변수'로 두자. '변수'.", "참");
    assertInterpret("2.5를 '변수'로 삼자. '변수'.", "2.5");
    assertInterpret("5를 '변수'로 하자. 6을 '변수'라고 하자. '변수'.", "6");
    assertInterpret("5를 '변수'라고 하자. 6을 '변수'로 하자. '변수'.", "6");
  });
  it("조건", function () {
    assertInterpret("2가 3보다 크면 1 아니면 2.", "2");
    assertInterpret("2가 3보다 크면 2를 제곱하고 아니면 3을 제곱한다.", "9");
  });
  it("반복", function () {
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 5보다 클 때까지 '변수'에 3을 곱하자. '변수'.`,
      "9"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 0보다 클 때까지 '변수'에 3을 곱하자. '변수'.`,
      "1"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 7로 나누어떨어질 때까지 '변수'에 4를 더하자. '변수'.`,
      "21"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 5보다 작을 동안 '변수'에 3을 곱하자. '변수'.`,
      "9"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 7로 나누어떨어지지 않을 동안 '변수'에 4를 더하자. '변수'.`,
      "21"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 0보다 작은 동안 '변수'에 3을 곱하자. '변수'.`,
      "1"
    );
    assertInterpret(
      `1을 '변수'라고 하자. '변수'가 7로 나누어떨어지지 않는 동안 '변수'에 4를 더하자. '변수'.`,
      "21"
    );
  });
});

describe("일반 내장", function () {
  it("-고", function () {
    assertInterpret(
      "1을 '갑'이라고 하고 '갑'의 갑절을 '을'이라고 하자. '을'.",
      "2"
    );
  });
  it("구하다", function () {
    assertInterpret("2의 제곱을 구하여 2를 더하자.", "6");
  });
  it("-게 되다", function () {
    assertInterpret(
      "5를 '변수'라고 하자. '변수'가 1보다 작게 될 때까지 '변수'를 2로 나누자. '변수'.",
      "0.625"
    );
  });
  // it("-ㄴ지/는지", function () {
  //   assertInterpret("1이 2보다 작은지를 '변수'로 놓자. '변수'.", "참");
  // });
});

describe("자료형 내장", function () {
  it("-(으)ㄴ 수", function () {
    assertInterpret("1과 2를 곱한 수.", "2");
    assertInterpret("1.5와 0.5를 곱한 수.", "0.75");
  });
  it("-(으)ㄴ 정수", function () {
    assertInterpret("1과 2를 곱한 정수.", "2");
    assert.throws(
      () => assertInterpret("1.5와 0.5를 곱한 정수.", ""),
      /정수로 변환할 수 없습니다/
    );
  });
});
