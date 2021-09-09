const NOUNS = `
갑절
개
거듭제곱
것
곱
그것
나머지
때
말
몫
방법
배
배열
사이
수
수열
여럿
이것
저
제곱
중
차
함수
합
`
  .trim()
  .split("\n");

const ADVERBS = `
  각각
  공히
  그대로
  모두
  하나라도
  `
  .trim()
  .split("\n");

const DETERMINERS = `
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

export { NOUNS, ADVERBS, DETERMINERS };
