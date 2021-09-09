const assert = require("assert");
const { tokenize } = require("../dist/chaltteok.js");

function encodeTag(tag) {
  posMark = {
    체언: "n",
    용언: "v",
    관형사: "d",
    부사: "",
    조사: "p",
    어미: "e",
    ",": ",",
  };
  return tag.lemma + posMark[tag.pos];
}

function assertTokenized(original, chunks) {
  assert.strictEqual(tokenize(original).map(encodeTag).join(" "), chunks);
}

describe("품사 분석", function () {
  describe("기본", function () {
    it("서술어", function () {
      const analyzed = tokenize("하다");
      assert.strictEqual(analyzed.length, 2);
      assert.strictEqual(analyzed[0].pos, "용언");
      assert.strictEqual(analyzed[1].pos, "어미");
    });
    it("목적어와 서술어", function () {
      const analyzed = tokenize("그것을 더하다");
      assert.strictEqual(analyzed.length, 4);
      assert.strictEqual(analyzed[0].pos, "체언");
      assert.strictEqual(analyzed[1].pos, "조사");
      assert.strictEqual(analyzed[2].pos, "용언");
      assert.strictEqual(analyzed[3].pos, "어미");
    });
    it("보어와 서술어", function () {
      const analyzed = tokenize("갑절이 되다");
      assert.strictEqual(analyzed.length, 4);
      assert.strictEqual(analyzed[0].pos, "체언");
      assert.strictEqual(analyzed[1].pos, "조사");
      assert.strictEqual(analyzed[2].pos, "용언");
      assert.strictEqual(analyzed[3].pos, "어미");
    });
    it("부사어와 서술어", function () {
      const analyzed = tokenize("합과 같다");
      assert.strictEqual(analyzed.length, 4);
      assert.strictEqual(analyzed[0].pos, "체언");
      assert.strictEqual(analyzed[1].pos, "조사");
      assert.strictEqual(analyzed[2].pos, "용언");
      assert.strictEqual(analyzed[3].pos, "어미");
    });
  });

  describe("실전", function () {
    it("기본", function () {
      assertTokenized("4를 2로 나누다", "4n 를p 2n 로p 나누다v -다e");
    });

    it("수식", function () {
      assertTokenized("2의 배수", "2n 의p 배수n");
      assertTokenized("해당 두 수", "해당d 두d 수n");
      assertTokenized("3의 제곱", "3n 의p 제곱n");
      assertTokenized("법이 되는 수", "법n 가p 되v -는e 수n");
      assertTokenized(
        "요소의 값이 모두 같은 배열",
        "요소n 의p 값n 가p 모두 같다v -(으)ㄴe 배열n"
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
        "1에 2를 더하고 3을 곱하다",
        "1n 에p 2n 를p 더하다v -고e 3n 를p 곱하다v -다e"
      );
      assertTokenized(
        "1에 2를 더하고 3을 곱한 값",
        "1n 에p 2n 를p 더하다v -고e 3n 를p 곱하다v -(으)ㄴe 값n"
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
        "첫째 항과 둘째 항이 1이고 그 밖의 항은 직전의 두 항의 합인 수열",
        "첫째d 항n 과p 둘째d 항n 가p 1n 이p -고e 그d 밖n 의p 항n 는p 직전n 의p 두d 항n 의p 합n 이p -(으)ㄴe 수열n"
      );
      assertTokenized(
        "1부터 해당 수까지의 모든 정수의 곱",
        "1n 부터p 해당d 수n 까지p 의p 모든d 정수n 의p 곱n"
      );
      assertTokenized(
        "대상이 비어 있으면 그대로 둔다",
        "대상n 가p 비다v -(아/어)e 있다v -(으)면e 그대로 두다v -ㄴ다/는다e"
      );
      assertTokenized(
        "두 수의 차가 법이 되는 수의 배수임",
        "두d 수n 의p 차n 가p , 법n 가p 되다v -는e 수n 의p 배수n 이p -(으)ㅁe"
      );
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
        "여러d 수n 에p 대하다v -(아/어)e 공히 배수n 이p -(으)ㄴe 수n"
      );
      assertTokenized(
        "어떤 정수를 나누어떨어지게 하는 수",
        "어떤d 정수n 를p 나누어떨어지다v -게e 하다v -는e 수n"
      );
      assertTokenized(
        "해당 수보다 크지 않은 자연수이다",
        "해당d 수n 보다p 크다v -지e 않다v -(으)ㄴe 자연수n 이p -다e"
      );
      assertTokenized(
        "1과 자신만이 약수인 수",
        "1n 과p 자신n 만p 가p 약수n 이p -(으)ㄴe 수n"
      );
    });
  });
});
