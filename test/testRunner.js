import assert from "assert";

import { run } from "../src/index";

function assertInterpret(
  original,
  expected
  // , stdin = ""
  // , stdout = ""
) {
  try {
    assert.deepStrictEqual(run(original), expected);
  } catch (err) {
    console.error(`"${original}"을 실행하는 중 다음 오류가 발생했습니다:`);
    throw err;
  }
}

describe("수사 인식", function () {
  it("숫자", function () {
    assertInterpret("0.", "0");
    assertInterpret("1.", "1");
    assertInterpret("-1.", "-1");
    assertInterpret("10.", "10");
    assertInterpret("123.", "123");
    assertInterpret("1,234.", "1234");
    assertInterpret("0.123.", "0.123");
    assertInterpret("123.456.", "123.456");
    assertInterpret("-123.456E+7.", (-123.456e7).toString());
    assertInterpret("123.456E-7.", (123.456e-7).toString());
  });
  it("한자어", function () {
    assertInterpret("영.", "0");
    assertInterpret("일.", "1");
    assertInterpret("이.", "2");
    assertInterpret("삼.", "3");
    assertInterpret("사.", "4");
    assertInterpret("오.", "5");
    assertInterpret("십.", "10");
    assertInterpret("육십칠.", "67");
    assertInterpret("팔백구.", "809");
    assertInterpret("백이십삼.", "123");
    assertInterpret("일백이십.", "120");
    assertInterpret("만 오천.", "15000");
    assertInterpret("1만5천.", "15000");
    assertInterpret("1만5000.", "15000");
    assertInterpret("만5000.", "15000");
    assertInterpret("사십이점일구오.", "42.195");
    assertInterpret("사십이점 일구오.", "42.195");
    assertInterpret("사십이 점 일구오.", "42.195");
  });
  it("부호", function () {
    assertInterpret("플러스 일.", "1");
    assertInterpret("마이너스 사.", "-4");
    assertInterpret("플러스백이십삼.", "123");
    assertInterpret("마이너스일백이십.", "-120");
    assertInterpret("마이너스 만 오천.", "-15000");
    assertInterpret("+1만5천.", "15000");
    assertInterpret("-1만5000.", "-15000");
    assertInterpret("플러스만5000.", "15000");
  });
});

