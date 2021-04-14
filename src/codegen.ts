import * as AST from "./ast"

const PRELUDE = `
const eq = l => r => l === r;
const add = l => r => l + r;
const sub = l => r => l - r;
const mul = l => r => l * r;
`

function generatePattern(e: AST.Pattern): string {
    switch (e.t) {
        case "pVar":
            return e.var
        case "pTup":
            return "[" + e.patterns.map(generatePattern).join(", ") + "]"
    }
}

function toJs(e: AST.Expr): string {
    switch (e.t) {
        case "eVar":
            return e.v
        case "eBool":
            return e.v ? "true" : "false"
        case "eInt":
            return e.v.toString()
        case "eTup":
            return `[${e.es.map(toJs).join(", ")}]`
        case "eIfElse":
            return `${toJs(e.cond)} ? ${toJs(e.caseTrue)} : ${toJs(
                e.caseFalse,
            )}`
        case "eApp":
            return `${toJs(e.f)}(${toJs(e.a)})`
        case "eLam":
            return `((${generatePattern(e.p)}) => ${toJs(e.r)})`
        case "eLet":
            return `(() => {const ${generatePattern(e.b)} = ${toJs(
                e.be,
            )};return ${toJs(e.r)}})()`
    }
}

export function generateJavascript(e: AST.Expr) {
    return `(() => {
${PRELUDE}
return ${toJs(e)};
})()`
}
