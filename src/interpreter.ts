import { Tree } from "./organizer"

type LiteralNode = number;
type Operator = '+' | 'diff' | '*' | 'square';
type OperationNode = { operator: Operator, operands: ASTNode[] };
type ASTNode = LiteralNode | OperationNode;

class ParseError {

}

function checkUiAndGetChildren(tree: Tree): Tree[] {
    let ui = tree.children[0]
    if (ui.head.lemma != '의' || ui.head.pos != '조사') {
        throw ParseError
    }

    return ui.children;
}

export function treeToAST(tree: Tree): ASTNode {
    switch (tree.head.lemma) {
        case '제곱': {
            let operands = checkUiAndGetChildren(tree)[0];
            return { operator: 'square', operands: [treeToAST(operands)] }
        }
        case '곱': {
            let operands = checkUiAndGetChildren(tree);
            if (operands.length == 0) {
                throw ParseError
            }
            return { operator: '*', operands: operands.map(treeToAST) }
        }
        case '합': {
            let operands = checkUiAndGetChildren(tree);
            if (operands.length == 0) {
                throw ParseError
            }
            return { operator: '+', operands: operands.map(treeToAST) }
        }
        case '차': {
            let operands = checkUiAndGetChildren(tree)
            if (operands.length != 2) {
                throw ParseError
            }
            return { operator: 'diff', operands: operands.map(treeToAST) }
        }
        default:
            let num = parseFloat(tree.head.lemma)
            if (isNaN(num)) {
                throw ParseError
            }

            return num
    }
}

export function run(ast: ASTNode): number {
    if (typeof (ast) == 'number') {
        return ast
    }
    
    switch (ast.operator) {
        case 'square':
            return Math.pow(run(ast.operands[0]), 2)
        case '*':
            return ast.operands.map(run).reduce((a, b) => a * b)
        case '+':
            return ast.operands.map(run).reduce((a, b) => a + b)
        case 'diff':
            return Math.abs(run(ast.operands[0]) - run(ast.operands[1]))
    }
}

