import Se, { createContext as ie, useContext as ue, useMemo as Ee, useState as Y, useCallback as u, useEffect as $, useRef as C, useLayoutEffect as Te } from "react";
import { Amount as H, initializeCoco as Ce } from "@cashu/coco-core";
var K = { exports: {} }, J = {};
var ye;
function ke() {
  if (ye) return J;
  ye = 1;
  var r = /* @__PURE__ */ Symbol.for("react.transitional.element"), e = /* @__PURE__ */ Symbol.for("react.fragment");
  function d(n, s, f) {
    var m = null;
    if (f !== void 0 && (m = "" + f), s.key !== void 0 && (m = "" + s.key), "key" in s) {
      f = {};
      for (var O in s)
        O !== "key" && (f[O] = s[O]);
    } else f = s;
    return s = f.ref, {
      $$typeof: r,
      type: n,
      key: m,
      ref: s !== void 0 ? s : null,
      props: f
    };
  }
  return J.Fragment = e, J.jsx = d, J.jsxs = d, J;
}
var Q = {};
var ge;
function Ae() {
  return ge || (ge = 1, process.env.NODE_ENV !== "production" && (function() {
    function r(t) {
      if (t == null) return null;
      if (typeof t == "function")
        return t.$$typeof === h ? null : t.displayName || t.name || null;
      if (typeof t == "string") return t;
      switch (t) {
        case g:
          return "Fragment";
        case _:
          return "Profiler";
        case E:
          return "StrictMode";
        case U:
          return "Suspense";
        case G:
          return "SuspenseList";
        case P:
          return "Activity";
      }
      if (typeof t == "object")
        switch (typeof t.tag == "number" && console.error(
          "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
        ), t.$$typeof) {
          case i:
            return "Portal";
          case B:
            return t.displayName || "Context";
          case k:
            return (t._context.displayName || "Context") + ".Consumer";
          case A:
            var b = t.render;
            return t = t.displayName, t || (t = b.displayName || b.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
          case W:
            return b = t.displayName || null, b !== null ? b : r(t.type) || "Memo";
          case x:
            b = t._payload, t = t._init;
            try {
              return r(t(b));
            } catch {
            }
        }
      return null;
    }
    function e(t) {
      return "" + t;
    }
    function d(t) {
      try {
        e(t);
        var b = !1;
      } catch {
        b = !0;
      }
      if (b) {
        b = console;
        var T = b.error, M = typeof Symbol == "function" && Symbol.toStringTag && t[Symbol.toStringTag] || t.constructor.name || "Object";
        return T.call(
          b,
          "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
          M
        ), e(t);
      }
    }
    function n(t) {
      if (t === g) return "<>";
      if (typeof t == "object" && t !== null && t.$$typeof === x)
        return "<...>";
      try {
        var b = r(t);
        return b ? "<" + b + ">" : "<...>";
      } catch {
        return "<...>";
      }
    }
    function s() {
      var t = o.A;
      return t === null ? null : t.getOwner();
    }
    function f() {
      return Error("react-stack-top-frame");
    }
    function m(t) {
      if (l.call(t, "key")) {
        var b = Object.getOwnPropertyDescriptor(t, "key").get;
        if (b && b.isReactWarning) return !1;
      }
      return t.key !== void 0;
    }
    function O(t, b) {
      function T() {
        z || (z = !0, console.error(
          "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
          b
        ));
      }
      T.isReactWarning = !0, Object.defineProperty(t, "key", {
        get: T,
        configurable: !0
      });
    }
    function S() {
      var t = r(this.type);
      return D[t] || (D[t] = !0, console.error(
        "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
      )), t = this.props.ref, t !== void 0 ? t : null;
    }
    function y(t, b, T, M, X, ae) {
      var j = T.ref;
      return t = {
        $$typeof: R,
        type: t,
        key: b,
        props: T,
        _owner: M
      }, (j !== void 0 ? j : null) !== null ? Object.defineProperty(t, "ref", {
        enumerable: !1,
        get: S
      }) : Object.defineProperty(t, "ref", { enumerable: !1, value: null }), t._store = {}, Object.defineProperty(t._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: 0
      }), Object.defineProperty(t, "_debugInfo", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: null
      }), Object.defineProperty(t, "_debugStack", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: X
      }), Object.defineProperty(t, "_debugTask", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: ae
      }), Object.freeze && (Object.freeze(t.props), Object.freeze(t)), t;
    }
    function p(t, b, T, M, X, ae) {
      var j = b.children;
      if (j !== void 0)
        if (M)
          if (v(j)) {
            for (M = 0; M < j.length; M++)
              w(j[M]);
            Object.freeze && Object.freeze(j);
          } else
            console.error(
              "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
            );
        else w(j);
      if (l.call(b, "key")) {
        j = r(t);
        var V = Object.keys(b).filter(function(Pe) {
          return Pe !== "key";
        });
        M = 0 < V.length ? "{key: someKey, " + V.join(": ..., ") + ": ...}" : "{key: someKey}", pe[j + M] || (V = 0 < V.length ? "{" + V.join(": ..., ") + ": ...}" : "{}", console.error(
          `A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`,
          M,
          j,
          V,
          j
        ), pe[j + M] = !0);
      }
      if (j = null, T !== void 0 && (d(T), j = "" + T), m(b) && (d(b.key), j = "" + b.key), "key" in b) {
        T = {};
        for (var oe in b)
          oe !== "key" && (T[oe] = b[oe]);
      } else T = b;
      return j && O(
        T,
        typeof t == "function" ? t.displayName || t.name || "Unknown" : t
      ), y(
        t,
        j,
        T,
        s(),
        X,
        ae
      );
    }
    function w(t) {
      c(t) ? t._store && (t._store.validated = 1) : typeof t == "object" && t !== null && t.$$typeof === x && (t._payload.status === "fulfilled" ? c(t._payload.value) && t._payload.value._store && (t._payload.value._store.validated = 1) : t._store && (t._store.validated = 1));
    }
    function c(t) {
      return typeof t == "object" && t !== null && t.$$typeof === R;
    }
    var a = Se, R = /* @__PURE__ */ Symbol.for("react.transitional.element"), i = /* @__PURE__ */ Symbol.for("react.portal"), g = /* @__PURE__ */ Symbol.for("react.fragment"), E = /* @__PURE__ */ Symbol.for("react.strict_mode"), _ = /* @__PURE__ */ Symbol.for("react.profiler"), k = /* @__PURE__ */ Symbol.for("react.consumer"), B = /* @__PURE__ */ Symbol.for("react.context"), A = /* @__PURE__ */ Symbol.for("react.forward_ref"), U = /* @__PURE__ */ Symbol.for("react.suspense"), G = /* @__PURE__ */ Symbol.for("react.suspense_list"), W = /* @__PURE__ */ Symbol.for("react.memo"), x = /* @__PURE__ */ Symbol.for("react.lazy"), P = /* @__PURE__ */ Symbol.for("react.activity"), h = /* @__PURE__ */ Symbol.for("react.client.reference"), o = a.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, l = Object.prototype.hasOwnProperty, v = Array.isArray, N = console.createTask ? console.createTask : function() {
      return null;
    };
    a = {
      react_stack_bottom_frame: function(t) {
        return t();
      }
    };
    var z, D = {}, de = a.react_stack_bottom_frame.bind(
      a,
      f
    )(), fe = N(n(f)), pe = {};
    Q.Fragment = g, Q.jsx = function(t, b, T) {
      var M = 1e4 > o.recentlyCreatedOwnerStacks++;
      return p(
        t,
        b,
        T,
        !1,
        M ? Error("react-stack-top-frame") : de,
        M ? N(n(t)) : fe
      );
    }, Q.jsxs = function(t, b, T) {
      var M = 1e4 > o.recentlyCreatedOwnerStacks++;
      return p(
        t,
        b,
        T,
        !0,
        M ? Error("react-stack-top-frame") : de,
        M ? N(n(t)) : fe
      );
    };
  })()), Q;
}
var me;
function Me() {
  return me || (me = 1, process.env.NODE_ENV === "production" ? K.exports = ke() : K.exports = Ae()), K.exports;
}
var I = Me();
const be = ie({
  manager: null,
  ready: !1,
  error: null,
  waitUntilReady: () => Promise.reject(new Error("Manager not initialized"))
}), ve = () => {
  const r = ue(be);
  if (!r)
    throw new Error(
      "ManagerProvider is missing. Wrap your app in <CocoCashuProvider> or <ManagerProvider>."
    );
  return r;
}, q = () => {
  const { manager: r } = ve();
  if (!r)
    throw new Error(
      "Manager is not ready. Wrap the component tree with <ManagerGate> or check readiness via useManagerContext()."
    );
  return r;
}, er = ({
  children: r,
  fallback: e = null,
  errorFallback: d = null
}) => {
  const { manager: n, ready: s, error: f } = ve();
  return f ? /* @__PURE__ */ I.jsx(I.Fragment, { children: d }) : !s || !n ? /* @__PURE__ */ I.jsx(I.Fragment, { children: e }) : /* @__PURE__ */ I.jsx(I.Fragment, { children: r });
}, je = ({
  manager: r,
  children: e
}) => {
  const d = Ee(
    () => ({
      manager: r,
      ready: !0,
      error: null,
      waitUntilReady: () => Promise.resolve(r)
    }),
    [r]
  );
  return /* @__PURE__ */ I.jsx(be.Provider, { value: d, children: e });
}, le = {
  spendable: H.zero(),
  reserved: H.zero(),
  total: H.zero(),
  unit: "sat"
}, Ie = {
  byMint: {},
  byMintAndUnit: {},
  byUnit: {},
  total: le,
  totalByUnit: {}
}, Be = (r) => {
  const d = Object.values(r)[0]?.unit ?? "sat";
  return Object.values(r).reduce(
    (n, s) => ({
      spendable: n.spendable.add(s.spendable),
      reserved: n.reserved.add(s.reserved),
      total: n.total.add(s.total),
      unit: d
    }),
    { ...le, unit: d }
  );
}, he = (r) => {
  const e = {};
  for (const d of Object.values(r))
    for (const [n, s] of Object.entries(d)) {
      const f = e[n] ?? {
        spendable: H.zero(),
        reserved: H.zero(),
        total: H.zero(),
        unit: n
      };
      f.spendable = f.spendable.add(s.spendable), f.reserved = f.reserved.add(s.reserved), f.total = f.total.add(s.total), e[n] = f;
    }
  return e;
}, Re = (r) => {
  const [e, d] = Y(Ie), n = q(), s = r?.mintUrls?.join("\0") ?? "", f = r?.units?.join("\0") ?? "", m = r?.mintUrls !== void 0, O = r?.units !== void 0, S = r?.trustedOnly, y = u(async () => {
    try {
      const p = m || O || S ? {
        mintUrls: m ? s ? s.split("\0") : [] : void 0,
        units: O ? f ? f.split("\0") : [] : void 0,
        trustedOnly: S
      } : void 0, w = p?.units, c = !w || w.length <= 1, a = await n.wallet.balances.byMintAndUnit(p), R = await n.wallet.balances.totalByUnit?.(p) ?? he(a), i = c ? await n.wallet.balances.byMint(p) : {}, g = c ? Be(i) : le, E = await n.wallet.balances.byUnit?.(p) ?? he(a);
      d({ byMint: i, byMintAndUnit: a, byUnit: E, total: g, totalByUnit: R });
    } catch (p) {
      console.error(p instanceof Error ? p : new Error(String(p)));
    }
  }, [n, m, O, s, S, f]);
  return $(() => (y(), n.on("proofs:saved", y), n.on("proofs:state-changed", y), n.on("mint:updated", y), n.on("proofs:reserved", y), n.on("proofs:released", y), () => {
    n.off("proofs:saved", y), n.off("proofs:state-changed", y), n.off("mint:updated", y), n.off("proofs:reserved", y), n.off("proofs:released", y);
  }), [n, y]), { balances: e, refresh: y };
}, Oe = ie(void 0), rr = () => {
  const r = ue(Oe);
  if (!r)
    throw new Error(
      "BalanceProvider is missing. Wrap your app in <CocoCashuProvider> or <BalanceProvider>."
    );
  return r;
}, Fe = () => {
  const { balances: r } = Re();
  return { balances: r };
}, Ue = ({ children: r }) => /* @__PURE__ */ I.jsx(Oe.Provider, { value: Fe(), children: r }), xe = ie(void 0), Ne = () => {
  const r = ue(xe);
  if (!r)
    throw new Error(
      "MintProvider is missing. Wrap your app in <CocoCashuProvider> or <MintProvider>."
    );
  return r;
}, tr = () => {
  const { trustedMints: r, trustMint: e, untrustMint: d, isTrustedMint: n } = Ne();
  return { mints: r, trustMint: e, untrustMint: d, isTrustedMint: n };
}, ze = () => {
  const [r, e] = Y([]), [d, n] = Y([]), s = q(), f = u(async () => {
    try {
      const p = await s.mint.getAllMints();
      e(p), n(p.filter((w) => w.trusted));
    } catch (p) {
      console.error(p);
    }
  }, [s]);
  $(() => (f(), s.on("mint:added", f), s.on("mint:updated", f), () => {
    s.off("mint:added", f), s.off("mint:updated", f);
  }), [s, f]);
  const m = u(
    async (p, w) => {
      await s.mint.addMint(p, w);
    },
    [s]
  ), O = u(
    async (p) => {
      await s.mint.trustMint(p);
    },
    [s]
  ), S = u(
    async (p) => {
      await s.mint.untrustMint(p);
    },
    [s]
  ), y = u(
    async (p) => s.mint.isTrustedMint(p),
    [s]
  );
  return {
    mints: r,
    trustedMints: d,
    addNewMint: m,
    trustMint: O,
    untrustMint: S,
    isTrustedMint: y
  };
}, $e = ({ children: r }) => /* @__PURE__ */ I.jsx(xe.Provider, { value: ze(), children: r }), _e = ({
  manager: r,
  children: e
}) => /* @__PURE__ */ I.jsx(je, { manager: r, children: /* @__PURE__ */ I.jsx($e, { children: /* @__PURE__ */ I.jsx(Ue, { children: e }) }) }), Ye = (r, e) => typeof e == "function" ? e(r) : e, Le = (r) => r instanceof Error ? r : new Error(String(r)), we = async (r) => {
  await r.dispose();
}, De = ({
  config: r,
  children: e,
  fallback: d = null,
  errorFallback: n = null
}) => {
  const s = C(r), f = C(null), m = C(null), O = C(0), [S, y] = Y(null), [p, w] = Y(null);
  return $(() => {
    const c = O.current + 1;
    O.current = c;
    let a = !1;
    const R = f.current ?? Ce(s.current);
    return f.current = R, R.then((i) => {
      !a && O.current === c && (m.current = i, y(i), w(null));
    }).catch((i) => {
      !a && O.current === c && (y(null), w(Le(i)));
    }), () => {
      a = !0, Promise.resolve().then(() => {
        if (O.current !== c) return;
        const i = m.current;
        if (m.current = null, i) {
          we(i).catch(() => {
          });
          return;
        }
        R.then((g) => {
          O.current === c && we(g).catch(() => {
          });
        }).catch(() => {
        });
      });
    };
  }, []), p ? /* @__PURE__ */ I.jsx(I.Fragment, { children: Ye(p, n) }) : S ? /* @__PURE__ */ I.jsx(_e, { manager: S, children: e }) : /* @__PURE__ */ I.jsx(I.Fragment, { children: d });
}, nr = (r) => r.manager !== void 0 ? /* @__PURE__ */ I.jsx(_e, { manager: r.manager, children: r.children }) : /* @__PURE__ */ I.jsx(
  De,
  {
    config: r.config,
    fallback: r.fallback,
    errorFallback: r.errorFallback,
    children: r.children
  }
), sr = (r = 100) => {
  const [e, d] = Y([]), [n, s] = Y(!1), f = q(), m = C(0), O = C(!0), S = C("infinite"), y = C(!0), p = C(!1), w = (E) => {
    p.current = E, s(E);
  };
  $(() => () => {
    y.current = !1;
  }, []);
  const c = u(
    async (E) => {
      try {
        return await f.history.getPaginatedHistory(E, r) || [];
      } catch (_) {
        return console.error(_), [];
      }
    },
    [f, r]
  ), a = u(async () => {
    if (!p.current) {
      w(!0);
      try {
        if (S.current === "infinite" && m.current === 0) {
          const E = await c(0);
          if (!y.current) return;
          d((_) => {
            const k = _.filter((B) => !E.some((A) => A.id === B.id));
            return [...E, ...k];
          });
        } else {
          const E = await c(m.current);
          if (!y.current) return;
          d(E);
        }
      } finally {
        w(!1);
      }
    }
  }, [c]), R = C(async () => {
  });
  $(() => {
    R.current = a;
  }, [a]), $(() => {
    const E = () => {
      R.current();
    };
    return f.on("history:updated", E), () => {
      f.off("history:updated", E);
    };
  }, [f]), $(() => {
    let E = !1;
    return (async () => {
      if (p.current) return;
      w(!0), S.current = "infinite", m.current = 0;
      const _ = await c(0);
      O.current = _.length === r, !E && y.current && d(_), w(!1);
    })(), () => {
      E = !0;
    };
  }, [c, r]);
  const i = u(async () => {
    if (!O.current || p.current) return;
    w(!0), S.current = "infinite";
    const E = m.current + r, _ = await c(E);
    O.current = _.length === r, y.current && (d((k) => {
      const B = /* @__PURE__ */ new Set(), A = [];
      for (const U of [...k, ..._])
        B.has(U.id) || (B.add(U.id), A.push(U));
      return A;
    }), m.current = E), w(!1);
  }, [c, r]), g = u(
    async (E) => {
      const _ = E * r;
      if (p.current) return;
      w(!0), S.current = "page";
      const k = await c(_);
      O.current = k.length === r, y.current && (d(k), m.current = _), w(!1);
    },
    [c, r]
  );
  return Ee(
    () => ({
      history: e,
      loadMore: i,
      goToPage: g,
      refresh: a,
      hasMore: O.current,
      isFetching: n
    }),
    [e, i, g, a, n]
  );
};
function Ge(r) {
  return r instanceof Error ? r : new Error(String(r));
}
function Z(r) {
  return r && typeof r != "string" ? r : null;
}
function ee(r) {
  return typeof r == "string" ? r : r?.id ?? null;
}
function re(r, e) {
  $(() => {
    typeof r == "string" && e(r).catch(() => {
    });
  }, [r, e]);
}
function F(r, e) {
  if (r)
    return r.id;
  throw new Error(
    `No current operation available for ${e}. Initialize the hook with an operation first or create one before calling ${e}.`
  );
}
function te(r, e) {
  if (r)
    throw new Error(
      `Cannot call ${e} while this hook is bound to operation ${r}. Remount the hook with a new React key or call reset() first.`
    );
}
async function L(r, e) {
  const d = await r(e);
  if (!d)
    throw new Error(`Operation ${e} not found`);
  return d;
}
function ne(r, e) {
  return !r || r.id !== e.id ? !0 : e.updatedAt >= r.updatedAt;
}
function se(r = null) {
  const [e, d] = Y(r), [n, s] = Y(null), [f, m] = Y("idle"), [O, S] = Y(null), y = C(!0), p = C(!1), w = C(r), c = C(0);
  Te(() => (y.current = !0, () => {
    y.current = !1;
  }), []);
  const a = u(
    (_, k = {}) => {
      y.current && (w.current = _, d(_), k.clearExecuteResult && s(null));
    },
    []
  ), R = u((_) => {
    y.current && s(_);
  }, []), i = u(() => w.current, []), g = u(
    async (_, k) => {
      if (p.current)
        throw new Error("Operation already in progress");
      p.current = !0;
      const B = c.current;
      y.current && (m("loading"), S(null));
      try {
        const A = await _();
        return k && B === c.current && await k(A), y.current && B === c.current && m("success"), A;
      } catch (A) {
        const U = Ge(A);
        throw y.current && B === c.current && (S(U), m("error")), U;
      } finally {
        p.current = !1;
      }
    },
    []
  ), E = u(() => {
    y.current && (c.current += 1, w.current = null, d(null), s(null), m("idle"), S(null));
  }, []);
  return {
    currentOperation: e,
    executeResult: n,
    status: f,
    error: O,
    isLoading: f === "loading",
    isError: f === "error",
    replaceCurrentOperation: a,
    replaceExecuteResult: R,
    getCurrentOperation: i,
    runStatefulAction: g,
    reset: E
  };
}
function ar(r) {
  const e = q(), d = C(r), n = C(
    ee(d.current)
  ), {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    replaceCurrentOperation: p,
    replaceExecuteResult: w,
    getCurrentOperation: c,
    runStatefulAction: a,
    reset: R
  } = se(
    Z(d.current)
  ), i = u(
    (h, o) => {
      if (!h) {
        n.current = null, p(null, o);
        return;
      }
      n.current && n.current !== h.id || ne(c(), h) && (n.current = h.id, p(h, o));
    },
    [c, p]
  ), g = u(
    (h) => {
      h.id === n.current && i(h);
    },
    [i]
  ), E = u(
    async (h) => {
      try {
        await a(
          async () => L((o) => e.ops.send.get(o), h),
          async (o) => {
            n.current === h && i(o, { clearExecuteResult: !0 });
          }
        );
      } catch (o) {
        throw n.current === h && !c() && (n.current = null), o;
      }
    },
    [i, c, e, a]
  );
  re(d.current, E), $(() => {
    const h = e.on("send:prepared", ({ operation: N }) => {
      g(N);
    }), o = e.on("send:pending", ({ operation: N }) => {
      g(N);
    }), l = e.on("send:finalized", ({ operation: N }) => {
      g(N);
    }), v = e.on("send:rolled-back", ({ operation: N }) => {
      g(N);
    });
    return () => {
      h(), o(), l(), v();
    };
  }, [g, e]);
  const _ = u(
    async (h) => (te(n.current, "prepare"), a(
      async () => e.ops.send.prepare(h),
      async (o) => {
        i(o, { clearExecuteResult: !0 });
      }
    )),
    [i, e, a]
  ), k = u(async () => {
    const h = F(c(), "refresh");
    return a(
      async () => e.ops.send.refresh(h),
      async (o) => {
        i(o);
      }
    );
  }, [i, c, e, a]), B = u(async () => {
    const h = F(c(), "execute");
    return a(
      async () => e.ops.send.execute(h),
      async (o) => {
        i(o.operation), w(o);
      }
    );
  }, [i, c, e, w, a]), A = u(async () => {
    const h = F(c(), "cancel");
    await a(
      async () => (await e.ops.send.cancel(h), L((o) => e.ops.send.get(o), h)),
      async (o) => {
        i(o, { clearExecuteResult: !0 });
      }
    );
  }, [i, c, e, a]), U = u(async () => {
    const h = F(c(), "reclaim");
    await a(
      async () => (await e.ops.send.reclaim(h), L((o) => e.ops.send.get(o), h)),
      async (o) => {
        i(o, { clearExecuteResult: !0 });
      }
    );
  }, [i, c, e, a]), G = u(async () => {
    const h = F(c(), "finalize");
    await a(
      async () => (await e.ops.send.finalize(h), L((o) => e.ops.send.get(o), h)),
      async (o) => {
        i(o);
      }
    );
  }, [i, c, e, a]), W = u(async () => e.ops.send.listPrepared(), [e]), x = u(async () => e.ops.send.listInFlight(), [e]), P = u(() => {
    n.current = null, R();
  }, [R]);
  return {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    prepare: _,
    refresh: k,
    execute: B,
    cancel: A,
    reclaim: U,
    finalize: G,
    listPrepared: W,
    listInFlight: x,
    reset: P
  };
}
function or(r) {
  const e = q(), d = C(r), n = C(
    ee(d.current)
  ), {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    replaceCurrentOperation: p,
    replaceExecuteResult: w,
    getCurrentOperation: c,
    runStatefulAction: a,
    reset: R
  } = se(
    Z(d.current)
  ), i = u(
    (x, P) => {
      if (!x) {
        n.current = null, p(null, P);
        return;
      }
      n.current && n.current !== x.id || ne(c(), x) && (n.current = x.id, p(x, P));
    },
    [c, p]
  ), g = u(
    (x) => {
      x.id === n.current && i(x);
    },
    [i]
  ), E = u(
    async (x) => {
      try {
        await a(
          async () => L((P) => e.ops.receive.get(P), x),
          async (P) => {
            n.current === x && i(P, { clearExecuteResult: !0 });
          }
        );
      } catch (P) {
        throw n.current === x && !c() && (n.current = null), P;
      }
    },
    [i, c, e, a]
  );
  re(d.current, E), $(() => {
    const x = e.on("receive-op:prepared", ({ operation: o }) => {
      g(o);
    }), P = e.on("receive-op:finalized", ({ operation: o }) => {
      g(o);
    }), h = e.on("receive-op:rolled-back", ({ operation: o }) => {
      g(o);
    });
    return () => {
      x(), P(), h();
    };
  }, [g, e]);
  const _ = u(
    async (x) => (te(n.current, "prepare"), a(
      async () => e.ops.receive.prepare(x),
      async (P) => {
        i(P, { clearExecuteResult: !0 });
      }
    )),
    [i, e, a]
  ), k = u(async () => {
    const x = F(c(), "refresh");
    return a(
      async () => e.ops.receive.refresh(x),
      async (P) => {
        i(P);
      }
    );
  }, [i, c, e, a]), B = u(async () => {
    const x = F(c(), "execute");
    return a(
      async () => e.ops.receive.execute(x),
      async (P) => {
        i(P), w(P);
      }
    );
  }, [i, c, e, w, a]), A = u(async () => {
    const x = c(), P = F(x, "cancel");
    await a(
      async () => (await e.ops.receive.cancel(P), {
        operationBeforeCancel: x,
        operationAfterCancel: await e.ops.receive.get(P)
      }),
      async ({ operationBeforeCancel: h, operationAfterCancel: o }) => {
        if (o) {
          i(o, { clearExecuteResult: !0 });
          return;
        }
        if (h?.state === "init") {
          i(null, { clearExecuteResult: !0 });
          return;
        }
        throw new Error(`Operation ${P} not found`);
      }
    );
  }, [i, c, e, a]), U = u(async () => e.ops.receive.listPrepared(), [e]), G = u(async () => e.ops.receive.listInFlight(), [e]), W = u(() => {
    n.current = null, R();
  }, [R]);
  return {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    prepare: _,
    refresh: k,
    execute: B,
    cancel: A,
    listPrepared: U,
    listInFlight: G,
    reset: W
  };
}
function cr(r) {
  const e = q(), d = C(r), n = Z(d.current), s = C(
    ee(d.current)
  ), {
    currentOperation: f,
    executeResult: m,
    status: O,
    error: S,
    isLoading: y,
    isError: p,
    replaceCurrentOperation: w,
    replaceExecuteResult: c,
    getCurrentOperation: a,
    runStatefulAction: R,
    reset: i
  } = se(n), g = u(
    (o, l) => {
      if (!o) {
        s.current = null, w(null, l);
        return;
      }
      s.current && s.current !== o.id || ne(a(), o) && (s.current = o.id, w(o, l));
    },
    [a, w]
  ), E = u(
    (o) => {
      o.id === s.current && g(o);
    },
    [g]
  ), _ = u(
    async (o) => {
      try {
        await R(
          async () => L((l) => e.ops.mint.get(l), o),
          async (l) => {
            s.current === o && g(l, { clearExecuteResult: !0 });
          }
        );
      } catch (l) {
        throw s.current === o && !a() && (s.current = null), l;
      }
    },
    [g, a, e, R]
  );
  re(d.current, _), $(() => {
    const o = e.on("mint-op:pending", ({ operation: z }) => {
      E(z);
    }), l = e.on("mint-op:executing", ({ operation: z }) => {
      E(z);
    }), v = e.on("mint-op:finalized", ({ operation: z }) => {
      E(z);
    }), N = e.on("mint-op:failed", ({ operation: z }) => {
      E(z);
    });
    return () => {
      o(), l(), v(), N();
    };
  }, [E, e]);
  const k = u(
    async (o) => (te(s.current, "prepare"), R(
      async () => e.ops.mint.prepare(o),
      async (l) => {
        g(l, { clearExecuteResult: !0 });
      }
    )),
    [g, e, R]
  ), B = u(async () => {
    const o = F(a(), "refresh");
    return R(
      async () => e.ops.mint.refresh(o),
      async (l) => {
        g(l);
      }
    );
  }, [g, a, e, R]), A = u(async () => {
    const o = F(a(), "execute");
    return R(
      async () => e.ops.mint.execute(o),
      async (l) => {
        g(l), c(l);
      }
    );
  }, [g, a, e, c, R]), U = u(async () => {
    const o = F(a(), "checkPayment");
    return R(
      async () => e.ops.mint.checkPayment(o),
      async () => {
        const l = await L(
          (v) => e.ops.mint.get(v),
          o
        );
        g(l);
      }
    );
  }, [g, a, e, R]), G = u(async () => {
    const o = F(a(), "finalize");
    return R(
      async () => e.ops.mint.finalize(o),
      async (l) => {
        g(l);
      }
    );
  }, [g, a, e, R]), W = u(
    async (o) => e.ops.mint.listByQuote(o),
    [e]
  ), x = u(async () => e.ops.mint.listPending(), [e]), P = u(async () => e.ops.mint.listInFlight(), [e]), h = u(() => {
    s.current = null, i();
  }, [i]);
  return {
    currentOperation: f,
    executeResult: m,
    status: O,
    error: S,
    isLoading: y,
    isError: p,
    prepare: k,
    refresh: B,
    execute: A,
    checkPayment: U,
    finalize: G,
    listByQuote: W,
    listPending: x,
    listInFlight: P,
    reset: h
  };
}
function ir(r) {
  const e = q(), d = C(r), n = C(
    ee(d.current)
  ), {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    replaceCurrentOperation: p,
    replaceExecuteResult: w,
    getCurrentOperation: c,
    runStatefulAction: a,
    reset: R
  } = se(
    Z(d.current)
  ), i = u(
    (l, v) => {
      if (!l) {
        n.current = null, p(null, v);
        return;
      }
      n.current && n.current !== l.id || ne(c(), l) && (n.current = l.id, p(l, v));
    },
    [c, p]
  ), g = u(
    (l) => {
      l.id === n.current && i(l);
    },
    [i]
  ), E = u(
    async (l) => {
      try {
        await a(
          async () => L((v) => e.ops.melt.get(v), l),
          async (v) => {
            n.current === l && i(v, { clearExecuteResult: !0 });
          }
        );
      } catch (v) {
        throw n.current === l && !c() && (n.current = null), v;
      }
    },
    [i, c, e, a]
  );
  re(d.current, E), $(() => {
    const l = e.on("melt-op:prepared", ({ operation: D }) => {
      g(D);
    }), v = e.on("melt-op:pending", ({ operation: D }) => {
      g(D);
    }), N = e.on("melt-op:finalized", ({ operation: D }) => {
      g(D);
    }), z = e.on("melt-op:rolled-back", ({ operation: D }) => {
      g(D);
    });
    return () => {
      l(), v(), N(), z();
    };
  }, [g, e]);
  const _ = u(
    async (l) => (te(n.current, "prepare"), a(
      async () => e.ops.melt.prepare(l),
      async (v) => {
        i(v, { clearExecuteResult: !0 });
      }
    )),
    [i, e, a]
  ), k = u(async () => {
    const l = F(c(), "refresh");
    return a(
      async () => e.ops.melt.refresh(l),
      async (v) => {
        i(v);
      }
    );
  }, [i, c, e, a]), B = u(async () => {
    const l = F(c(), "execute");
    return a(
      async () => e.ops.melt.execute(l),
      async (v) => {
        i(v), w(v);
      }
    );
  }, [i, c, e, w, a]), A = u(async () => {
    const l = F(c(), "cancel");
    await a(
      async () => (await e.ops.melt.cancel(l), L((v) => e.ops.melt.get(v), l)),
      async (v) => {
        i(v, { clearExecuteResult: !0 });
      }
    );
  }, [i, c, e, a]), U = u(async () => {
    const l = F(c(), "reclaim");
    await a(
      async () => (await e.ops.melt.reclaim(l), L((v) => e.ops.melt.get(v), l)),
      async (v) => {
        i(v, { clearExecuteResult: !0 });
      }
    );
  }, [i, c, e, a]), G = u(async () => {
    const l = F(c(), "finalize");
    await a(
      async () => (await e.ops.melt.finalize(l), L((v) => e.ops.melt.get(v), l)),
      async (v) => {
        i(v);
      }
    );
  }, [i, c, e, a]), W = u(
    async (l) => e.ops.melt.getByQuote(l),
    [e]
  ), x = u(
    async (l) => e.ops.melt.listByQuote(l),
    [e]
  ), P = u(async () => e.ops.melt.listPrepared(), [e]), h = u(async () => e.ops.melt.listInFlight(), [e]), o = u(() => {
    n.current = null, R();
  }, [R]);
  return {
    currentOperation: s,
    executeResult: f,
    status: m,
    error: O,
    isLoading: S,
    isError: y,
    prepare: _,
    refresh: k,
    execute: B,
    cancel: A,
    reclaim: U,
    finalize: G,
    getByQuote: W,
    listByQuote: x,
    listPrepared: P,
    listInFlight: h,
    reset: o
  };
}
const We = { trustedOnly: !0 }, ur = () => Re(We), qe = "COCO_REACT_SEED", ce = 64, Ve = "cashu:coco-react:local-storage-seed:", He = () => {
  if (typeof window > "u")
    throw new Error("localStorageSeedGetter requires a browser window.");
  if (!window.localStorage)
    throw new Error("localStorageSeedGetter requires window.localStorage.");
  if (!window.crypto?.getRandomValues)
    throw new Error("localStorageSeedGetter requires window.crypto.getRandomValues.");
  if (!window.navigator?.locks)
    throw new Error("localStorageSeedGetter requires window.navigator.locks.");
  return window;
}, Je = (r, e) => {
  let d = "";
  for (const n of r)
    d += String.fromCharCode(n);
  return e.btoa(d);
}, Qe = (r, e) => {
  const d = e.atob(r), n = new Uint8Array(d.length);
  for (let s = 0; s < d.length; s += 1)
    n[s] = d.charCodeAt(s);
  if (n.length !== ce)
    throw new Error(
      `localStorageSeedGetter expected a ${ce}-byte seed in localStorage.`
    );
  return n;
}, Xe = (r) => {
  const e = new Uint8Array(ce);
  return r.crypto.getRandomValues(e), e;
}, lr = (r = {}) => {
  const e = r.storageKey ?? qe, d = `${Ve}${e}`;
  let n = null;
  return async () => {
    if (n)
      return new Uint8Array(n);
    const s = He();
    return s.navigator.locks.request(d, async () => {
      if (n)
        return new Uint8Array(n);
      const f = s.localStorage.getItem(e);
      if (f)
        return n = Qe(f, s), new Uint8Array(n);
      const m = Xe(s);
      return s.localStorage.setItem(e, Je(m, s)), n = m, new Uint8Array(m);
    });
  };
};
export {
  Oe as BalanceCtx,
  Ue as BalanceProvider,
  nr as CocoCashuProvider,
  be as ManagerCtx,
  er as ManagerGate,
  je as ManagerProvider,
  xe as MintCtx,
  $e as MintProvider,
  lr as localStorageSeedGetter,
  rr as useBalanceContext,
  Re as useBalances,
  q as useManager,
  ve as useManagerContext,
  ir as useMeltOperation,
  cr as useMintOperation,
  Ne as useMints,
  sr as usePaginatedHistory,
  or as useReceiveOperation,
  ar as useSendOperation,
  ur as useTrustedBalance,
  tr as useTrustedMints
};
