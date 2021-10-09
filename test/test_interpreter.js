import assert from "assert";
import { run } from "../dist/chaltteok.js";

function assertInterpret(original, expected) {
  assert.deepStrictEqual(run(original), expected);
}

describe("수사 인식", function () {
  it("숫자", function () {
    assertInterpret("0.", 0);
    assertInterpret("1.", 1);
    assertInterpret("-1.", -1);
    assertInterpret("10.", 10);
    assertInterpret("123.", 123);
    assertInterpret("1,234.", 1234);
    assertInterpret("0.123.", 0.123);
    assertInterpret("123.456.", 123.456);
    assertInterpret("-123.456E+7.", -123.456e7);
    assertInterpret("123.456E-7.", 123.456e-7);
  });
  it("한자어", function () {
    assertInterpret("영.", 0);
    assertInterpret("일.", 1);
    assertInterpret("이.", 2);
    assertInterpret("삼.", 3);
    assertInterpret("사.", 4);
    assertInterpret("오.", 5);
    assertInterpret("십.", 10);
    assertInterpret("육십칠.", 67);
    assertInterpret("팔백구.", 809);
    assertInterpret("백이십삼.", 123);
    assertInterpret("일백이십.", 120);
    assertInterpret("만 오천.", 15000);
    assertInterpret("1만5천.", 15000);
    assertInterpret("1만5000.", 15000);
    assertInterpret("만5000.", 15000);
  });
  it("부호", function () {
    assertInterpret("플러스 일.", 1);
    assertInterpret("마이너스 사.", -4);
    assertInterpret("플러스백이십삼.", 123);
    assertInterpret("마이너스일백이십.", -120);
    assertInterpret("마이너스 만 오천.", -15000);
    assertInterpret("+1만5천.", 15000);
    assertInterpret("-1만5000.", -15000);
    assertInterpret("플러스만5000.", 15000);
  });
});

describe("산술", function () {
  it("기본", function () {
    assertInterpret("3의 제곱.", 9);
    assertInterpret("2와 3의 곱.", 6);
    assertInterpret("2와 3의 곱과 4의 차.", 2);
    assertInterpret("0과 1과 2의 곱과, 3과 4와 5의 곱의 합.", 60);
  });
  it("분수", function () {
    assertInterpret("2분의 1.", 0.5);
    assertInterpret("십분의 일.", 0.1); // '-분'은 접미사
    assertInterpret("1만분의 9.", 9 / 10000);
    assertInterpret("이분의 삼분의 일.", 1 / (3 / 2));
    assertInterpret("이분의, 삼분의 일.", 1 / 3 / 2);
  });
  it("거듭제곱", function () {
    assertInterpret("3의 제곱.", 9);
    assertInterpret("-2의 제곱.", 4);
    assertInterpret("0의 제곱.", 0);
    assertInterpret("1의 영제곱.", 1); // '-제곱'은 접미사
    assertInterpret("1의 0제곱.", 1);
    assertInterpret("2의 2제곱.", 4);
    assertInterpret("-2의 세제곱.", -8);
    assertInterpret("-2의 3제곱.", -8);
    assertInterpret("4의 0.5제곱.", 2);
    assertInterpret("9의 0.5제곱의 세제곱.", 27);
    assertInterpret("-2의 9의 0.5제곱제곱.", -8);
  });
  it("덧셈", function () {
    assertInterpret("1과 2의 합.", 3);
    assertInterpret("1과 -2의 합.", -1);
    assertInterpret("1과 0.5의 합.", 1.5);
    assertInterpret("-1.25과 0.5의 합.", -0.75);
    assertInterpret("1과 2와 3의 합.", 6);
    assertInterpret("1과 2와 3과 4의 합.", 10);
    assertInterpret("1과 2를 더한 값.", 3);
    assertInterpret("1과 2과 3을 더한 값.", 6);
    assertInterpret("이십삼과 마이너스삼십을 더한 값.", -7);
    assertInterpret("마이너스 이십만과 십만 오천을 더한 값.", -95000);
    assertInterpret("점오와 삼점이오를 더한 값.", 3.75);
  });
  it("뺄셈", function () {
    assertInterpret("3과 4의 차.", 1);
    assertInterpret("4와 3의 차.", 1);
    assertInterpret("4에서 3을 뺀 값.", 1);
    assertInterpret("3에서 4을 뺀 값.", -1);
    assertInterpret("십에서 마이너스 오를 뺀 값.", 15);
    assertInterpret("1과 2를 더해 10에서 뺀 값.", 7);
    assertInterpret("1과 2를 더해 10을 뺀 값.", -7);
    // assertInterpret("1과 2를 더해 10 뺀 값.", -7);  // TODO: 기본 순서 따르기
  });
  it("곱셈", function () {
    assertInterpret("0과 1의 곱.", 0);
    assertInterpret("10과 11의 곱.", 110);
    assertInterpret("-0.5와 2의 곱.", -1);
    assertInterpret("일과 이와 삼과 사를 곱한 값.", 24);
    assertInterpret("영점오와 마이너스 사를 곱한 값.", -2);
  });
  it("나눗셈", function () {
    assertInterpret("7을 2로 나눈 값.", 3.5);
    assertInterpret("7을 2로 나눈 몫.", 3);
    assertInterpret("7을 2로 나눈 나머지.", 1);
    assertInterpret("-7을 2로 나눈 값.", -3.5);
    assertInterpret("-7을 2로 나눈 몫.", -3);
    assertInterpret("-7을 2로 나눈 나머지.", -1);
    assertInterpret("7을 -2로 나눈 값.", -3.5);
    assertInterpret("7을 -2로 나눈 몫.", -3);
    assertInterpret("7을 -2로 나눈 나머지.", 1);
    assertInterpret("-7을 -2로 나눈 값.", 3.5);
    assertInterpret("-7을 -2로 나눈 몫.", 3);
    assertInterpret("-7을 -2로 나눈 나머지.", -1);
  });
  it("결합", function () {
    assertInterpret("1과 2의 합과 3의 합.", 6);
    assertInterpret("1과 2의 합과, 3과 4의 합의 합.", 10);
    assertInterpret("1과 2를 더해 3과 더한 값.", 6);
    // assertInterpret("1과 2를 더하고 3과 4를 더해 모두 더한 값.", 10);
  });
});

