import { OrdMap, OrdSet } from "ordered-collections"
import { Type, Expr, Scheme } from "./ast"
import * as AST from "./ast"

type Substitution = OrdMap<string, Type>

const emptySubst: Substitution = OrdMap.string.empty()

function applySubst(subst: Substitution, ty: Type): Type {
    switch (ty.t) {
        case "tVar":
            return subst.find(ty.v) ?? ty
        case "tFunc":
            return {
                t: "tFunc",
                p: applySubst(subst, ty.p),
                r: applySubst(subst, ty.r),
            }
        case "tTup":
            return { t: "tTup", ts: ty.ts.map((x) => applySubst(subst, x)) }
        default:
            return ty
    }
}

function applySubstScheme(subst: Substitution, sch: Scheme): Scheme {
    return {
        vars: sch.vars,
        t: applySubst(
            sch.vars.foldr((sub, v) => sub.remove(v), subst),
            sch.t,
        ),
    }
}

function composeSubst(s1: Substitution, s2: Substitution): Substitution {
    return s1
        .toArray()
        .map((x) => [x[0], applySubst(s2, x[1])] as const)
        .reduce((sub, x) => sub.insert(x[0], x[1]), s2)
}

const newTyVar: () => Type = (() => {
    let next = 1
    return () => AST.tVar("u" + next++)
})()

function newTyVarPattern(pat: AST.Pattern): Type {
    switch (pat.t) {
        case "pVar":
            return newTyVar()
        case "pTup":
            return AST.tTup(pat.patterns.map(newTyVarPattern))
    }
}

function freeTypeVars(ty: Type): OrdSet<string> {
    switch (ty.t) {
        case "tVar":
            return OrdSet.string.of(ty.v)
        case "tFunc":
            return freeTypeVars(ty.p).union(freeTypeVars(ty.r))
        case "tTup":
            return ty.ts.reduce(
                (cur, next) => cur.union(freeTypeVars(next)),
                OrdSet.string.empty(),
            )
        default:
            return OrdSet.string.empty()
    }
}

function freeTypeVarsScheme(sch: Scheme): OrdSet<string> {
    return sch.vars.except(freeTypeVars(sch.t))
}

function varBind(v: string, ty: Type): Substitution {
    if (freeTypeVars(ty).has(v)) {
        throw "occurs check failed"
    }
    return emptySubst.insert(v, ty)
}

function unify(t1: Type, t2: Type): Substitution {
    if (AST.typeEqual(t1, t2)) {
        return emptySubst
    }
    if (t1.t === "tVar") {
        return varBind(t1.v, t2)
    }
    if (t2.t === "tVar") {
        return varBind(t2.v, t1)
    }
    if (t1.t === "tFunc" && t2.t === "tFunc") {
        const s1 = unify(t1.p, t2.p)
        const s2 = unify(applySubst(s1, t1.r), applySubst(s1, t2.r))
        return composeSubst(s2, s1)
    }
    if (t1.t === "tTup" && t2.t === "tTup" && t1.ts.length === t2.ts.length) {
        return t1.ts.reduce(
            (s, t, i) =>
                composeSubst(
                    s,
                    unify(applySubst(s, t), applySubst(s, t2.ts[i])),
                ),
            emptySubst,
        )
    }
    throw (
        "type mismatch between " +
        AST.prettyType(t1) +
        " and " +
        AST.prettyType(t2)
    )
}

type Context = OrdMap<string, Scheme>

function applySubstCtx(subst: Substitution, ctx: Context): Context {
    const xs = ctx
        .toArray()
        .map((x) => [x[0], applySubstScheme(subst, x[1])] as const)
    return OrdMap.string.from(xs)
}

function freeTypeVarsCtx(ctx: Context): OrdSet<string> {
    return ctx
        .values()
        .reduce(
            (acc, sch) => acc.union(freeTypeVarsScheme(sch)),
            OrdSet.string.empty(),
        )
}

function generalize(ctx: Context, t: Type): Scheme {
    return { vars: freeTypeVars(t).except(freeTypeVarsCtx(ctx)), t }
}

function instantiate(sch: Scheme): Type {
    const newVarsMap = sch.vars.toArray().map((x) => [x, newTyVar()] as const)
    const subst: Substitution = OrdMap.string.from(newVarsMap)
    return applySubst(subst, sch.t)
}

