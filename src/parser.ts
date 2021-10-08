import { ParseError, Token, WordToken } from "./analyzer";

export class Tree {
  head: Token;
  children: Tree[];
  type: string;
  constructor(head: Token, children?: Tree[], type?: string) {
    this.head = head;
    this.children = children || [];
    this.type = type || (head.type === "symbol" ? head.symbol : head.pos);
  }
}

class Stack {
  data: Tree[];
  constructor() {
    this.data = [];
  }
  push(v: Tree) {
    this.data.push(v);
  }
  pop() {
    return this.data.pop();
  }
  splice(start: number): Tree[];
  splice(start: number, deleteCount: number, ...items: Tree[]): Tree[];
  splice(start: number, deleteCount?: number, ...items: Tree[]) {
    if (deleteCount == null) return this.data.splice(start);
    return this.data.splice(start, deleteCount, ...items);
  }
  get(index: number) {
    if (index < 0) index += this.data.length;
    if (index < 0 || index >= this.data.length) throw RangeError;
    return this.data[index];
  }
  get length() {
    return this.data.length;
  }
}

const 과: WordToken = { type: "word", lemma: "과", pos: "조사" };
const 고: WordToken = { type: "word", lemma: "-고", pos: "어미" };

export function equalWord(word1: Token, word2: WordToken): boolean {
  if (word1.type !== word2.type) return false;
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

function _stackOperation(top: Tree, vice: Tree) {
  if (top.type === "범위" && vice.type === "범위") {
    return new Tree(과, [vice, top], "체언");
  }

  if (top.type === "체언") {
    if (vice.type === "체언 이어짐") {
      if (!equalWord(top.head, 과)) {
        return new Tree(vice.head, [...vice.children, top], "체언");
      }
    } else if (vice.type === "체언" || vice.type === "관형사") {
      return new Tree(top.head, [vice, ...top.children], "체언");
    }
  }

  if (top.type === "용언") {
    if (vice.type === "용언 이어짐") {
      if (!equalWord(top.head, 고)) {
        return new Tree(vice.head, [...vice.children, top], "용언");
      }
    } else if (vice.type === "부사") {
      return new Tree(top.head, [vice, ...top.children], "용언");
    }
  }

  if (top.type === "접미사" && vice.type === "체언") {
    return new Tree(top.head, [vice, ...top.children], "체언");
  }

  if (top.type === "조사" && vice.type === "체언") {
    let output = new Tree(top.head);
    if (equalWord(vice.head, 과)) {
      output.children = vice.children;
    } else {
      output.children = [vice];
    }
    const head = top.head as WordToken; // 조사
    if (["부터", "까지"].includes(head.lemma)) {
      output.type = "범위";
    } else if (head.lemma === "의") {
      output.type = "관형사";
    } else if (head.lemma === "이다") {
      output.type = "용언";
    } else if (head.lemma === "과") {
      output.type = "체언 이어짐";
    } else if (head.lemma === "만") {
      output.type = "체언";
    } else {
      output.type = "부사";
    }
    return output;
  }

  if (top.type === "어미" && vice.type === "용언") {
    let output = new Tree(top.head);
    if (equalWord(vice.head, 고)) {
      output.children = vice.children;
    } else {
      output.children = [vice];
    }
    const head = top.head as WordToken; // 어미
    if (["-(으)ㅁ", "-기"].includes(head.lemma)) {
      output.type = "체언";
    } else if (["-(으)ㄴ", "-(으)ㄹ", "-는"].includes(head.lemma)) {
      output.type = "관형사";
    } else if (["-다", "-ㄴ다/는다"].includes(head.lemma)) {
      output.type = "서술어";
    } else if (head.lemma === "-고") {
      output.type = "용언 이어짐";
    } else {
      output.type = "부사";
    }
    return output;
  }
}


function constructForest(tokens: Token[]) {
  let forest: Tree[] = [];
  let stack = new Stack();
  for (const token of tokens) {
    stack.push(new Tree(token));
    while (stack.length >= 2) {
      let top = stack.get(-1);
      let vice = stack.get(-2);

      if (top.type === ".") {
        stack.splice(-2, 2);
        forest.push(vice);
        break;
      }
      if (top.type === ",") break;
      if (vice.type === "," && stack.length >= 3) {
        vice = stack.get(-3);
        if (_stackOperation(top, vice)) stack.splice(-2, 1);
        break;
      }

      let output = _stackOperation(top, vice);
      if (!output) break;
      stack.splice(-2, 2, output);
    }
  }
  if (stack.length > 0) throw new ParseError("구문은 마침표로 끝나야 합니다.");
  return forest;
}

export { constructForest };
