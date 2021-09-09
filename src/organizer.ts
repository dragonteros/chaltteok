type Tag = { lemma: string; pos: string };

class Tree {
  head: Tag;
  children: Tree[];
  pos: string;
  constructor(head: Tag, children?: Tree[], pos?: string) {
    this.head = head;
    this.children = children || [];
    this.pos = pos || head.pos;
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

const 과 = { lemma: "과", pos: "조사" };
const 고 = { lemma: "-고", pos: "어미" };

function equalWord(word1: Tag, word2: Tag) {
  return word1.lemma === word2.lemma && word1.pos === word2.pos;
}

function _stackOperation(top: Tree, vice: Tree) {
  if (top.pos === "범위" && vice.pos === "범위") {
    return new Tree(과, [vice, top], "체언");
  }

  if (top.pos === "체언") {
    if (vice.pos === "체언 이어짐") {
      if (!equalWord(top.head, 과)) {
        return new Tree(vice.head, [...vice.children, top], "체언");
      }
    } else if (vice.pos === "체언" || vice.pos === "관형사") {
      return new Tree(top.head, [vice, ...top.children], "체언");
    }
  }

  if (top.pos === "용언") {
    if (vice.pos === "용언 이어짐") {
      if (!equalWord(top.head, 고)) {
        return new Tree(vice.head, [...vice.children, top], "용언");
      }
    } else if (vice.pos === "부사") {
      return new Tree(top.head, [vice, ...top.children], "용언");
    }
  }

  if (top.pos === "조사" && vice.pos === "체언") {
    let output = new Tree(top.head);
    if (equalWord(vice.head, 과)) {
      output.children = vice.children;
    } else {
      output.children = [vice];
    }
    if (["부터", "까지"].includes(top.head.lemma)) {
      output.pos = "범위";
    } else if (top.head.lemma === "의") {
      output.pos = "관형사";
    } else if (top.head.lemma === "이") {
      output.pos = "용언";
    } else if (top.head.lemma === "과") {
      output.pos = "체언 이어짐";
    } else if (top.head.lemma === "만") {
      output.pos = "체언";
    } else {
      output.pos = "부사";
    }
    return output;
  }

  if (top.pos === "어미" && vice.pos === "용언") {
    let output = new Tree(top.head);
    if (equalWord(vice.head, 고)) {
      output.children = vice.children;
    } else {
      output.children = [vice];
    }
    if (["-(으)ㅁ", "-기"].includes(top.head.lemma)) {
      output.pos = "체언";
    } else if (["-(으)ㄴ", "-(으)ㄹ", "-는"].includes(top.head.lemma)) {
      output.pos = "관형사";
    } else if (["-다", "-ㄴ다/는다"].includes(top.head.lemma)) {
      output.pos = "서술어";
    } else if (top.head.lemma === "-고") {
      output.pos = "용언 이어짐";
    } else {
      output.pos = "부사";
    }
    return output;
  }
}

function constructForest(tokens: Tag[]) {
  let stack = new Stack();
  for (const token of tokens) {
    stack.push(new Tree(token));
    while (stack.length >= 2) {
      let top = stack.get(-1);
      let vice = stack.get(-2);

      if (top.pos === ",") break;
      if (vice.pos === "," && stack.length >= 3) {
        vice = stack.get(-3);
        if (_stackOperation(top, vice)) stack.splice(-2, 1);
        break;
      }

      let output = _stackOperation(top, vice);
      if (!output) break;
      stack.splice(-2, 2, output);
    }
  }
  return stack.data;
}

export { constructForest };