describe("산술", function () {
  it("기본", function () {
    assertInterpret("2와 3의 곱.", "6");
    assertInterpret("2와 3의 곱과 4의 차.", "2");
  });
  it("분수", function () {
    assertInterpret("2분의 1.", "0.5");
    assertInterpret("십분의 일.", "0.1");
    assertInterpret("1만분의 9.", "0.0009");
    assertInterpret("이분의 오분의 일.", "0.4");
    assertInterpret("이분의, 오분의 일.", "0.1");
  });
  it("거듭제곱", function () {
    assertInterpret("3의 제곱.", "9");
    assertInterpret("-2의 제곱.", "4");
    assertInterpret("0의 제곱.", "0");
    assertInterpret("1의 영제곱.", "1");
    assertInterpret("1의 0제곱.", "1");
    assertInterpret("2의 2제곱.", "4");
    assertInterpret("-2의 세제곱.", "-8");
    assertInterpret("-2의 3제곱.", "-8");
    assertInterpret("4의 0.5제곱.", "2");
    assertInterpret("9의 0.5제곱의 세제곱.", "27");
    assertInterpret("-2의 9의 0.5제곱제곱.", "-8");
  });
  it("덧셈", function () {
    assertInterpret("1과 2의 합.", "3");
    assertInterpret("1과 -2의 합.", "-1");
    assertInterpret("1과 0.5의 합.", "1.5");
    assertInterpret("-1.25과 0.5의 합.", "-0.75");
    assertInterpret("1과 2와 3의 합.", "6");
    assertInterpret("1과 2와 3과 4의 합.", "10");
    assertInterpret("1과 2를 더한 값.", "3");
    assertInterpret("1과 2와 3을 모두 더한 값.", "6");
    assertInterpret("이십삼과 마이너스삼십을 더한 값.", "-7");
    assertInterpret("마이너스 이십만과 십만 오천을 더한 값.", "-95000");
    assertInterpret("점오와 삼점이오를 더한 값.", "3.75");

    assertInterpret("2를 1과 더한 값.", "3");
  });
  it("뺄셈", function () {
    assertInterpret("3과 4의 차.", "1");
    assertInterpret("4와 3의 차.", "1");
    assertInterpret("4에서 3을 뺀 값.", "1");
    assertInterpret("3에서 4을 뺀 값.", "-1");
    assertInterpret("십에서 마이너스 오를 뺀 값.", "15");
    assertInterpret("1과 2를 더해 10에서 뺀 값.", "7");
    assertInterpret("1과 2를 더해 10을 뺀 값.", "-7");
    // assertInterpret("1과 2를 더해 10 뺀 값.", "-7");  // TODO: 기본 순서 따르기
  });
  it("곱셈", function () {
    assertInterpret("0과 1의 곱.", "0");
    assertInterpret("10과 11의 곱.", "110");
    assertInterpret("-0.5와 2의 곱.", "-1");
    assertInterpret("1과 2와 3과 4의 곱.", "24");
    assertInterpret("일과 이와 삼과 사를 모두 곱한 값.", "24");
    assertInterpret("영점오와 마이너스 사를 곱한 값.", "-2");
  });
  it("나눗셈", function () {
    assertInterpret("7을 2로 나눈 값.", "3.5");
    assertInterpret("7을 2로 나눈 몫.", "3");
    assertInterpret("7을 2로 나눈 나머지.", "1");
    assertInterpret("-7을 2로 나눈 값.", "-3.5");
    assertInterpret("-7을 2로 나눈 몫.", "-3");
    assertInterpret("-7을 2로 나눈 나머지.", "-1");
    assertInterpret("7을 -2로 나눈 값.", "-3.5");
    assertInterpret("7을 -2로 나눈 몫.", "-3");
    assertInterpret("7을 -2로 나눈 나머지.", "1");
    assertInterpret("-7을 -2로 나눈 값.", "3.5");
    assertInterpret("-7을 -2로 나눈 몫.", "3");
    assertInterpret("-7을 -2로 나눈 나머지.", "-1");
  });
  it("결합", function () {
    assertInterpret("1과 2의 합과 3의 합.", "6");
    assertInterpret("1과 2의 합과, 3과 4의 합의, 합.", "10");
    assertInterpret("1과 2를 더해 3과 더한 값.", "6");
    assertInterpret("4와 3를 곱해 6으로 나눈 값.", "2");
    assertInterpret("4를 2로 나누어 3을 곱한 값.", "6");
  });
});

