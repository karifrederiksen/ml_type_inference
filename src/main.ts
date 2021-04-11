import * as AST from "./ast"
import * as P from "./parser"
import * as TC from "./typechecker"

const expr = `

let f = fn x -> x in 
let y = f false in
let z = f () in
z
`
console.log(expr)
const pRes = P.parse(expr)

if (!pRes.ok) {
    throw "parsing failed"
}
const type = TC.typeInference(TC.preludeContext(), pRes.val)
console.log(AST.prettyType(type))

