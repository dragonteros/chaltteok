import { josa } from "josa";
import { Yongeon, Eomi } from "eomi-js";

export const NOUNS = `
갑절
값
개
거듭제곱
거짓
것
곱
곱절
그것
나머지
때
말
미만
몫
방법
배
배열
사이
수
수열
여럿
이것
이상
이하
자연수
저
정수
제곱
차
참
초과
함수
합
`
  .trim()
  .split("\n");

export const SUFFIXES = `
분
제곱
`
  .trim()
  .split("\n");  // 열

export const ADVERBS = `
각각
공히
그대로
모두
하나라도
`
  .trim()
  .split("\n");

export const DETERMINERS = `
각
그
모든
여러
어느
어떤
이
제
해당
`
  .trim()
  .split("\n");

const Josa = (s: string) => (n: string) => josa(n + s).slice(n.length);

export type JosaEntry = {
  lemma: string;
  forms: string[];
  realize: (n: string) => string;
};
export const JOSAS: JosaEntry[] = [
  { lemma: "가", forms: ["이", "가"], realize: Josa("#{가}") },
  { lemma: "과", forms: ["과", "와"], realize: Josa("#{과}") },
  { lemma: "까지", forms: ["까지"], realize: Josa("까지") },
  { lemma: "나", forms: ["나", "이나"], realize: Josa("#{이?}나") },
  { lemma: "는", forms: ["은", "는"], realize: Josa("#{는}") },
  { lemma: "로", forms: ["로", "으로"], realize: Josa("#{로}") },
  { lemma: "를", forms: ["을", "를"], realize: Josa("#{를}") },
  { lemma: "보다", forms: ["보다"], realize: Josa("보다") },
  { lemma: "부터", forms: ["부터"], realize: Josa("부터") },
  { lemma: "에", forms: ["에"], realize: Josa("에") },
  { lemma: "에서", forms: ["에서"], realize: Josa("에서") },
  { lemma: "이-게", forms: ["게"], realize: Josa("#{이?}게") },
  { lemma: "이-게", forms: ["이게"], realize: Josa("이게") },
  { lemma: "이-고", forms: ["고"], realize: Josa("#{이?}고") },
  { lemma: "이-고", forms: ["이고"], realize: Josa("이고") },
  { lemma: "이-다", forms: ["다"], realize: Josa("#{이?}다") },
  { lemma: "이-다", forms: ["이다"], realize: Josa("이다") },
  { lemma: "이-(으)면", forms: ["면"], realize: Josa("#{이?}면") },
  { lemma: "이-(으)면", forms: ["이면"], realize: Josa("이면") },
  { lemma: "이-(으)ㄴ", forms: ["인"], realize: Josa("인") },
  { lemma: "이-(으)ㄹ", forms: ["일"], realize: Josa("일") },
  { lemma: "이-(으)ㅁ", forms: ["임"], realize: Josa("임") },
  { lemma: "이라고", forms: ["라고", "이라고"], realize: Josa("#{이?}라고") },
  { lemma: "의", forms: ["의"], realize: Josa("의") },
];

function _hada(root: string): Yongeon[] {
  return [
    new Yongeon(root + "하다", root + "해"),
    new Yongeon(root + "하다", root + "하여"),
  ];
}
export const VERBS: Yongeon[] = [
  ..._hada(""),
  ..._hada("곱"),
  ..._hada("대"),
  ..._hada("더"),
  new Yongeon("나누다"),
  new Yongeon("나누다", "나눠"),
  new Yongeon("나누어떨어지다", "나누어떨어져"),
  new Yongeon("두다"),
  new Yongeon("두다", "둬"),
  new Yongeon("되다"),
  new Yongeon("되다", "돼"),
  new Yongeon("비다"),
  new Yongeon("아니하다", "아니하여"),
  new Yongeon("않다"),
  new Yongeon("있다"),
  new Yongeon("빼다"),
  new Yongeon("빼다", "빼"),
  new Yongeon("삼다"),
];
export const ADJECTIVES: Yongeon[] = [
  new Yongeon("같다"),
  new Yongeon("다르다", "달라"),
  new Yongeon("아니다"),
  new Yongeon("작다"),
  new Yongeon("크다"),
];

export const EOMIS: Eomi[] = [
  new Eomi("거나"),
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
  new Eomi("자"),
  new Eomi("지"),
];
export const VERB_EOMIS: Eomi[] = [
  ...EOMIS,
  new Eomi("는"),
  new Eomi("ㄴ다", "는다"),
];
