import * as AST from "./ast"
import * as P from "./parser"
import * as TC from "./typechecker"

const expr = `

let id     = fn x -> x in 
let apply  = fn (f, x) -> f x in
let (a, b) = apply (id, (2, true)) in
(a, b)
`
console.log(expr)
const pRes = P.parse(expr)

if (!pRes.ok) {
    throw "parsing failed"
}
const type = TC.typeInference(TC.preludeContext(), pRes.val)
console.log(AST.prettyType(type))

