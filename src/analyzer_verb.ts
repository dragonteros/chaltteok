import { Yongeon, Eomi, Analyzer } from "eomi-js";

function putHada(root: string) {
  return [
    new Yongeon(root + "하다", root + "해"),
    new Yongeon(root + "하다", root + "하여"),
  ];
}
const verbs: Yongeon[][] = [
  putHada(""),
  putHada("곱"),
  putHada("더"),
  [new Yongeon("나누다"), new Yongeon("나누다", "나눠")],
  [new Yongeon("나누어떨어지다", "나누어떨어져")],
  [new Yongeon("두다"), new Yongeon("두다", "둬")],
  [new Yongeon("되다"), new Yongeon("되다", "돼")],
  [new Yongeon("비다")],
  [new Yongeon("아니하다", "아니하여")],
  [new Yongeon("않다")],
  [new Yongeon("있다")],
  [new Yongeon("빼다"), new Yongeon("빼다", "빼")],
  [new Yongeon("삼다")],
];
const adjs: Yongeon[][] = [
  [new Yongeon("같다")],
  [new Yongeon("다르다", "달라")],
  [new Yongeon("아니다")],
  [new Yongeon("작다")],
  [new Yongeon("크다")],
];

const commonEomis: Eomi[] = [
  new Eomi("게"),
  new Eomi("고"),
  new Eomi("기"),
  new Eomi("다"),
  new Eomi("ㄴ"),
  new Eomi("ㄹ"),
  new Eomi("ㅁ"),
  new Eomi("아"),
  new Eomi("아서"),
  new Eomi("으면"),
  new Eomi("지"),
];
const verbEomis: Eomi[] = [new Eomi("는"), new Eomi("ㄴ다", "는다")];

const adjAnalyzer = new Analyzer(adjs.flat(), commonEomis);
const verbAnalyzer = new Analyzer(verbs.flat(), commonEomis.concat(verbEomis));

export { adjAnalyzer, verbAnalyzer };
