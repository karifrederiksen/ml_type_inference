import * as AST from "./ast"
import * as P from "./parser"
import * as TC from "./typechecker"
import * as CG from "./codegen"

const expr = `
let id     = fn x -> x in 
let apply  = fn (f, x) -> f x in
let (a, b) = apply (id, (2, true)) in
let f      =
    if b then
        fn x -> mul x x
    else
        mul 1
in
let fact = fn n ->
    if eq n 0 then
        1
    else
        mul n (fact (sub n 1))
in
fact a
`

console.log(expr)
const pRes = P.parse(expr)

if (!pRes.ok) {
    throw "parsing failed"
}
const ast = pRes.val
const type = TC.typeInference(TC.preludeContext(), ast)
console.log(AST.prettyType(type))
const jsCode = CG.generateJavascript(ast)
console.log(jsCode)
console.log(eval(jsCode))