describe("참거짓", function () {
  it("기본", function () {
    assertInterpret("참.", "참");
    assertInterpret("거짓.", "거짓");
    assertInterpret("1이 2보다 작다.", "참");
    assertInterpret("1이 5 이상 10 미만이다.", "거짓");
    assertInterpret("1이 -5 이상 2 이하이다.", "참");
    assertInterpret("3이 3 이상 4 이하이다.", "참");
    assertInterpret("3이 3 초과 4 이하이다.", "거짓");
    assertInterpret("3이 3 이상 4 미만이다.", "참");
    assertInterpret("3이 3 초과 4 미만이다.", "거짓");
    assertInterpret("3.5가 3 초과 4 미만이다.", "참");
    assertInterpret("4가 3 이상 4 이하이다.", "참");
    assertInterpret("4가 3 초과 4 이하이다.", "참");
    assertInterpret("4가 3 이상 4 미만이다.", "거짓");
    assertInterpret("4가 3 초과 4 미만이다.", "거짓");
    assertInterpret("3이 3 이상 3 이하이다.", "참");
    assertInterpret("3이 3 이상 3 미만이다.", "거짓");
    assertInterpret("3이 3 초과 3 미만이다.", "거짓");

    // assertInterpret("1과 -1을 더하면 0이다.", "참");
  });
  it("동일성", function () {
    assertInterpret("참과 참이 같다.", "참");
    assertInterpret("거짓과 참이 같다.", "거짓");
    assertInterpret("1이 1과 같다.", "참");
    assertInterpret("1이 2와 같다.", "거짓");
    assertInterpret("5를 2로 나눈 것이 2.5와 같다.", "참");
    assertInterpret("5를 2로 나눈 것이 7.5을 3으로 나눈 것과 같다.", "참");
    assertInterpret("5를 2로 나눈 것이 5를 2로 나눈 것과 같다.", "참");
    assertInterpret("5를 2로 나눈 것이 -5를 -2로 나눈 것과 같다.", "참");
    assertInterpret("5를 2로 나눈 것이 6을 2로 나눈 것과 같다.", "거짓");
    assertInterpret("5를 2로 나눈 것이 7를 2로 나눈 것과 같다.", "거짓");
  });
  it("분기", function () {
    assertInterpret(
      "1을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한다.",
      "5"
    );
    assertInterpret(
      "7을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한다.",
      "-5"
    );
    assertInterpret(
      "1을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한 값.",
      "5"
    );
    assertInterpret(
      "1을 '변수'라고 하자. '변수'가 5보다 작으면 10, 아니면 0을 -5와 더한 값.",
      "10"
    );
    assertInterpret(
      "7을 '변수'라고 하고 '변수'가 5보다 작으면 10 아니면 0을 -5와 더한 값.",
      "-5"
    );
  });
  it("논리 연산", function () {
    assertInterpret(
      "1을 '변수'라고 하자. '변수'가 5보다 크고 10보다 작으면 10 아니면 0을 -5와 더한다.",
      "-5"
    );
    assertInterpret(
      "1을 '변수'라고 하자. '변수'가 5보다 작거나 10보다 크면 10 아니면 0을 -5와 더한다.",
      "5"
    );
  });
});

describe("명령형", function () {
  it("변수 기본", function () {
    assertInterpret("1을 '초깃값'으로 삼는다. '초깃값'.", "1");
  });
  it("변수 선언", function () {
    let defs = `
      1을 '초깃값'으로 삼는다.
      마이너스 이를 '차분'으로 두자.`;
    assertInterpret(defs + "'초깃값'과 '차분'의 합.", "-1");
    defs += `
    '초깃값'과 '차분'의 합이 '현재값'이 된다.
    '현재값'과 '차분'의 합이 '현재값'이 된다.
    `;
    assertInterpret(defs + "'현재값'.", "-3");
  });
  it("변수 선행사", function () {
    assertInterpret("1을 '초깃값'으로 삼아 그것에 5를 더한다.", "6");
  });
  it("주석", function () {
    const defs = `
      1(안녕)을 '초깃값'(하세요)으로 삼는다.(반갑
      습니다.) 마이너스(처음)이를 '차분(뵙겠)'으(습니다)로 두자.`;
    assertInterpret(defs + "'초깃값'과 '차분'의 합.", "-1");
  });
  it("반복", function () {
    let defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 0과 같을 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더해 두자.`;
    assertInterpret(defs + "'결과'.", "2");
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 같을 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더해 놓자.`;
    assertInterpret(defs + "'결과'.", "32");
  });
  it("반복 변형", function () {
    let defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 같게 될 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더해 놓자.`;
    assertInterpret(defs + "'결과'.", "32");
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 다르지 않을 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더해 두자.`;
    assertInterpret(defs + "'결과'.", "32");
    defs = `
      0을 '지표'로 삼고 2를 '결과'라고 하자.
      '지표'가 5와 다르지 않게 될 때까지,
        '결과'의 제곱을 '결과'로 삼고
        '지표'에 1을 더해 놓자.`;
    assertInterpret(defs + "'결과'.", "32");
  });
});

