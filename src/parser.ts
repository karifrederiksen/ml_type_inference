import * as AST from "./ast"

interface TextStream {
    readonly fullText: string,
    readonly position: number 
}

function streamNext(s: TextStream): [string, TextStream] {
    return [s.fullText[s.position], {fullText: s.fullText, position: s.position + 1 }]
}

function remainingText(s: TextStream): string {
    return s.fullText.slice(s.position)
}

export interface ParserOk<A> {
    readonly ok: true,
    readonly rest: TextStream,
    readonly val: A
}
export interface ParserErr {
    readonly ok: false
}
export type ParserResult<A>
    = ParserOk<A>
    | ParserErr


type Parser<A> = (s: TextStream) => ParserResult<A>

function ok<A>(rest: TextStream, val: A): ParserOk<A> {
    return { ok: true, rest, val }
}

const err: ParserErr = { ok: false }

function pList0<A>(p: Parser<A>): Parser<readonly A[]> {
    return s => {
        const arr: A[] = []
        while(true) {
            const res = p(s)
            if (res.ok) {
                s = res.rest;
                arr.push(res.val)
            } else {
                return ok(s, arr)
            }
        }
    }
}

function pList1<A>(p: Parser<A>): Parser<readonly A[]> {
    return s => {
        const res = pList0(p)(s)
        if (res.ok && res.val.length > 0) {
            return res
        }
        return err
    }
}

function pMap<A, B>(p: Parser<A>, f: (x: A) => B): Parser<B> {
    return s => {
        const res = p(s)
        if (res.ok) {
            return ok(res.rest, f(res.val))
        }
        return err
    }
}

function pFilter<A>(p: Parser<A>, f: (x: A) => boolean): Parser<A> {
    return s => {
        const res = p(s)
        if (res.ok && f(res.val)) {
            return res
        }
        return err
    }
}

function pOneOf<A>(ps: readonly Parser<A>[]): Parser<A> {
    return s => {
        for (const p of ps) {
            const res = p(s)
            if (res.ok) {
                return res
            }
        }
        return err
    }
}

const pDigit: Parser<number> = (s) => {
    const [x, rest] = streamNext(s)
    if (/^\d$/.test(x)) {
        return ok(rest, Number(x))
    }
    return err
}
const pChar: Parser<string> = (s) => {
    const [x, rest] = streamNext(s)
    if (/^[a-z_]$/.test(x)) {
        return ok(rest, x)
    }
    return err
}
const pSpace: Parser<null> = (s) => {
    const [x, rest] = streamNext(s)
    if (x === " " || x === "\t" || x === "\n" || x === "\r") {
        return ok(rest, null)
    }
    return err
}

function pReplace<A>(val: A, p: Parser<unknown>): Parser<A> {
    return s => {
        const res = p(s)
        if (res.ok) {
            return ok(res.rest, val)
        }
        return err
    }
}

function pExact<A extends string>(tag: A): Parser<A> {
    return s => {
        let rest = s;
        for (let i = 0; i < tag.length; i++) {
            const [x, nextRest] = streamNext(rest)
            if (x !== tag[i]) {
                return err
            }
            rest = nextRest
        }
        return ok(rest, tag)
    }
}

function pPrint<A>(tag: string, p: Parser<A>): Parser<A> {
    return s => {
        const r = p(s)
        console.log(tag, r, remainingText(s))
        return r
    }
}

function pSeq<A>(ps: readonly [Parser<A>]): Parser<readonly [A]>
function pSeq<A, B>(ps: readonly [Parser<A>, Parser<B>]): Parser<readonly [A, B]>
function pSeq<A, B, C>(ps: readonly [Parser<A>, Parser<B>, Parser<C>]): Parser<readonly [A, B, C]>
function pSeq<A, B, C, D>(ps: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>]): Parser<readonly [A, B, C, D]>
function pSeq<A, B, C, D, E>(ps: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>, Parser<E>]): Parser<readonly [A, B, C, D, E]>
function pSeq<A, B, C, D, E, F>(ps: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>, Parser<E>, Parser<F>]): Parser<readonly [A, B, C, D, E, F]>
function pSeq<A>(ps: readonly Parser<A>[]): Parser<readonly A[]> {
    return s => {
        const vals: A[] = []
        let rest = s;
        for (const p of ps) {
            const res = p(rest)
            if (!res.ok){
                return err
            }
            rest = res.rest
            vals.push(res.val)
        }
        return ok(rest, vals)
    }
}