function infer(ctx: Context, exp: Expr): readonly [Substitution, Type] {
    switch (exp.t) {
        case "eBool":
            return [emptySubst, AST.tBool()]
        case "eInt":
            return [emptySubst, AST.tInt()]
        case "eVar": {
            const sch = ctx.find(exp.v)
            if (sch == null) {
                throw "unbound variable: " + exp.v
            }
            return [emptySubst, instantiate(sch)]
        }
        case "eApp": {
            const tyRes = newTyVar()
            const [s1, tyFun] = infer(ctx, exp.f)
            const [s2, tyArg] = infer(applySubstCtx(s1, ctx), exp.a)
            const s3 = unify(applySubst(s2, tyFun), AST.tFunc(tyArg, tyRes))
            return [
                composeSubst(composeSubst(s3, s2), s1),
                applySubst(s3, tyRes),
            ]
        }
        case "eIfElse": {
            const [s1, tyCond] = infer(ctx, exp.cond)
            const s1_ = unify(tyCond, AST.tBool())
            const s2 = composeSubst(s1, s1_)

            const ctx2 = applySubstCtx(s2, ctx)
            const [s3, ty1] = infer(ctx2, exp.caseTrue)
            const [s4, ty2] = infer(ctx2, exp.caseFalse)
            const s5 = unify(ty1, ty2)
            const s = composeSubst(composeSubst(s5, s4), composeSubst(s3, s2))
            return [s, applySubst(s, ty1)]
        }
        case "eLam": {
            const tyBinder = newTyVarPattern(exp.p)
            const tmpCtx = match(ctx, exp.p, {
                vars: OrdSet.string.empty(),
                t: tyBinder,
            })
            const [s1, tyBody] = infer(tmpCtx, exp.r)
            return [s1, AST.tFunc(applySubst(s1, tyBinder), tyBody)]
        }
        case "eLet": {
            const tmpCtx1 = match(
                ctx,
                exp.b,
                generalize(ctx, newTyVarPattern(exp.b)),
            )
            const [s1, tyBinder] = infer(tmpCtx1, exp.be)
            const scheme = generalize(tmpCtx1, applySubst(s1, tyBinder))
            const tmpCtx2 = match(tmpCtx1, exp.b, scheme)
            const [s2, tyBody] = infer(applySubstCtx(s1, tmpCtx2), exp.r)
            return [composeSubst(s2, s1), tyBody]
        }
        case "eTup": {
            const tupRes = exp.es.map((e) => infer(ctx, e))
            const s = tupRes.reduce(
                (cur, [next]) => composeSubst(cur, next),
                emptySubst,
            )
            const t = AST.tTup(tupRes.map(([_, t]) => t))
            return [s, applySubst(s, t)]
        }
    }
}

function match(ctx: Context, pat: AST.Pattern, sch: Scheme): Context {
    switch (pat.t) {
        case "pTup":
            switch (sch.t.t) {
                case "tVar": {
                    throw `what do we do here?`
                }
                case "tTup": {
                    if (pat.patterns.length != sch.t.ts.length) {
                        throw `tuple size mismatch. left is ${pat.patterns.length} while right is ${sch.t.ts.length}`
                    }
                    const ts = sch.t.ts
                    // this is probably wrong... we should be filtering the Scheme's vars I think?
                    return pat.patterns.reduce((c, p, i) => {
                        freeTypeVars(ts[i])
                        return match(c, p, { vars: sch.vars, t: ts[i] })
                    }, ctx)
                }
                default: {
                    throw `expected tuple, found ${AST.prettyScheme(sch)}`
                }
            }
        case "pVar":
            return ctx.insert(pat.var, sch)
    }
}

export function typeInference(ctx: Context, exp: Expr): Type {
    const [s, t] = infer(ctx, exp)
    return applySubst(s, t)
}

export const emptyContext: Context = OrdMap.string.empty()

export function preludeContext(): Context {
    const xxb = {
        vars: OrdSet.string.of("a"),
        t: AST.tFunc(AST.tVar("a"), AST.tFunc(AST.tVar("a"), AST.tBool())),
    }
    const iii = {
        vars: OrdSet.string.empty(),
        t: AST.tFunc(AST.tInt(), AST.tFunc(AST.tInt(), AST.tInt())),
    }
    const xs: readonly (readonly [string, Scheme])[] = [
        ["eq", xxb],
        ["add", iii],
        ["sub", iii],
        ["mul", iii],
    ]
    return OrdMap.string.from(xs)
}
