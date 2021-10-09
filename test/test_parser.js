import assert from "assert";
import { encodeTag } from "./test_tokenize.js";
import { constructForest } from "../dist/chaltteok.js";

function parseChunk(chunk) {
  if (",.".includes(chunk))
    return { type: "symbol", symbol: chunk, abbr: chunk };
  const posMark = {
    n: "체언",
    v: "용언",
    d: "관형사",
    p: "조사",
    e: "어미",
    s: "접미사",
  };
  const pos = posMark[chunk[chunk.length - 1]];
  if (!pos) return { type: "word", lemma: chunk, pos: "부사", abbr: chunk };
  const lemma = chunk.slice(0, -1);
  if (isNaN(+lemma)) return { type: "word", lemma, pos, abbr: chunk };
  return { type: "number", lemma, pos, number: +lemma, abbr: chunk };
}

function prettyForest(nodes, level = 0) {
  let result = "";
  for (let node of nodes) {
    for (let i = 0; i < level; i++) result += " ";
    const name =
      node.head.type === "generic"
        ? node.head.name
        : encodeTag(node.head.token);
    result += name + "\n";
    result += prettyForest(node.children, level + 2);
  }
  return result;
}

function assertForest(original, expected) {
  const tokens = original.split(" ").map(parseChunk);
  const forest = constructForest(tokens);
  assert.deepStrictEqual(prettyForest(forest).slice(0, -1), expected.slice(1));
}

// 조사 없는 명사구: '의'가 생략된 것으로 본다
// 과p와 고e를 제외하고 모두 남긴다