describe("참거짓", function () {
  it("기본", function () {
    assertInterpret("참.", true);
    assertInterpret("거짓.", false);
    assertInterpret("1이 2보다 작다.", true);
    assertInterpret("1이 5 이상 10 미만이다.", false);
    assertInterpret("1이 -5 이상 2 이하이다.", true);
    assertInterpret("3이 3 이상 4 이하이다.", true);
    assertInterpret("3이 3 초과 4 이하이다.", false);
    assertInterpret("3이 3 이상 4 미만이다.", true);
    assertInterpret("3이 3 초과 4 미만이다.", false);
    assertInterpret("3.5가 3 초과 4 미만이다.", true);
    assertInterpret("4가 3 이상 4 이하이다.", true);
    assertInterpret("4가 3 초과 4 이하이다.", true);
    assertInterpret("4가 3 이상 4 미만이다.", false);
    assertInterpret("4가 3 초과 4 미만이다.", false);
    assertInterpret("3이 3 이상 3 이하이다.", true);
    assertInterpret("3이 3 이상 3 미만이다.", false);
    assertInterpret("3이 3 초과 3 미만이다.", false);
  });
  it("분기", function () {
    assertInterpret(
      "1을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한다.",
      5
    );
    assertInterpret(
      "7을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한다.",
      -5
    );
  });
  it("논리 연산", function () {
    assertInterpret(
      "1을 '변수'라고 하고 '변수'가 5보다 크고 '변수'가 10보다 작으면 10 아니면 0을 -5와 더한다.",
      -5
    );
    assertInterpret(
      "1을 '변수'라고 하고 '변수'가 5보다 작거나 '변수'가 10보다 크면 10 아니면 0을 -5와 더한다.",
      5
    );
  });
});

describe("프로그램", function () {
  it("변수 선언", function () {
    let defs = `
      1을 '초깃값'으로 삼는다.
      마이너스 이를 '차분'으로 두자.`;
    assertInterpret(defs + "'초깃값'과 '차분'의 합.", -1);
    defs += `
    '초깃값'과 '차분'의 합이 '현재값'이 된다.
    '현재값'과 '차분'의 합이 '현재값'으로 된다.
    `;
    assertInterpret(defs + "'현재값'.", -3);
  });
  it("주석", function () {
    let defs = `
      1(안녕)을 '초깃값'(하세요)으로 삼는다.(반갑
      습니다.) 마이너스(처음)이를 '차분(뵙겠)'으(습니다)로 두자.`;
    assertInterpret(defs + "'초깃값'과 '차분'의 합.", -1);
  });
  it("반복", function () {
    let defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 0과 같을 때까지 '결과'의 제곱을 '결과'로 삼고
      '지표'와 1의 합을 '지표'로 하자.`;
    assertInterpret(defs + "'결과'.", 2);
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 같을 때까지 '결과'의 제곱을 '결과'로 삼고
      '지표'와 1의 합을 '지표'로 하자.`;
    assertInterpret(defs + "'결과'.", Math.pow(2, 32));
  });
  it("반복 변형", function () {
    let defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 같게 될 때까지 '결과'의 제곱을 '결과'로 삼고
      '지표'와 1의 합을 '지표'로 하자.`;
    assertInterpret(defs + "'결과'.", Math.pow(2, 32));
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 다르지 않을 때까지 '결과'의 제곱을 '결과'로 삼고
      '지표'와 1의 합을 '지표'로 하자.`;
    assertInterpret(defs + "'결과'.", Math.pow(2, 32));
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 다르지 않게 될 때까지 '결과'의 제곱을 '결과'로 삼고
      '지표'와 1의 합을 '지표'로 하자.`;
    assertInterpret(defs + "'결과'.", Math.pow(2, 32));
  });
});
