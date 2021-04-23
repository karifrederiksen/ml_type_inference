import * as AST from "./ast"

interface TextStream {
    readonly fullText: string
    readonly position: number
}

function streamNext(s: TextStream): [string, TextStream] {
    return [
        s.fullText[s.position],
        { fullText: s.fullText, position: s.position + 1 },
    ]
}

function remainingText(s: TextStream): string {
    return s.fullText.slice(s.position)
}

export interface ParserOk<A> {
    readonly ok: true
    readonly rest: TextStream
    readonly val: A
}
export interface ParserErr {
    readonly ok: false
}
export type ParserResult<A> = ParserOk<A> | ParserErr

type Parser<A> = (s: TextStream) => ParserResult<A>

function ok<A>(rest: TextStream, val: A): ParserOk<A> {
    return { ok: true, rest, val }
}

const err: ParserErr = { ok: false }

function pList0<A>(p: Parser<A>): Parser<readonly A[]> {
    return (s) => {
        const arr: A[] = []
        while (true) {
            const res = p(s)
            if (res.ok) {
                s = res.rest
                arr.push(res.val)
            } else {
                return ok(s, arr)
            }
        }
    }
}

function pList1<A>(p: Parser<A>): Parser<readonly A[]> {
    return (s) => {
        const res = pList0(p)(s)
        if (res.ok && res.val.length > 0) {
            return res
        }
        return err
    }
}

function pMap<A, B>(p: Parser<A>, f: (x: A) => B): Parser<B> {
    return (s) => {
        const res = p(s)
        if (res.ok) {
            return ok(res.rest, f(res.val))
        }
        return err
    }
}

function pAllowOnly<A>(p: Parser<A>, f: (x: A) => boolean): Parser<A> {
    return (s) => {
        const res = p(s)
        if (res.ok && f(res.val)) {
            return res
        }
        return err
    }
}

function pOneOf<A>(ps: readonly Parser<A>[]): Parser<A> {
    return (s) => {
        for (const p of ps) {
            const res = p(s)
            if (res.ok) {
                return res
            }
        }
        return err
    }
}

function pSucceed<A>(v: A): Parser<A> {
    return (s) => ok(s, v)
}

const pAny: Parser<string> = (s) => {
    const [x, rest] = streamNext(s)
    if (x != "") {
        return ok(rest, x)
    }
    return err
}
const pDigit: Parser<number> = pMap(
    pAllowOnly(pAny, (x) => /^\d$/.test(x)),
    Number,
)
const pChar: Parser<string> = pAllowOnly(pAny, (x) => /^[a-z_]$/.test(x))
const pSpace: Parser<string> = pAllowOnly(pAny, (x) => /^[ \t\n\r]$/.test(x))

function pReplace<A>(val: A, p: Parser<unknown>): Parser<A> {
    return (s) => {
        const res = p(s)
        if (res.ok) {
            return ok(res.rest, val)
        }
        return err
    }
}

function pIgnore(p: Parser<unknown>): Parser<null> {
    return pReplace(null, p)
}

function pExact<A extends string>(tag: A): Parser<A> {
    return (s) => {
        let rest = s
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
    return (s) => {
        const r = p(s)
        console.log(tag, r, remainingText(s))
        return r
    }
}

function pSeq<A>(ps: readonly [Parser<A>]): Parser<readonly [A]>
function pSeq<A, B>(
    ps: readonly [Parser<A>, Parser<B>],
): Parser<readonly [A, B]>
function pSeq<A, B, C>(
    ps: readonly [Parser<A>, Parser<B>, Parser<C>],
): Parser<readonly [A, B, C]>
function pSeq<A, B, C, D>(
    ps: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>],
): Parser<readonly [A, B, C, D]>
function pSeq<A, B, C, D, E>(
    ps: readonly [Parser<A>, Parser<B>, Parser<C>, Parser<D>, Parser<E>],
): Parser<readonly [A, B, C, D, E]>
function pSeq<A, B, C, D, E, F>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
    ],
): Parser<readonly [A, B, C, D, E, F]>
function pSeq<A, B, C, D, E, F, G>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
    ],
): Parser<readonly [A, B, C, D, E, F, G]>
function pSeq<A, B, C, D, E, F, G, H>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H]>
function pSeq<A, B, C, D, E, F, G, H, J>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J]>
function pSeq<A, B, C, D, E, F, G, H, J, K>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
        Parser<K>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J, K]>
