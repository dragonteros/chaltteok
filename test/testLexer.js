import assert from "assert";
import { josa } from "josa";

import { getKeyFromToken } from "../src/finegrained/tokens";
import { tokenize } from "../src/lexer/tokenizer";
import { loadPreludeModule } from "../src/runner/prelude";

let ctx = null;

// type Extra = { nouns?: string[] };
function assertTokenized(original, chunks, extra) {
  if (ctx == null) ctx = loadPreludeModule().context;
  for (const vocab of extra?.nouns || []) {
    try {
      ctx?.analyzer.add(vocab, "명사");
    } catch (err) {
      if (err instanceof Error && err.message === "Duplicate entries!") {
        continue;
      }
      console.error(
        josa(
          `어절 "${original}"#{을} 분석하기 전 어휘 "${vocab}"#{을} 추가하던 중 ` +
            "다음 오류가 발생했습니다:"
        )
      );
      throw err;
    }
  }

  let tokenized;
  try {
    const metadata = {
      file: { path: "<stdin>", content: original },
      spans: [{ start: 0, end: original.length }],
    };
    const sentence = { metadata, value: original };
    tokenized = tokenize(sentence, ctx.analyzer);
  } catch (err) {
    console.error(
      josa(`어절 "${original}"#{을} 분석하던 중 다음 오류가 발생했습니다:`)
    );
    throw err;
  }
  assert.strictEqual(
    tokenized
      .map((token) => token.value)
      .map(getKeyFromToken)
      .join(" "),
    chunks
  );
}

