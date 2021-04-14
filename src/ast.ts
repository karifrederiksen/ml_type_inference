import { OrdSet } from "ordered-collections"

export type Expr =
    | { readonly t: "eVar"; readonly v: string }
    | { readonly t: "eInt"; readonly v: number }
    | { readonly t: "eBool"; readonly v: boolean }
    | { readonly t: "eApp"; readonly f: Expr; readonly a: Expr }
    | { readonly t: "eLam"; readonly p: Pattern; readonly r: Expr }
    | {
          readonly t: "eLet"
          readonly b: Pattern
          readonly be: Expr
          readonly r: Expr
      }
    | { readonly t: "eTup"; readonly es: readonly Expr[] }
    | {
          readonly t: "eIfElse"
          readonly cond: Expr
          readonly caseTrue: Expr
          readonly caseFalse: Expr
      }

export type Pattern =
    | { readonly t: "pVar"; readonly var: string }
    | { readonly t: "pTup"; readonly patterns: readonly Pattern[] }

export type Type =
    | { readonly t: "tInt" }
    | { readonly t: "tBool" }
    | { readonly t: "tVar"; readonly v: string }
    | { readonly t: "tFunc"; readonly p: Type; readonly r: Type }
    | { readonly t: "tTup"; readonly ts: readonly Type[] }

export type Scheme = { readonly vars: OrdSet<string>; readonly t: Type }

export function eVar(v: string): Expr {
    return { t: "eVar", v }
}

export function eInt(v: number): Expr {
    return { t: "eInt", v }
}

export function eBool(v: boolean): Expr {
    return { t: "eBool", v }
}

export function eApp(f: Expr, a: Expr): Expr {
    return { t: "eApp", f, a }
}

export function eLam(p: Pattern, r: Expr): Expr {
    return { t: "eLam", p, r }
}

export function eLet(b: Pattern, be: Expr, r: Expr): Expr {
    return { t: "eLet", b, be, r }
}

export function eTup(es: readonly Expr[]): Expr {
    return { t: "eTup", es }
}

export function eIfElse(cond: Expr, caseTrue: Expr, caseFalse: Expr): Expr {
    return { t: "eIfElse", cond, caseTrue, caseFalse }
}

export function pVar(v: string): Pattern {
    return { t: "pVar", var: v }
}

export function pTup(patterns: readonly Pattern[]): Pattern {
    return { t: "pTup", patterns }
}

export function isFunc(t: Type): boolean {
    return t.t === "tFunc"
}

export function tInt(): Type {
    return { t: "tInt" }
}

export function tBool(): Type {
    return { t: "tBool" }
}

export function tVar(v: string): Type {
    return { t: "tVar", v }
}

export function tFunc(p: Type, r: Type): Type {
    return { t: "tFunc", p, r }
}

export function tTup(ts: readonly Type[]): Type {
    return { t: "tTup", ts }
}

export function typeEqual(t1: Type, t2: Type): boolean {
    switch (t1.t) {
        case "tBool":
            return t2.t === "tBool"
        case "tInt":
            return t2.t === "tInt"
        case "tVar":
            return t2.t === "tVar" && t1.v === t2.v
        case "tFunc":
            return (
                t2.t === "tFunc" &&
                typeEqual(t1.p, t2.p) &&
                typeEqual(t1.r, t2.r)
            )
        case "tTup":
            return (
                t2.t === "tTup" &&
                t1.ts.length === t2.ts.length &&
                t1.ts.every((t, i) => typeEqual(t, t2.ts[i]))
            )
    }
}

export function prettyType(ty: Type): string {
    switch (ty.t) {
        case "tBool":
            return "Bool"
        case "tInt":
            return "Int"
        case "tVar":
            return ty.v
        case "tFunc":
            return prettyType(ty.p) + " -> " + prettyType(ty.r)
        case "tTup":
            return "(" + ty.ts.map(prettyType).join(", ") + ")"
    }
}

const abc: readonly string[] = "abcdefghjiklmnopqrstuvwxyz".split("")
export function prettyScheme(sch: Scheme): string {
    const vars = sch.vars.toArray().map((v, i) => [v, abc[i]] as const)
    const ty = vars.reduce(renameVar, sch.t)
    return (
        "forall " + vars.map(([_, v]) => v).join(", ") + " => " + prettyType(ty)
    )
}

function renameVar(ty: Type, x: readonly [string, string]): Type {
    const [prev, next] = x
    switch (ty.t) {
        case "tInt":
        case "tBool":
            return ty
        case "tVar":
            return { t: "tVar", v: ty.v == prev ? next : ty.v }
        case "tFunc":
            return { t: "tFunc", p: renameVar(ty.p, x), r: renameVar(ty.r, x) }
        case "tTup":
            return { t: "tTup", ts: ty.ts.map((t) => renameVar(t, x)) }
    }
}

export function prettyPattern(pat: Pattern): string {
    switch (pat.t) {
        case "pVar":
            return pat.var
        case "pTup":
            return "(" + pat.patterns.map(prettyPattern).join(", ") + ")"
    }
}
