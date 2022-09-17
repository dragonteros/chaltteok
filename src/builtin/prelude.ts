export const PRELUDE: string = "갑절 [명사] -> 두 곱절\n\n값 [명사]\n무엇의 값:\n어찌한 값:\n어찌한 것:\n{\nneeds(\"1 수\");\nreturn ([num]) => [num];\n}\n무엇의 값:\n어찌한 값:\n어찌한 것:\n{\nneeds(\"1 정수\");\nreturn ([num]) => [num];\n}\n\n곱 [명사]\n여러 수의 곱:\n여러 정수의 곱:\n앞의 것을 모두 곱한 것. (TODO: 해당 수들)\n\n곱절 [명사]\n정수의 정수 곱절:\n얼마의 몇 곱절:\n앞의 것과 뒤의 것의 곱. (TODO: 동적 오버로딩 선택 관련해서 고민 좀 해보자)\n\n곱하다 [동사] 곱하여/곱해, 곱하니\n얼마에 얼마를 곱하다:\n얼마와 얼마를 곱하다: { //\nreturn ([x], [y]) => [{type: \"수\", 값: x.값 * y.값}];\n}\n어느 정수에 어느 정수를 곱하다:\n어느 정수와 어느 정수를 곱하다: {\nreturn ([x], [y]) => [{type: \"정수\", 값: x.값 * y.값}];\n}\n여러 수를 모두 곱하다: {\nreturn (nums) => [nums.reduce((x, y) => ({type: \"수\", 값: x.값 * y.값}))];\n}\n여러 정수를 모두 곱하다: {\nreturn (nums) => [nums.reduce((x, y) => ({type: \"정수\", 값: x.값 * y.값}))];\n}\n어느 변수에 어느 정수를 곱해 놓다:\n어느 변수에 어느 정수를 곱해 두다: { // TODO: 어느 정수 변수에\nneeds(\"1 정수 변수\", \"1 정수\");\nreturn function (box, [num]) {\nbox.data[0].값 *= num.값;\nreturn [];\n};\n}\n어느 변수에 얼마를 곱해 놓다:\n어느 변수에 얼마를 곱해 두다: {\nneeds(\"1 수 변수\", \"1 수\");\nreturn function (box, [num]) {\nbox.data[0].값 *= num.값;\nreturn [];\n};\n}\n\n나눔 [명사] (: 수의 일종. ( 새 타입 생성 ))\n무엇의 값:\n어찌한 값:\n어찌한 것: {\nneeds(\"1 나눔\");\nreturn ([division]) => [{type: \"수\", 값: division.값}];\n}\n몫 [명사]\n무엇의 몫:\n어찌한 몫: {\nneeds(\"1 나눔\");\nreturn ([division]) => [{type: \"정수\", 값: division.몫}];\n}\n나머지 [명사]\n무엇의 나머지:\n어찌한 나머지: {\nneeds(\"1 나눔\");\nreturn ([division]) => [{type: \"정수\", 값: division.나머지}];\n}\n\n나누다 [동사] 나누어/나눠, 나누니\n얼마를 얼마로 나누다:\n{\nreturn ([나뉘는수], [나누는수]) => [{type: \"수\", 값: 나뉘는수.값 / 나누는수.값}];\n}\n어느 정수를 어느 정수로 나누다:\n{\nreturn ([나뉘는수], [나누는수]) => {\nconst 값 = 나뉘는수.값 / 나누는수.값;\nconst 나머지 = 나뉘는수.값 % 나누는수.값;\nconst 몫 = (나뉘는수.값 - 나머지) / 나누는수.값;\nreturn [{type: \"나눔\", 값, 몫, 나머지}];\n};\n}\n\n나누어떨어지다 [동사] 나누어떨어져, 나누어떨어지니\n어느 정수가 어느 정수로 나누어떨어지다:\n앞의 정수를 뒤의 정수로 나누어 그 나머지가 0이 되다. (TODO: \"그\" 생략)\n\n더하다 [동사] 더하여/더해, 더하니\n얼마에 얼마를 더하다:\n얼마와 얼마를 더하다: {\nreturn ([x], [y]) => [{type: \"수\", 값: x.값 + y.값}];\n}\n어느 정수에 어느 정수를 더하다:\n어느 정수와 어느 정수를 더하다: {\nreturn ([x], [y]) => [{type: \"정수\", 값: x.값 + y.값}];\n}\n여러 수를 모두 더하다: {\nreturn (nums) => [nums.reduce((x, y) => ({type: \"수\", 값: x.값 + y.값}))];\n}\n여러 정수를 모두 더하다: {\nreturn (nums) => [nums.reduce((x, y) => ({type: \"정수\", 값: x.값 + y.값}))];\n}\n어느 변수에 얼마를 더해 놓다:\n어느 변수에 얼마를 더해 두다: {\nneeds(\"1 수 변수\", \"1 수\");\nreturn function (box, [num]) {\nbox.data[0].값 += num.값;\nreturn [];\n};\n}\n어느 변수에 어느 정수를 더해 놓다:\n어느 변수에 어느 정수를 더해 두다: {\nneeds(\"1 정수 변수\", \"1 정수\");\nreturn function (box, [num]) {\nbox.data[0].값 += num.값;\nreturn [];\n};\n}\n\n반올림 [명사]\n얼마의 반올림: {\nreturn ([x]) => [{type: \"정수\", 값: Math.round(x.값)}];\n}\n\n배 [명사] -> 곱절\n\n버림 [명사]\n얼마의 버림: {\nreturn ([x]) => [{type: \"정수\", 값: Math.floor(x.값)}];\n}\n\n-분 [접미사]\n얼마분의 얼마:\n뒤의 수를 앞의 수로 나눈 값.\n\n빼다 [동사] 빼어/빼, 빼니\n얼마에서 얼마를 빼다: {\nreturn ([x], [y]) => [{type: \"수\", 값: x.값 - y.값}];\n}\n어느 정수에서 어느 정수를 빼다: {\nreturn ([x], [y]) => [{type: \"정수\", 값: x.값 - y.값}];\n}\n어느 변수에서 어느 수를 빼 놓다:\n어느 변수에서 어느 수를 빼 두다: {\nneeds(\"1 수 변수\", \"1 수\");\nreturn function (box, [num]) {\nbox.data[0].값 -= num.값;\nreturn [];\n};\n}\n어느 변수에서 어느 정수를 빼 놓다:\n어느 변수에서 어느 정수를 빼 두다: {\nneeds(\"1 정수 변수\", \"1 정수\");\nreturn function (box, [num]) {\nbox.data[0].값 -= num.값;\nreturn [];\n};\n}\n\n소수부 [명사]\n얼마의 소수부:\n해당 수를 1로 나눈 나머지.\n\n올림 [명사]\n얼마의 올림: {\nreturn ([x]) => [{type: \"정수\", 값: Math.ceil(x.값)}];\n}\n\n절댓값 [명사]\n얼마의 절댓값: {\nreturn ([x]) => [{type: \"수\", 값: Math.abs(x.값)}];\n}\n어느 정수의 절댓값: {\nreturn ([x]) => [{type: \"정수\", 값: Math.abs(x.값)}];\n}\n\n정수부 [명사]\n얼마의 정수부:\n해당 수에서 해당 수의 소수부를 뺀 정수.\n\n-제곱 [접미사]\n어느 정수의 어느 정수제곱: {\npos(\"명사\");\nreturn function ([x], [y]) {\nif (y.값 < 0) {\nif (x.값 === 0) throw new Error(\"0의 음수 거듭제곱을 시도했습니다.\");\nreturn [{type: \"수\", 값: Math.pow(x.값, y.값)}];\n}\nreturn [{type: \"정수\", 값: Math.pow(x.값, y.값)}];\n}\n}\n얼마의 몇제곱: {\npos(\"명사\");\nreturn function ([x], [y]) {\nif (x.값 === 0 && y.값 < 0) {\nthrow new Error(\"0의 음수 거듭제곱을 시도했습니다.\");\n}\nreturn [{type: \"수\", 값: Math.pow(x.값, y.값)}];\n}\n}\n\n제곱 [명사] -> 두제곱\n\n제곱하다 [동사] 제곱하여/제곱해, 제곱하니\n어느 정수를 제곱하다:\n얼마를 제곱하다:\n앞의 것의 제곱을 구하다.\n\n차 [명사]\n두 수의 차: { // TODO: 찰떡으로 구현\nreturn ([x, y]) => [{type: \"수\", 값: Math.abs(x.값 - y.값)}];\n}\n두 정수의 차: {\nreturn ([x, y]) => [{type: \"정수\", 값: Math.abs(x.값 - y.값)}];\n}\n\n합 [명사]\n여러 수의 합:\n앞의 것을 모두 더한 것.\n\n(\n일반\n)\n\n거짓 [명사]: {\nreturn () => [false];\n}\n참 [명사]: {\nreturn () => [true];\n}\n\n-지 [어미]\n어찌/어떠하지 않다: (아니하다, 않다 정의는 하드코딩됨)\n어찌/어떠하지 아니하다: {\nneeds(\"1 참거짓\");\nreturn ([x]) => [!x];\n}\n\n-거나 [어미]\n어찌하거나 어찌하다:\n어떠하거나 어떠하다:\n{\nneeds(\"1 참거짓\", \"lazy\");\nreturn ([x], y) => (x ? [x] : y);\n}\n\n어찌하고 어찌하다:\n어떠하고 어떠하다:\n{\nneeds(\"1 참거짓\", \"lazy\");\nreturn ([x], y) => (x ? y : [x]);\n}\n\n(\n비교\n)\n\n같다 [형용사] 같아, 같으니\n다르다 [형용사] 달라, 다르니 -> 같지 아니하다\n\n무엇이 무엇이 아니다:\n앞의 것과 뒤의 것이 다르다.\n\n작다 [형용사] 작아, 작으니\n얼마가 얼마보다 작다: {\nreturn ([x], [y]) => [x.값 < y.값];\n}\n얼마가 얼마보다 작거나 같다: {\nreturn ([x], [y]) => [x.값 <= y.값];\n}\n\n크다 [형용사] 커, 크니\n얼마가 얼마보다 크다: {\nreturn ([x], [y]) => [x.값 > y.값];\n}\n얼마가 얼마보다 크거나 같다: {\nreturn ([x], [y]) => [x.값 >= y.값];\n}\n\n이상 [명사]\n얼마가 얼마의/ 이상이다: {\nreturn ([x], [y]) => [x.값 >= y.값];\n}\n\n이하 [명사]\n얼마가 얼마의/ 이하이다: {\nreturn ([x], [y]) => [x.값 <= y.값];\n}\n\n초과 [명사]\n초과하다 [동사] 초과하여/초과해, 초과하니\n넘다 [동사] 넘어, 넘으니\n얼마가 얼마의/ 초과이다:\n얼마가 얼마를 초과하다:\n얼마가 얼마를 넘다: {\nreturn ([x], [y]) => [x.값 > y.값];\n}\n\n미만 [명사]\n얼마가 얼마의/ 미만이다: {\nreturn ([x], [y]) => [x.값 < y.값];\n}\n\n얼마가 얼마의/ 이상 얼마의/ 미만이다: {\nreturn ([x], [lower], [upper]) => [lower.값 <= x.값 && x.값 < upper.값];\n}\n얼마가 얼마의/ 이상 얼마의/ 이하이다: {\nreturn ([x], [lower], [upper]) => [lower.값 <= x.값 && x.값 <= upper.값];\n}\n얼마가 얼마의/ 초과 얼마의/ 미만이다: {\nreturn ([x], [lower], [upper]) => [lower.값 < x.값 && x.값 < upper.값];\n}\n얼마가 얼마의/ 초과 얼마의/ 이하이다: {\nreturn ([x], [lower], [upper]) => [lower.값 < x.값 && x.값 <= upper.값];\n}\n\n무엇이 무엇이 되다:\n앞의 것이 뒤의 것과 같게 되다.\n\n놓다 [동사] 놓아/놔, 놓으니\n두다 [동사] 두어/둬, 두니\n삼다 [동사] 삼아, 삼으니\n하다 [동사] 하여/해, 하니\n무엇이 어느 변수가 되다:\n무엇을 어느 변수로 놓다:\n무엇을 어느 변수로 두다:\n무엇을 어느 변수로 삼다:\n무엇을 어느 변수로 하다:\n무엇을 어느 변수라고 하다:\n{\nneeds(\"any\", \"new\");\nreturn function (values, box) {\n// Don't care NewBox or RefBox. Just overwrite.\nbox.data = values;\nreturn box;\n};\n}\n\n-으면 [어미]\n어찌/어떠하면 무엇 아니면 무엇:\n어찌/어떠하면 어찌하고 아니면 어찌하다:\n어찌/어떠하면 어떠하고 아니면 어떠하다:\n{\nneeds(\"1 참거짓\", \"lazy\", \"lazy\");\nreturn ([condition], truthy, falsy) => (condition ? truthy : falsy);\n}\n\n때 [명사]\n거듭하다 [동사] 거듭하여/거듭해, 거듭하니\n반복하다 [동사] 반복하여/반복해, 반복하니 -> 거듭하다\n어찌/어떠할 때까지 어찌하다:\n어찌/어떠할 때까지 무엇을 거듭하다:\n{\nneeds(\"lazy\", \"lazy\");\nreturn function (condition, action) {\nlet ret = [];\nwhile (true) {\nif (condition.strict()[0]) break;\nret = action.strict();\n}\nreturn ret;\n};\n}\n\n동안 [명사]\n어찌/어떠할 동안 어찌하다:\n어떠한 동안 어찌하다:\n어찌하는 동안 어찌하다:\n{\nneeds(\"lazy\", \"lazy\");\nreturn function (condition, action) {\nlet ret = [];\nwhile (true) {\nif (!condition.strict()[0]) break;\nret = action.strict();\n}\nreturn ret;\n};\n}\n\n(\n여기에서 정의 못하는 단어: (어휘 분석기에 하드코딩)\n- 부사, 수사\n- 품사가 곳에 따라 바뀌는 경우 (아니하다, 않다)\n- 활용이 예외적인 경우 (아니다, 있다, 없다)\n- 조사 `이다`\n)\n(\nTODO:\n- 선어말어미?\n\n무엇의 각 무엇 -> 여럿\n여럿이/을/에/... 각각\n여럿이/을/에/... 모두\n모든 무엇이/을/에/... = 각 무엇이/을/에... 모두\n)\n\n(\n형용사(있다, 없다 포함)는 항상 참거짓 하나이(며 부작용을 포함하지 않는)다.\n동사는 그런 제약이 없다.\n)\n\n것 [명사]\n다음 [명사]\n뒤 [명사]\n몇 [명사] ( TODO )\n무어 [명사] -> 무엇\n무엇 [명사]\n뭐 [명사] -> 무엇\n변수 [명사]\n앞 [명사]\n얼마 [명사] -> 어느 수\n유형 [명사]\n일종 [명사]\n전자 [명사] -> 앞의 것\n후자 [명사] -> 뒤의 것\n\n각 [관형사]\n모든 [관형사]\n여러 [관형사]\n어느 [관형사]\n해당 [관형사]\n\n각각 [부사]\n공히 [부사]\n모두 [부사]\n못 [부사]\n아니 [부사]\n안 [부사] -> 아니\n\n( TODO: 활용형 너무 똑같은데...\n그러다 [동사] 그래, 그러니 -> 그리하다\n그렇다 [형용사] 그래, 그러니 -> 그러하다\n)\n어떠하다 [형용사] 어떠하여/어떠해, 어떠하니\n어떻다 [형용사] 어때, 어떠니/어떻니 -> 어떠하다\n어쩌다 [동사] 어째, 어쩌니 -> 어찌하다\n어찌하다 [동사] 어찌하여/어찌해, 어찌하니\n\n과/와 [조사]\n까지 [조사]\n보다 [조사]\n부터 [조사]\n에 [조사]\n에게 [조사]\n에서 [조사]\n은/는 [조사]\n을/를 [조사]\n의 [조사]\n이/가 [조사]\n이나/나 [조사]\n이라고/라고 [조사]\n\n-ㄴ [어미] 동사, 형용사, 이다 뒤에\n-ㄴ다/는다 [어미] 있다, 없다, 동사 뒤에\n-ㄴ지 [어미] 이다, 형용사 뒤에\n-ㄹ [어미]\n-ㅁ [어미]\n-게 [어미]\n-고 [어미]\n-기 [어미]\n-는 [어미] 있다, 없다, 동사 뒤에\n-는지 [어미] 있다, 없다, 동사 뒤에\n-다 [어미]\n-자 [어미] 동사 뒤에\n-어 [어미]\n-어서 [어미]\n\n그 [관형사] -> 그것의\n그것 [명사]: {\nreturn () => antecedent();\n}\n\n(\n연결\n)\n\n어찌하고 어찌하다:\n{\nneeds(\"any\", \"lazy\")\nreturn (x, y) => y;\n}\n\n(\n어찌하여서 어찌하다:\n어찌한 뒤 어찌하다:\n어찌한 뒤에 어찌하다:\n어찌한 다음 어찌하다:\n어찌한 다음에 어찌하다:\n)\n\n(\n명사 -> 다른 품사\n)\n구하다 [동사] 구하여/구해, 구하니\n대하다 [동사] 대하여/대해, 대하니\n무엇을 구하다:\n무엇에 대하다: {\nneeds(\"any\"); // strict\nreturn (args) => args;\n}\n\n(\n용언 -> 다른 품사\n)\n\n어찌/어떠하기:\n어찌/어떠함: {\npos(\"명사\");\nreturn (args) => args;\n}\n\n되다 [동사] 되어/돼, 되니\n어떠하게 되다: {\nneeds(\"1 참거짓\");\nreturn (args) => args;\n}\n\n어떠한지:\n어찌하는지: {\nneeds(\"1 참거짓\");\npos(\"명사\");\nreturn (args) => args;\n}\n\n(\n시작 [명사]\n끝 [명사]\n길이 [명사]\n범위 [명사]: 시작이 되는 수와 끝이 되는 수가 있는 유형.\n어느 범위의 길이: 해당 범위에 대해 그 시작과 끝의 차.\n\n얼마부터 얼마까지:\n앞의 수를 시작으로 하고 뒤의 수를 끝으로 하는 범위.\n\n-들 [접미사]\n어느 범위의 정수들: ( // returns(\"{n 정수}\"); )\n해당 범위의 시작의 올림을 \"첫수\"라고 할 때,\n\"첫수\"가 해당 범위의 끝보다 크면 빈 수열의 수들,\n아니면 \"첫수\"와 그것보다 하나 많은 수부터 해당 범위의 끝까지의 정수들.\n)\n\n수 [명사]\n실수 [명사] -> 수\n\n정수 [명사]\n어찌한 정수: {\nneeds(\"1 수\");\nreturn function ([num]) {\nif (!Number.isInteger(num.값)) {\nthrow new Error(`${num.값}을 정수로 변환할 수 없습니다.`)\n}\nreturn {type: \"정수\", 값: num.값};\n};\n}\n\n참거짓 [명사]\n";