describe("함수", function () {
  it("명사 정의", function () {
    const defs = `
      배수 [명사]
      어느 정수가 어느 정수의 배수이다:
        앞의 정수가 뒤의 정수로 나누어떨어진다.  ( {1 참거짓}을 내놓음 )
        ( TODO: -> '2의 배수', '3의 배수인 정수' 등의 타입 생성 )

      약수 [명사]
      어느 정수가 어느 정수의 약수이다:
        뒤의 정수가 앞의 정수의 배수이다.

      짝수 [명사] -> 2의 배수
      ( TODO
        홀수 [명사]: 짝수가 아닌 정수.
      )
      `;
    // assertInterpret(defs + "2는 4의 배수이다.", "거짓");
    assertInterpret(defs + "2가 4의 배수이다.", "거짓");
    assertInterpret(defs + "4가 2의 배수이다.", "참");
    assertInterpret(defs + "2가 4의 약수이다.", "참");
    assertInterpret(defs + "4가 2의 약수이다.", "거짓");
    assertInterpret(defs + "3이 짝수이다.", "거짓");
    assertInterpret(defs + "-10이 짝수이다.", "참");
    // assertInterpret(defs + "3은 홀수이다.", "참");
    // assertInterpret(defs + "-10은 홀수이다.", "거짓");
  });
  it("형용사 정의", function () {
    const defs = `
      비슷하다 [형용사] 비슷하여/비슷해, 비슷하니
      두 수가 비슷하다:
        앞의 것의 차가 일억분의 일보다 작다. (TODO: 두 수의 차가 ~)

      `;
    assertInterpret(defs + "1e-8과 1.1e-8이 비슷하다.", "참"); // TODO: ~는
    assertInterpret(defs + "1e-7과 1.1e-7이 비슷하다.", "거짓");
    assertInterpret(defs + "1e-7과 1.01e-7이 비슷하다.", "참");
  });
});

describe("응용", function () {
  it("재귀", function () {
    const defs = `
      팩토리얼 [명사]
      어느 정수의 팩토리얼:  (TODO: 자연수?)
        해당 정수가 2 이상이면
          해당 정수보다 하나 작은 정수의 팩토리얼과 해당 정수의 곱
        아니면 1.
      계승 [명사] -> 팩토리얼

      번째 [명사]
      피보나치수 [명사]
      몇 번째의/ 피보나치수: (TODO: remove /)
        해당 정수가 2보다 크면
          해당 정수보다 둘 작은 번째의 피보나치수와
          해당 정수보다 하나 작은 번째의 피보나치수의 합
        아니면 1.

      `;
    assertInterpret(defs + "1의 팩토리얼.", "1");
    assertInterpret(defs + "2의 계승.", "2");
    assertInterpret(defs + "3의 팩토리얼.", "6");
    assertInterpret(defs + "4의 계승.", "24");

    assertInterpret(defs + "첫 번째 피보나치수.", "1");
    assertInterpret(defs + "두 번째 피보나치수.", "1");
    assertInterpret(defs + "세 번째 피보나치수.", "2");
    assertInterpret(defs + "네 번째 피보나치수.", "3");
    assertInterpret(defs + "다섯 번째 피보나치수.", "5");
  });
});

describe("오버로딩", function () {
  it("인수", function () {
    const defs = `
      어쩌구 [명사]
      어느 수의 어쩌구: 해당 수.
      어느 수와 어느 수의 어쩌구: 앞의 수.

    `;
    assertInterpret(defs + "5의 어쩌구.", "5");
    assertInterpret(defs + "4와 6의 어쩌구.", "4");
  });
  it("것", function () {
    const defs = `
      어쩌구 [명사]
      어느 수와 어느 수의 어쩌구: 앞의 것.

    `;
    assertInterpret(defs + "2와 -1의 어쩌구.", "2");
  });

  it("오버로딩", function () {
    let defs = `
      어쩌구 [명사]
      어느 수와 어느 수의 어쩌구: 앞의 수와 뒤의 수의 곱.
      어느 정수와 어느 정수의 어쩌구: 앞의 정수와 뒤의 정수의 곱.

    `;
    assertInterpret(defs + "2와 -3의 어쩌구.", "-6");
    assertInterpret(defs + "3과 0.25의 어쩌구.", "0.75");

    defs += `
      저쩌구 [명사]
      어느 수와 어느 수의 저쩌구:
      어느 정수와 어느 정수의 저쩌구:
        앞의 것과 뒤의 것의 어쩌구.

    `;
    assertInterpret(defs + "2와 -3의 저쩌구.", "-6");
    assertInterpret(defs + "3과 0.5의 저쩌구.", "1.5");
  });

  it("홀짝", function () {
    const defs = `
    직전수 [명사]
    어느 정수의 직전수: 해당 정수에서 1을 뺀 값.

    홀수 [명사]
    어느 정수가 홀수이다: 해당 정수가 0이 아니고 해당 정수의 절댓값의 직전수가 짝수이다.

    짝수 [명사]
    어느 정수가 짝수이다: 해당 정수가 0이거나 해당 정수의 절댓값의 직전수가 홀수이다.

    어쩌구 [명사]
    어느 정수의 어쩌구: 해당 정수가 홀수이면 참 아니면 거짓.

    `;
    assertInterpret(defs + "2의 어쩌구.", "거짓");
    assertInterpret(defs + "-1의 어쩌구.", "참");
  });
});

