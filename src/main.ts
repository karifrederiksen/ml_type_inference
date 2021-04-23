import * as AST from "./ast"
import * as P from "./parser"
import * as TC from "./typechecker"
import * as CG from "./codegen"

const exprSrc = `
let id x =
    x
in
let apply (f, x) =
    f x
in
let (a, b) =
    apply (id, (2, True))
in
let f =
    if b then
        fn x -> mul x x
    else if True then
        mul 1
    else
        fn _ -> {- this is a comment -} 0
in
let fact n =
    if eq n 0 then
        1
    else
        mul n (fact (sub n 1))
in
-- this too is a comment
fact a
`

console.log("----- source code -----\n")
console.log(exprSrc.trim())
const pRes = P.parse(exprSrc)

if (!pRes.ok) {
    throw "parsing failed"
}
console.log("\n----- parsed into -----\n")
const expr = pRes.val
console.log(AST.pretty(expr))
const type = TC.typeInference(TC.preludeContext(), expr)
console.log("\n----- type -----\n")
console.log(AST.prettyType(type))
const jsCode = CG.generateJavascript(expr)
console.log("\n----- generated js -----\n")
console.log(jsCode)
console.log("\n----- evaluated -----\n")
console.log(eval(jsCode))