function pInterspersed<A>(sep: Parser<unknown>, p: Parser<A>): Parser<readonly A[]> {
    return pOneOf<readonly A[]>([
        pMap(pSeq([
            p,
            pList1(pSeq([sep, p])),
        ]), x => [x[0], ...x[1].map(y => y[1])]),
        pMap(p, x => [x]),
    ])
}

const pInt: Parser<number> = pMap(pList1(pDigit), ns => ns.reduce((sum, n) => sum * 10 + n, 0))

const RESERVED_SYMBOLS: readonly string[] = ["let", "in", "fn", "true", "false"]

const pSymbol: Parser<string> = pFilter(pMap(pList1(pChar), xs => xs.join("")), x => !RESERVED_SYMBOLS.includes(x))

const spaces0: Parser<null> = pMap(pList0(pSpace), _ => null)
const spaces1: Parser<null> = pMap(pList1(pSpace), _ => null)


const pBoolExpr: Parser<AST.Expr> = pMap(pOneOf([
    pReplace(true, pExact("true")),
    pReplace(false, pExact("false")),
]), AST.eBool)
const pIntExpr: Parser<AST.Expr> = pMap(pInt, AST.eInt)
const pVarExpr: Parser<AST.Expr> = pMap(pSymbol, AST.eVar)

const pTupExpr: Parser<AST.Expr> = pMap(pSeq([
    pExact("("),
    pOneOf([
        pMap(pSeq([
            pInterspersed(pSeq([spaces0, pExact(","), spaces0]), pExpr),
            pExact(")"),
        ]), x => AST.eTup(x[0])),
        pMap(pExact(")"), _ => AST.eTup([])),
    ]),
]), x => x[1])

function pLamExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pMap(pSeq([
        pSeq([
            pExact("fn"),
            spaces1,
        ]),
        pSymbol,
        pSeq([
            spaces0,
            pExact("->"),
            spaces0,
        ]),
        pExpr,
    ]), x => AST.eLam(x[1], x[3]))
    
    return p(s)
}

function pLetExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pMap(pSeq([
        pSeq([
            pExact("let"),
            spaces1,
        ]),
        pSymbol,
        pSeq([
            spaces0,
            pExact("="),
            spaces0,
        ]),
        pExpr,
        pSeq([
            spaces1,
            pExact("in"),
            spaces1,
        ]),
        pExpr,
    ]), x => AST.eLet(x[1], x[3], x[5]))
    
    return p(s)
}

function pApplOrVarExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pOneOf<AST.Expr>([
        pBoolExpr,
        pIntExpr,
        pLamExpr,
        pLetExpr,
        pTupExpr,
        pVarExpr,
    ]);
    const p2 = pMap(pInterspersed(spaces1, p), exprs => {
        let e = exprs[0]
        for (let i = 1; i < exprs.length; i++) {
            e = AST.eApp(e, exprs[i])
        }
        return e
    })
    
    return p2(s)
}

function pExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pOneOf<AST.Expr>([
        pBoolExpr,
        pIntExpr,
        pLamExpr,
        pLetExpr,
        pTupExpr,
        pApplOrVarExpr,
    ])
    
    return p(s)
}

export function parse(s: string): ParserResult<AST.Expr> {
    const stream: TextStream = { fullText: s, position: 0 }
    const p = pMap(pSeq([
        spaces0,
        pExpr,
        spaces0,
    ]), x => x[1])
    
    return p(stream)
}