// describe("예정", function () {
//   it("각각, 모두", function () {
//     const defs = `
//       벡터 [명사]: 수열의 일종. (<- 인터페이스)
//       어느 벡터의 차원: 해당 벡터의 토대가 되는 수열의 길이.
//       어느 벡터의 요소: 해당 벡터의 토대가 되는 수열의 요소. (투명하게)
//       어느 벡터의 길이: 해당 벡터의 각 요소를(-> 여러 수) 각각 제곱해 모두 더한 것의 제곱근.
//       어느 수열로(인스턴스) 벡터를(클래스) 만들다: (-> 어느 수열로 만든 벡터)
//         해당 수열을 토대로 벡터를 만들다.
//       여러 수로 된 벡터:
//         여러 수로 된 수열로 만든 벡터.

//       내적 [명사]
//       두 벡터의 내적:
//         두 벡터의 차원이 모두 같아야 한다. (존댓말로만 바꿔서 그대로 에러로 출력됨)
//         ...
//       `;
//     assertInterpret(defs + "3과 4로 된 벡터의 길이.", "5");
//     assertInterpret(defs + "3과 4로 된 벡터의 차원.", "2");
//     assertInterpret(
//       defs + "3과 4로 된 벡터와, 4와 -3으로 된 벡터의 내적.",
//       "0"
//     );
//   });
//   it("입출력", function () {
//     const def = `
//       "안녕? 넌 이름이 뭐니?"라고 적은 뒤, 문자열 하나를 읽어 '이름'이라고 하자.
//       "{'이름'아}, 반가워!"라고 적는다.
//       ( 위 글을 그대로 적으려면 "\{'이름'아\}, 반가워!"라고 하면 됩니다. )
//       ( 쌍따옴표를 그대로 적을 때에도 "\""처럼 역빗금표를 함께 쓰면 됩니다. )
//       `;
//     assertInterpret(
//       def,
//       "",
//       "드래곤",
//       "안녕? 넌 이름이 뭐니?\n드래곤아, 반가워!"
//     );
//     assertInterpret(
//       def,
//       "",
//       "테로스",
//       "안녕? 넌 이름이 뭐니?\n테로스야, 반가워!"
//     );
//   });
//   it("이스케이프", function () {
//     const def = `
//       "'홑따옴표' \"쌍따옴표\" (소괄호) \{중괄호\} \\\\역빗금표"라고 적자.
//       줄 바꿔 "#001 #{2:03d} #00{1과 2의 합}"이라고 적자.
//       `;
//     assertInterpret(
//       def,
//       "",
//       "",
//       `'홑따옴표' "쌍따옴표" (소괄호) {중괄호} \\역빗금표
// #001 #002 #003`
//     );
//   });
//   it("예문", function () {
//     const def = `
//     팩토리얼 [명사]
//     어떤 자연수의 팩토리얼:
//       해당 자연수가 1이면 1,
//       아니면
//         해당 자연수보다 하나 작은 자연수의 팩토리얼과 해당 자연수의 곱.
//     [예문] 1의 팩토리얼은 1이다.
//     [예문] 4의 팩토리얼은 24이다.
//       `;
//     assertInterpret(def, '""');

//     let thrown = false;
//     try {
//       run(def + "[예문] 3의 팩토리얼은 3이다.");
//     } catch (e) {
//       thrown = true;
//     }
//     if (!thrown) assert.fail("Passed wrong example.");
//   });
// });
