const assert = require("assert");
const { tokenize, constructForest, treeToAST, run } = require("../dist/chaltteok.js");

function assertInterpret(original, expected) {
  const tokens = tokenize(original)
  const forest = constructForest(tokens);
  assert.strictEqual(forest.length, 1)
  const ast = treeToAST(forest[0])
  const value = run(ast)
  assert.deepStrictEqual(value, expected);
}

describe("산술", function () {
  it('기본', function () {
    assertInterpret("3의 제곱", 9);
    assertInterpret("2와 3의 곱", 6);
    assertInterpret("2와 3의 곱과 4의 차", 2);
    assertInterpret("0과 1과 2의 곱과, 3과 4와 5의 곱의 합", 60);
  })
})
