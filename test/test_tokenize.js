import assert from "assert";
import { Analyzer, tokenize } from "../dist/chaltteok.js";

export function encodeTag(tag) {
  if (tag.type === "symbol") return tag.symbol;
  const posMark = {
    체언: "n",
    용언: "v",
    관형사: "d",
    부사: "",
    조사: "p",
    어미: "e",
    접미사: "s",
  };
  return tag.lemma + posMark[tag.pos];
}

function assertTokenized(original, chunks, extra = undefined) {
  const analyzer = new Analyzer();
  ((extra && extra.nouns) || []).forEach((x) => analyzer.addNoun(x));
  ((extra && extra.adjs) || []).forEach((x) => analyzer.addAdj(x));
  ((extra && extra.verbs) || []).forEach((x) => analyzer.addVerb(x));
  const tokenized = tokenize(original, analyzer);
  assert.strictEqual(tokenized.map(encodeTag).join(" "), chunks);
}

describe("품사 분석", function () {
  describe("기본", function () {
    it("서술어", function () {
      assertTokenized("하다", "하다v -다e");
    });
    it("목적어와 서술어", function () {
      assertTokenized("그것을 더하다", "그것n 를p 더하다v -다e");
    });
    it("보어와 서술어", function () {
      assertTokenized("갑절이 되다", "갑절n 가p 되다v -다e");
    });
  });

  describe("실전", function () {
    it("기본", function () {
      assertTokenized("4를 2로 나누다", "4n 를p 2n 로p 나누다v -다e");
    });

    it("분수", function () {
      assertTokenized("2분의 1", "2n 분s 의p 1n");
      assertTokenized("2분의 3분의 1", "2n 분s 의p 3n 분s 의p 1n");
      assertTokenized("2분의, 3분의 1", "2n 분s 의p , 3n 분s 의p 1n");
    });

    it("수식", function () {
      assertTokenized("값이 0보다 크다", "값n 가p 0n 보다p 크다v -다e");
      assertTokenized("2의 배수", "2n 의p 배수n",
      { nouns: ["배수"] });
      assertTokenized("해당 두 수", "해당d 두n 수n"); // TODO
      assertTokenized("3의 제곱", "3n 의p 제곱n");
      assertTokenized("'법'이 되는 수", "법n 가p 되다v -는e 수n");
      assertTokenized(
        "요소의 값이 모두 같은 배열",
        "요소n 의p 값n 가p 모두 같다v -(으)ㄴe 배열n",
        { nouns: ["요소"] }
      );
    });

    it("나열", function () {
      assertTokenized("2와 3을 곱하다", "2n 과p 3n 를p 곱하다v -다e");
      assertTokenized("2와 3의 곱", "2n 과p 3n 의p 곱n");
      assertTokenized(
        "2와 3의 곱과 4의 차",
        "2n 과p 3n 의p 곱n 과p 4n 의p 차n"
      );
      assertTokenized(
        "4와 3의 곱을 6으로 나누다",
        "4n 과p 3n 의p 곱n 를p 6n 로p 나누다v -다e"
      );
      assertTokenized(
        "4와 3의 곱을 2와 4의 합으로 나누다",
        "4n 과p 3n 의p 곱n 를p 2n 과p 4n 의p 합n 로p 나누다v -다e"
      );
    });

    it("순접", function () {
      assertTokenized(
        "1을 2와 더하고 3을 곱하다",
        "1n 를p 2n 과p 더하다v -고e 3n 를p 곱하다v -다e"
      );
      assertTokenized(
        "1을 2와 더하고 3을 곱한 값",
        "1n 를p 2n 과p 더하다v -고e 3n 를p 곱하다v -(으)ㄴe 값n"
      );
    });

    it("쉼표", function () {
      assertTokenized(
        "0과 1과 2의 곱과, 3과 4와 5의 곱의 합",
        "0n 과p 1n 과p 2n 의p 곱n 과p , 3n 과p 4n 과p 5n 의p 곱n 의p 합n"
      );
    });

    it("종합", function () {
      assertTokenized(
        "대상이 비어 있으면 그대로 둔다",
        "대상n 가p 비다v -(아/어)e 있다v -(으)면e 그대로 두다v -(으)ㄴ다/-는다e",
        { nouns: ["대상"] }
      );
      assertTokenized(
        "두 수의 차가 , '법'이 되는 수의 배수임",
        "두n 수n 의p 차n 가p , 법n 가p 되다v -는e 수n 의p 배수n 이다p -(으)ㅁe",
        {nouns: ['배수']}
      ); // TODO
      assertTokenized(
        "나누어 나머지가 0이 되다",
        "나누다v -(아/어)e 나머지n 가p 0n 가p 되다v -다e"
      );
      assertTokenized(
        "어떤 수로 나누어떨어지는 수",
        "어떤d 수n 로p 나누어떨어지다v -는e 수n"
      );
      assertTokenized(
        "여러 수에 대해 공히 배수인 수",
        "여러d 수n 에p 대하다v -(아/어)e 공히 배수n 이다p -(으)ㄴe 수n",
        {nouns: ['배수']}
      );
      assertTokenized(
        "어떤 정수를 나누어떨어지게 하는 수",
        "어떤d 정수n 를p 나누어떨어지다v -게e 하다v -는e 수n"
      );
      assertTokenized(
        "해당 수보다 크지 않은 자연수이다",
        "해당d 수n 보다p 크다v -지e 않다v -(으)ㄴe 자연수n 이다p -다e"
      );
      assertTokenized(
        "1부터 해당 수까지 모든 정수의 곱",
        "1n 부터p 해당d 수n 까지p 모든d 정수n 의p 곱n"
      );
    });
  });
});