describe("구문 분석", function () {
  it("기본", function () {
    assertForest(
      "4n 를p 2n 로p 나누다v -다e .",
      `
{n T}v -다e -> {n T}v
  [{1 수}n 를p] [{1 수}n 로p] 나누다v -> {1 나눔}v
    4n
    2n`
    );
    assertForest(
      "2n 로p 4n 를p 나누다v -다e .",
      `
{n T}v -다e -> {n T}v
  {1 수}n 로p {1 수}n 를p 나누다v -> {1 나눔}v
    2n
    4n`
    );
  });

  it("분수", function () {
    assertForest(
      "2n 분s 의p 1n .",
      `
{1 수}n 분s 의p {1 수}n -> {1 수}n
  2n
  1n`
    );
    assertForest(
      "2n 분s 의p 3n 분s 의p 1n .",
      `
{1 수}n 분s 의p {1 수}n -> {1 수}n
  {1 수}n 분s 의p {1 수}n -> {1 수}n
    2n
    3n
  1n`
    );
    assertForest(
      "2n 분s 의p , 3n 분s 의p 1n .",
      `
{1 수}n 분s 의p {1 수}n -> {1 수}n
  2n
  {1 수}n 분s 의p {1 수}n -> {1 수}n
    3n
    1n`
    );
  });
  it("거듭제곱", function () {
    assertForest(
      "3n 의p 제곱n .",
      `
{1 수}d 제곱n -> {1 수}n
  {n T}n 의p -> {n T}d
    3n`
    );
    assertForest(
      "-2n 의p 제곱n .",
      `
{1 수}d 제곱n -> {1 수}n
  {n T}n 의p -> {n T}d
    -2n`
    );
    assertForest(
      "0n 의p 제곱n .",
      `
{1 수}d 제곱n -> {1 수}n
  {n T}n 의p -> {n T}d
    0n`
    );
    assertForest(
      "1n 의p 0n 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    1n
  0n`
    );
    assertForest(
      "2n 의p 2n 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    2n
  2n`
    );
    assertForest(
      "-2n 의p 3n 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    -2n
  3n`
    );
    assertForest(
      "4n 의p 0.5n 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    4n
  0.5n`
    );
    assertForest(
      "9n 의p 0.5n 제곱s 의p 3n 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    {1 수}d {1 수}n 제곱s -> {1 수}n
      {n T}n 의p -> {n T}d
        9n
      0.5n
  3n`
    );
    assertForest(
      "-2n 의p 9n 의p 0.5n 제곱s 제곱s .",
      `
{1 수}d {1 수}n 제곱s -> {1 수}n
  {n T}n 의p -> {n T}d
    -2n
  {1 수}d {1 수}n 제곱s -> {1 수}n
    {n T}n 의p -> {n T}d
      9n
    0.5n`
    );
  });

  it("수식", function () {
    assertForest(
      "2n 의p 배수n .",
      `
    2n
  의p
배수n`
    );
    assertForest(
      "해당d 두d 수n .",
      `
  해당d
  두d
수n`
    );
    assertForest(
      "법n 가p 되v -는e 수n .",
      `
        법n
      가p
    되v
  -는e
수n`
    );
    assertForest(
      "요소n 의p 값n 가p 모두 같다v -(으)ㄴe 배열n .",
      `
            요소n
          의p
        값n
      가p
      모두
    같다v
  -(으)ㄴe
배열n`
    );
  });

  it("나열", function () {
    assertForest(
      "2n 과p 3n 를p 곱하다v -다e .",
      `
{n T}v -다e -> {n T}v
  [{2+ 수}n 를p] 곱하다v -> {1 수}v
    {n T}n 과p {1 T}n -> {n+1 T}n
      2n
      3n`
    );
    assertForest(
      "2n 과p 3n 의p 곱n .",
      `
{2+ 수}d 곱n -> {1 수}n
  {n T}n 의p -> {n T}d
    {n T}n 과p {1 T}n -> {n+1 T}n
      2n
      3n`
    );
    assertForest(
      "2n 과p 3n 의p 곱n 과p 4n 의p 차n .",
      `
{2 수}d 차n -> {1 수}n
  {n T}n 의p -> {n T}d
    {n T}n 과p {1 T}n -> {n+1 T}n
      {2+ 수}d 곱n -> {1 수}n
        {n T}n 의p -> {n T}d
          {n T}n 과p {1 T}n -> {n+1 T}n
            2n
            3n
      4n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 6n 로p 나누다v -다e .",
      `
{n T}v -다e -> {n T}v
  [{1 수}n 를p] [{1 수}n 로p] 나누다v -> {1 나눔}v
    {2+ 수}d 곱n -> {1 수}n
      {n T}n 의p -> {n T}d
        {n T}n 과p {1 T}n -> {n+1 T}n
          4n
          3n
    6n`
    );
    assertForest(
      "4n 과p 3n 의p 곱n 를p 2n 과p 4n 의p 합n 로p 나누다v -다e .",
      `
{n T}v -다e -> {n T}v
  [{1 수}n 를p] [{1 수}n 로p] 나누다v -> {1 나눔}v
    {2+ 수}d 곱n -> {1 수}n
      {n T}n 의p -> {n T}d
        {n T}n 과p {1 T}n -> {n+1 T}n
          4n
          3n
    {2+ 수}d 합n -> {1 수}n
      {n T}n 의p -> {n T}d
        {n T}n 과p {1 T}n -> {n+1 T}n
          2n
          4n`
    );
  });

  it("순접", function () {
    assertForest(
      "1n 에p 2n 를p 더하다v -고e 3n 를p 곱하다v -다e .",
      `
{n T}v -다e -> {n T}v
  {} {n T}v -> {n T}v
    {n T}v -고e -> {}
      [{1 수}n 에p] {1 수}n 를p 더하다v -> {1 수}v
        1n
        2n
    [{1 수}n 에p] {1 수}n 를p 곱하다v -> {1 수}v
      3n`
    );
    assertForest(
      "1n 에p 2n 를p 더하다v -고e 3n 를p 곱하다v -(으)ㄴe 값n .",
      `
{1 수}d 값n -> {1 수}n
  {n T}v -(으)ㄴe -> {n T}d
    {} {n T}v -> {n T}v
      {n T}v -고e -> {}
        [{1 수}n 에p] {1 수}n 를p 더하다v -> {1 수}v
          1n
          2n
      [{1 수}n 에p] {1 수}n 를p 곱하다v -> {1 수}v
        3n`
    );
  });

  it("쉼표", function () {
    assertForest(
      "0n 과p 1n 과p 2n 의p 곱n 과p , 3n 과p 4n 과p 5n 의p 곱n 의p 합n .",
      `
{2+ 수}d 합n -> {1 수}n
  {n T}n 의p -> {n T}d
    {n T}n 과p {1 T}n -> {n+1 T}n
      {2+ 수}d 곱n -> {1 수}n
        {n T}n 의p -> {n T}d
          {n T}n 과p {1 T}n -> {n+1 T}n
            {n T}n 과p {1 T}n -> {n+1 T}n
              0n
              1n
            2n
      {2+ 수}d 곱n -> {1 수}n
        {n T}n 의p -> {n T}d
          {n T}n 과p {1 T}n -> {n+1 T}n
            {n T}n 과p {1 T}n -> {n+1 T}n
              3n
              4n
            5n`
    );
  });

  it("종합", function () {
    assertForest(
      "첫째d 항n 과p 둘째d 항n 가p 1n 이다p -고e 그d 밖n 의p 항n 는p 직전n 의p 두d 항n 의p 합n 이다p -(으)ㄴe 수열n .",
      `
          첫째d
        항n
          둘째d
        항n
      가p
      1n
    이다p
              그d
            밖n
          의p
        항n
      는p
              직전n
            의p
            두d
          항n
        의p
      합n
    이다p
  -(으)ㄴe
수열n`
    );
    assertForest(
      "1n 부터p 해당d 수n 까지p 의p 모든d 정수n 의p 곱n .",
      `
          1n
        부터p
            해당d
          수n
        까지p
      의p
      모든d
    정수n
  의p
곱n`
    );
    assertForest(
      "대상n 가p 비다v -(아/어)e 있다v -(으)면e 그대로 두다v -ㄴ다/는다e .",
      `
              대상n
            가p
          비다v
        -(아/어)e
      있다v
    -(으)면e
    그대로
  두다v
-ㄴ다/는다e`
    );
    assertForest(
      "두d 수n 의p 차n 가p , 법n 가p 되다v -는e 수n 의p 배수n 이다p -(으)ㅁe .",
      `
            두d
          수n
        의p
      차n
    가p
                법n
              가p
            되다v
          -는e
        수n
      의p
    배수n
  이다p
-(으)ㅁe`
    );
    assertForest(
      "나누다v -(아/어)e 나머지n 가p 0n 가p 되다v -다e .",
      `
      나누다v
    -(아/어)e
      나머지n
    가p
      0n
    가p
  되다v
-다e`
    );
    assertForest(
      "어떤d 수n 로p 나누어떨어지다v -는e 수n .",
      `
          어떤d
        수n
      로p
    나누어떨어지다v
  -는e
수n`
    );
    assertForest(
      "여러d 수n 에p 대하다v -(아/어)e 공히 배수n 이다p -(으)ㄴe 수n .",
      `
              여러d
            수n
          에p
        대하다v
      -(아/어)e
      공히
      배수n
    이다p
  -(으)ㄴe
수n`
    );
    assertForest(
      "어떤d 정수n 를p 나누어떨어지다v -게e 하다v -는e 수n .",
      `
              어떤d
            정수n
          를p
        나누어떨어지다v
      -게e
    하다v
  -는e
수n`
    );
    assertForest(
      "해당d 수n 보다p 크다v -지e 않다v -(으)ㄴe 자연수n 이다p -다e .",
      `
                  해당d
                수n
              보다p
            크다v
          -지e
        않다v
      -(으)ㄴe
    자연수n
  이다p
-다e`
    );
  });
});