function pSeq<A, B, C, D, E, F, G, H, J, K, L>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
        Parser<K>,
        Parser<L>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J, K, L]>
function pSeq<A, B, C, D, E, F, G, H, J, K, L, M>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
        Parser<K>,
        Parser<L>,
        Parser<M>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J, K, L, M]>
function pSeq<A, B, C, D, E, F, G, H, J, K, L, M, N>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
        Parser<K>,
        Parser<L>,
        Parser<M>,
        Parser<N>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J, K, L, M, N]>
function pSeq<A, B, C, D, E, F, G, H, J, K, L, M, N, O>(
    ps: readonly [
        Parser<A>,
        Parser<B>,
        Parser<C>,
        Parser<D>,
        Parser<E>,
        Parser<F>,
        Parser<G>,
        Parser<H>,
        Parser<J>,
        Parser<K>,
        Parser<L>,
        Parser<M>,
        Parser<N>,
        Parser<O>,
    ],
): Parser<readonly [A, B, C, D, E, F, G, H, J, K, L, M, N, O]>
function pSeq<A>(ps: readonly Parser<A>[]): Parser<readonly A[]> {
    return (s) => {
        const vals: A[] = []
        let rest = s
        for (const p of ps) {
            const res = p(rest)
            if (!res.ok) {
                return err
            }
            rest = res.rest
            vals.push(res.val)
        }
        return ok(rest, vals)
    }
}

function pInterspersed<A>(
    sep: Parser<unknown>,
    p: Parser<A>,
): Parser<readonly A[]> {
    return pOneOf<readonly A[]>([
        pMap(pSeq([p, pList1(pSeq([sep, p]))]), (x) => [
            x[0],
            ...x[1].map((y) => y[1]),
        ]),
        pMap(p, (x) => [x]),
    ])
}

const pInt: Parser<number> = pMap(pList1(pDigit), (ns) =>
    ns.reduce((sum, n) => sum * 10 + n, 0),
)

const RESERVED_SYMBOLS: readonly string[] = [
    "let",
    "in",
    "fn",
    "True",
    "False",
    "if",
    "then",
    "else",
]

const pSymbol: Parser<string> = pAllowOnly(
    pMap(pList1(pChar), (xs) => xs.join("")),
    (x) => !RESERVED_SYMBOLS.includes(x),
)

function pLineComment(s: TextStream): ParserResult<unknown> {
    const startP = pExact("--")
    const start = startP(s)
    if (!start.ok) {
        return start
    }
    let rest = start.rest

    const endP = pExact("\n")
    while (rest.position < rest.fullText.length) {
        const end = endP(rest)
        if (end.ok) {
            return end
        }
        rest = streamNext(rest)[1]
    }
    return err
}
function pMultiLineComment(s: TextStream): ParserResult<unknown> {
    const startP = pExact("{-")
    const start = startP(s)
    if (!start.ok) {
        return start
    }
    let rest = start.rest

    const endP = pExact("-}")
    while (rest.position < rest.fullText.length) {
        const end = endP(rest)
        if (end.ok) {
            return end
        }
        rest = streamNext(rest)[1]
    }
    return err
}

const pSpaceOrComment = pOneOf([pSpace, pLineComment, pMultiLineComment])

const pSpaces0: Parser<null> = pIgnore(pList0(pSpaceOrComment))
const pSpaces1: Parser<null> = pIgnore(pList1(pSpaceOrComment))