describe("품사 분석", function () {
  describe("기본", function () {
    it("서술어", function () {
      assertTokenized("하다", "하다[동사] -다[어미]");
      assertTokenized("한다", "하다[동사] -(으)ㄴ다/-는다[어미]");
    });
    it("이다", function () {
      assertTokenized("정수다", "정수[명사] 이다[조사] -다[어미]");
      assertTokenized("일이다", "1[한자어수사] 이다[조사] -다[어미]");
      assertTokenized("이다", "2[한자어수사] 이다[조사] -다[어미]");
      assertTokenized("3이다", "3[한자어수사] 이다[조사] -다[어미]");
      assertTokenized("4다", "4[한자어수사] 이다[조사] -다[어미]");
    });
    it("목적어와 서술어", function () {
      assertTokenized(
        "그것을 더하다",
        "그것[명사] 를[조사] 더하다[동사] -다[어미]"
      );
    });
    it("보어와 서술어", function () {
      assertTokenized(
        "갑절이 되다",
        "갑절[명사] 가[조사] 되다[동사] -다[어미]"
      );
      assertTokenized("몫으로 삼다", "몫[명사] 로[조사] 삼다[동사] -다[어미]");
    });
  });

  describe("실전", function () {
    it("기본", function () {
      assertTokenized(
        "4를 2로 나누다",
        "4[한자어수사] 를[조사] 2[한자어수사] 로[조사] 나누다[동사] -다[어미]"
      );
      assertTokenized(
        "'문단'에 \"문장\"을 합치다",
        "'문단' 에[조사] \"문장\" 을[조사] 합치다[동사] -다[어미]"
      );
    });

    it("분수", function () {
      assertTokenized(
        "2분의 1",
        "2[한자어수사] 분[접미사] 의[조사] 1[한자어수사]"
      );
      assertTokenized(
        "2분의 3분의 1",
        "2[한자어수사] 분[접미사] 의[조사] 3[한자어수사] 분[접미사] 의[조사] 1[한자어수사]"
      );
      assertTokenized(
        "2분의, 3분의 1",
        "2[한자어수사] 분[접미사] 의[조사] , 3[한자어수사] 분[접미사] 의[조사] 1[한자어수사]"
      );
    });

    it("거듭제곱", function () {
      assertTokenized("3의 제곱", "3[한자어수사] 의[조사] 제곱[명사]");
      assertTokenized(
        "3의 0제곱",
        "3[한자어수사] 의[조사] 0[한자어수사] 제곱[접미사]"
      );
    });

    it("수식", function () {
      assertTokenized(
        "값이 0보다 크다",
        "값[명사] 가[조사] 0[한자어수사] 보다[조사] 크다[형용사] -다[어미]"
      );
      assertTokenized("2의 배수", "2[한자어수사] 의[조사] 배수[명사]", {
        nouns: ["배수"],
      });
      assertTokenized(
        "해당 두 수",
        "해당[관형사] 2[순우리말수관형사] 수[명사]"
      );
      assertTokenized("3의 제곱", "3[한자어수사] 의[조사] 제곱[명사]");
      assertTokenized(
        "'법'이 되는 수",
        "'법' 가[조사] 되다[동사] -는[어미] 수[명사]"
      );
      assertTokenized(
        "요소의 값이 모두 같은 배열",
        "요소[명사] 의[조사] 값[명사] 가[조사] 모두[부사] 같다[형용사] -(으)ㄴ[어미] 배열[명사]",
        { nouns: ["요소", "배열"] }
      );
    });

    it("나열", function () {
      assertTokenized(
        "2와 3을 곱하다",
        "2[한자어수사] 과[조사] 3[한자어수사] 를[조사] 곱하다[동사] -다[어미]"
      );
      assertTokenized(
        "2와 3의 곱",
        "2[한자어수사] 과[조사] 3[한자어수사] 의[조사] 곱[명사]"
      );
      assertTokenized(
        "2와 3의 곱과 4의 차",
        "2[한자어수사] 과[조사] 3[한자어수사] 의[조사] 곱[명사] 과[조사] 4[한자어수사] 의[조사] 차[명사]"
      );
      assertTokenized(
        "4와 3의 곱을 6으로 나누다",
        "4[한자어수사] 과[조사] 3[한자어수사] 의[조사] 곱[명사] 를[조사] 6[한자어수사] 로[조사] 나누다[동사] -다[어미]"
      );
      assertTokenized(
        "4와 3의 곱을 2와 4의 합으로 나누다",
        "4[한자어수사] 과[조사] 3[한자어수사] 의[조사] 곱[명사] 를[조사] 2[한자어수사] 과[조사] 4[한자어수사] 의[조사] 합[명사] 로[조사] 나누다[동사] -다[어미]"
      );
    });

    it("순접", function () {
      assertTokenized(
        "1을 2와 더하여 3을 곱하다",
        "1[한자어수사] 를[조사] 2[한자어수사] 과[조사] 더하다[동사] -(아/어)[어미] 3[한자어수사] 를[조사] 곱하다[동사] -다[어미]"
      );
      assertTokenized(
        "1을 2와 더하여 3을 곱한 값",
        "1[한자어수사] 를[조사] 2[한자어수사] 과[조사] 더하다[동사] -(아/어)[어미] 3[한자어수사] 를[조사] 곱하다[동사] -(으)ㄴ[어미] 값[명사]"
      );
    });

    it("쉼표", function () {
      assertTokenized(
        "0과 1과 2의 곱과, 3과 4와 5의 곱의 합",
        "0[한자어수사] 과[조사] 1[한자어수사] 과[조사] 2[한자어수사] 의[조사] 곱[명사] 과[조사] , 3[한자어수사] 과[조사] 4[한자어수사] 과[조사] 5[한자어수사] 의[조사] 곱[명사] 의[조사] 합[명사]"
      );
    });

    it("종합", function () {
      assertTokenized(
        "두 수의 차가, '법'이 되는 수의 배수임",
        "2[순우리말수관형사] 수[명사] 의[조사] 차[명사] 가[조사] , '법' 가[조사] 되다[동사] -는[어미] 수[명사] 의[조사] 배수[명사] 이다[조사] -(으)ㅁ[어미]",
        { nouns: ["배수"] }
      );
      assertTokenized(
        "나누어 나머지가 0이 되다",
        "나누다[동사] -(아/어)[어미] 나머지[명사] 가[조사] 0[한자어수사] 가[조사] 되다[동사] -다[어미]"
      );
      assertTokenized(
        "어느 수로 나누어떨어지는 수",
        "어느[관형사] 수[명사] 로[조사] 나누어떨어지다[동사] -는[어미] 수[명사]"
      );
      assertTokenized(
        "여러 수에 대해 공히 배수인 수",
        "여러[관형사] 수[명사] 에[조사] 대하다[동사] -(아/어)[어미] 공히[부사] 배수[명사] 이다[조사] -(으)ㄴ[어미] 수[명사]",
        { nouns: ["배수"] }
      );
      assertTokenized(
        "어느 정수를 나누어떨어지게 하는 수",
        "어느[관형사] 정수[명사] 를[조사] 나누어떨어지다[동사] -게[어미] 하다[동사] -는[어미] 수[명사]"
      );
      assertTokenized(
        "해당 수보다 크지 않은 자연수이다",
        "해당[관형사] 수[명사] 보다[조사] 크다[형용사] -지[어미] 않다[형용사] -(으)ㄴ[어미] 자연수[명사] 이다[조사] -다[어미]",
        { nouns: ["자연수"] }
      );
      assertTokenized(
        "1부터 해당 수까지 모든 정수의 곱",
        "1[한자어수사] 부터[조사] 해당[관형사] 수[명사] 까지[조사] 모든[관형사] 정수[명사] 의[조사] 곱[명사]"
      );
    });
  });
});