const pBoolExpr: Parser<AST.Expr> = pMap(
    pOneOf([pReplace(true, pExact("True")), pReplace(false, pExact("False"))]),
    AST.eBool,
)
const pIntExpr: Parser<AST.Expr> = pMap(pInt, AST.eInt)
const pVarExpr: Parser<AST.Expr> = pMap(pSymbol, AST.eVar)

const pTupExpr: Parser<AST.Expr> = pMap(
    pSeq([
        pExact("("),
        pSpaces0,
        pOneOf([
            pInterspersed(pSeq([pSpaces0, pExact(","), pSpaces0]), pExpr),
            pSucceed([]),
        ]),
        pSpaces0,
        pExact(")"),
    ]),
    (x) => {
        const exprs = x[2]
        return exprs.length === 1 ? exprs[0] : AST.eTup(exprs)
    },
)

const pIfElseExpr: Parser<AST.Expr> = pMap(
    pSeq([
        pExact("if"),
        pSpaces1,
        pExpr,
        pSpaces1,
        pExact("then"),
        pSpaces1,
        pExpr,
        pSpaces1,
        pExact("else"),
        pSpaces1,
        pExpr,
    ]),
    (x) => AST.eIfElse(x[2], x[6], x[10]),
)

function pLamExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pMap(
        pSeq([
            pExact("fn"),
            pSpaces1,
            pPattern,
            pSpaces0,
            pExact("->"),
            pSpaces0,
            pExpr,
        ]),
        (x) => AST.eLam(x[2], x[6]),
    )

    return p(s)
}

const pVarPat: Parser<AST.Pattern> = pMap(pSymbol, AST.pVar)
const pTupPat: Parser<AST.Pattern> = pMap(
    pSeq([
        pExact("("),
        pSpaces0,
        pOneOf([
            pInterspersed(pSeq([pSpaces0, pExact(","), pSpaces0]), pPattern),
            pSucceed([]),
        ]),
        pSpaces0,
        pExact(")"),
    ]),
    (x) => {
        const pats = x[2]
        return pats.length === 1 ? pats[0] : AST.pTup(pats)
    },
)

function pPattern(s: TextStream): ParserResult<AST.Pattern> {
    return pOneOf([pVarPat, pTupPat])(s)
}

function pLetExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pMap(
        pSeq([
            pExact("let"),
            pSpaces1,
            pPattern,
            pSpaces0,
            pExact("="),
            pSpaces0,
            pExpr,
            pSpaces1,
            pExact("in"),
            pSpaces1,
            pExpr,
        ]),
        (x) => AST.eLet(x[2], x[6], x[10]),
    )

    return p(s)
}

function pLetFunc(s: TextStream): ParserResult<AST.Expr> {
    const p = pMap(
        pSeq([
            pExact("let"),
            pSpaces1,
            pSymbol,
            pSpaces1,
            pPattern,
            pSpaces0,
            pExact("="),
            pSpaces0,
            pExpr,
            pSpaces1,
            pExact("in"),
            pSpaces1,
            pExpr,
        ]),
        (x) => {
            const id = x[2]
            const pat = x[4]
            const expr = x[8]
            const exprNext = x[12]
            return AST.eLet(AST.pVar(id), AST.eLam(pat, expr), exprNext)
        },
    )

    return p(s)
}
function pApplOrVarExpr(s: TextStream): ParserResult<AST.Expr> {
    const p = pOneOf<AST.Expr>([
        pBoolExpr,
        pIntExpr,
        pLamExpr,
        pLetExpr,
        pLetFunc,
        pTupExpr,
        pVarExpr,
        pIfElseExpr,
    ])
    const p2 = pMap(pInterspersed(pSpaces1, p), (exprs) => {
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
        pIfElseExpr,
        pApplOrVarExpr,
    ])

    return p(s)
}

export function parse(s: string): ParserResult<AST.Expr> {
    const stream: TextStream = { fullText: s, position: 0 }
    const p = pMap(pSeq([pSpaces0, pExpr, pSpaces0]), (x) => x[1])

    return p(stream)
}
