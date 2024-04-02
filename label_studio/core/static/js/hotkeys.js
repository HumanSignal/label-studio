/*! hotkeys-js v3.13.5 | MIT © 2024 kenny wong <wowohoo@qq.com> https://jaywcjlove.github.io/hotkeys-js */
!function(e, t) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).hotkeys = t()
}(this, function() {
    "use strict";
    var e = "undefined" != typeof navigator && 0 < navigator.userAgent.toLowerCase().indexOf("firefox");
    function y(e, t, n, o) {
        e.addEventListener ? e.addEventListener(t, n, o) : e.attachEvent && e.attachEvent("on".concat(t), n)
    }
    function i(e, t, n, o) {
        e.removeEventListener ? e.removeEventListener(t, n, o) : e.deachEvent && e.deachEvent("on".concat(t), n)
    }
    function h(t, e) {
        var n = e.slice(0, e.length - 1);
        for (let e = 0; e < n.length; e++)
            n[e] = t[n[e].toLowerCase()];
        return n
    }
    function m(e) {
        var t = (e = (e = "string" != typeof e ? "" : e).replace(/\s/g, "")).split(",");
        let n = t.lastIndexOf("");
        for (; 0 <= n; )
            t[n - 1] += ",",
            t.splice(n, 1),
            n = t.lastIndexOf("");
        return t
    }
    const o = {
        backspace: 8,
        "\u232b": 8,
        tab: 9,
        clear: 12,
        enter: 13,
        "\u21a9": 13,
        return: 13,
        esc: 27,
        escape: 27,
        space: 32,
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        del: 46,
        delete: 46,
        ins: 45,
        insert: 45,
        home: 36,
        end: 35,
        pageup: 33,
        pagedown: 34,
        capslock: 20,
        num_0: 96,
        num_1: 97,
        num_2: 98,
        num_3: 99,
        num_4: 100,
        num_5: 101,
        num_6: 102,
        num_7: 103,
        num_8: 104,
        num_9: 105,
        num_multiply: 106,
        num_add: 107,
        num_enter: 108,
        num_subtract: 109,
        num_decimal: 110,
        num_divide: 111,
        "\u21ea": 20,
        ",": 188,
        ".": 190,
        "/": 191,
        "`": 192,
        "-": e ? 173 : 189,
        "=": e ? 61 : 187,
        ";": e ? 59 : 186,
        "'": 222,
        "[": 219,
        "]": 221,
        "\\": 220
    }
      , k = {
        "\u21e7": 16,
        shift: 16,
        "\u2325": 18,
        alt: 18,
        option: 18,
        "\u2303": 17,
        ctrl: 17,
        control: 17,
        "\u2318": 91,
        cmd: 91,
        command: 91
    }
      , u = {
        16: "shiftKey",
        18: "altKey",
        17: "ctrlKey",
        91: "metaKey",
        shiftKey: 16,
        ctrlKey: 17,
        altKey: 18,
        metaKey: 91
    }
      , g = {
        16: !1,
        18: !1,
        17: !1,
        91: !1
    }
      , v = {};
    for (let e = 1; e < 20; e++)
        o["f".concat(e)] = 111 + e;
    let w = []
      , O = null
      , t = "all";
    const b = new Map
      , E = e=>o[e.toLowerCase()] || k[e.toLowerCase()] || e.toUpperCase().charCodeAt(0);
    function l(e) {
        t = e || "all"
    }
    function K() {
        return t || "all"
    }
    function j(n) {
        if (void 0 === n)
            Object.keys(v).forEach(e=>{
                Array.isArray(v[e]) && v[e].forEach(e=>s(e)),
                delete v[e]
            }
            ),
            c(null);
        else if (Array.isArray(n))
            n.forEach(e=>{
                e.key && s(e)
            }
            );
        else if ("object" == typeof n)
            n.key && s(n);
        else if ("string" == typeof n) {
            for (var o = arguments.length, r = Array(1 < o ? o - 1 : 0), i = 1; i < o; i++)
                r[i - 1] = arguments[i];
            let[e,t] = r;
            "function" == typeof e && (t = e,
            e = ""),
            s({
                key: n,
                scope: e,
                method: t,
                splitKey: "+"
            })
        }
    }
    const s = e=>{
        let {key: t, scope: i, method: l, splitKey: s="+"} = e;
        m(t).forEach(e=>{
            var e = e.split(s)
              , t = e.length
              , n = e[t - 1]
              , n = "*" === n ? "*" : E(n);
            if (v[n]) {
                i = i || K();
                const o = 1 < t ? h(k, e) : []
                  , r = [];
                v[n] = v[n].filter(e=>{
                    var t = (!l || e.method === l) && e.scope === i && function(e, t) {
                        var n = e.length < t.length ? t : e
                          , o = e.length < t.length ? e : t;
                        let r = !0;
                        for (let e = 0; e < n.length; e++)
                            ~o.indexOf(n[e]) || (r = !1);
                        return r
                    }(e.mods, o);
                    return t && r.push(e.element),
                    !t
                }
                ),
                r.forEach(e=>c(e))
            }
        }
        )
    }
    ;
    function x(t, n, o, e) {
        if (n.element === e) {
            let e;
            if (n.scope === o || "all" === n.scope) {
                e = 0 < n.mods.length;
                for (const r in g)
                    Object.prototype.hasOwnProperty.call(g, r) && (!g[r] && ~n.mods.indexOf(+r) || g[r] && !~n.mods.indexOf(+r)) && (e = !1);
                (0 !== n.mods.length || g[16] || g[18] || g[17] || g[91]) && !e && "*" !== n.shortcut || (n.keys = [],
                n.keys = n.keys.concat(w),
                !1 === n.method(t, n) && (t.preventDefault ? t.preventDefault() : t.returnValue = !1,
                t.stopPropagation && t.stopPropagation(),
                t.cancelBubble) && (t.cancelBubble = !0))
            }
        }
    }
    function C(n, t) {
        var o = v["*"];
        let e = n.keyCode || n.which || n.charCode;
        if (L.filter.call(this, n)) {
            if (93 !== e && 224 !== e || (e = 91),
            ~w.indexOf(e) || 229 === e || w.push(e),
            ["ctrlKey", "altKey", "shiftKey", "metaKey"].forEach(e=>{
                var t = u[e];
                n[e] && !~w.indexOf(t) ? w.push(t) : !n[e] && ~w.indexOf(t) ? w.splice(w.indexOf(t), 1) : "metaKey" !== e || !n[e] || 3 !== w.length || n.ctrlKey || n.shiftKey || n.altKey || (w = w.slice(w.indexOf(t)))
            }
            ),
            e in g) {
                g[e] = !0;
                for (const d in k)
                    k[d] === e && (L[d] = !0);
                if (!o)
                    return
            }
            for (const p in g)
                Object.prototype.hasOwnProperty.call(g, p) && (g[p] = n[u[p]]);
            n.getModifierState && (!n.altKey || n.ctrlKey) && n.getModifierState("AltGraph") && (~w.indexOf(17) || w.push(17),
            ~w.indexOf(18) || w.push(18),
            g[17] = !0,
            g[18] = !0);
            var r = K();
            if (o)
                for (let e = 0; e < o.length; e++)
                    o[e].scope === r && ("keydown" === n.type && o[e].keydown || "keyup" === n.type && o[e].keyup) && x(n, o[e], r, t);
            if (e in v) {
                var i = v[e]
                  , l = i.length;
                for (let e = 0; e < l; e++)
                    if (("keydown" === n.type && i[e].keydown || "keyup" === n.type && i[e].keyup) && i[e].key) {
                        var s = i[e]
                          , c = s["splitKey"]
                          , a = s.key.split(c)
                          , f = [];
                        for (let e = 0; e < a.length; e++)
                            f.push(E(a[e]));
                        f.sort().join("") === w.sort().join("") && x(n, s, r, t)
                    }
            }
        }
    }
    function L(e, t, n) {
        w = [];
        var o, r = m(e);
        let i = []
          , l = "all"
          , s = document
          , c = 0
          , a = !1
          , f = !0
          , d = "+"
          , p = !1
          , u = !1;
        for (void 0 === n && "function" == typeof t && (n = t),
        "[object Object]" === Object.prototype.toString.call(t) && (t.scope && (l = t.scope),
        t.element && (s = t.element),
        t.keyup && (a = t.keyup),
        void 0 !== t.keydown && (f = t.keydown),
        void 0 !== t.capture && (p = t.capture),
        "string" == typeof t.splitKey && (d = t.splitKey),
        !0 === t.single) && (u = !0),
        "string" == typeof t && (l = t),
        u && j(e, l); c < r.length; c++)
            e = r[c].split(d),
            i = [],
            1 < e.length && (i = h(k, e)),
            (e = "*" === (e = e[e.length - 1]) ? "*" : E(e))in v || (v[e] = []),
            v[e].push({
                keyup: a,
                keydown: f,
                scope: l,
                mods: i,
                shortcut: r[c],
                method: n,
                key: r[c],
                splitKey: d,
                element: s
            });
        void 0 !== s && window && (b.has(s) || (t = function() {
            return C(0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : window.event, s)
        }
        ,
        o = function() {
            var t = 0 < arguments.length && void 0 !== arguments[0] ? arguments[0] : window.event;
            C(t, s);
            {
                let e = t.keyCode || t.which || t.charCode;
                var n = w.indexOf(e);
                if (n < 0 || w.splice(n, 1),
                t.key && "meta" == t.key.toLowerCase() && w.splice(0, w.length),
                (e = 93 !== e && 224 !== e ? e : 91)in g) {
                    g[e] = !1;
                    for (const o in k)
                        k[o] === e && (L[o] = !1)
                }
            }
        }
        ,
        b.set(s, {
            keydownListener: t,
            keyupListenr: o,
            capture: p
        }),
        y(s, "keydown", t, p),
        y(s, "keyup", o, p)),
        O || (t = ()=>{
            w = []
        }
        ,
        O = {
            listener: t,
            capture: p
        },
        y(window, "focus", t, p)))
    }
    function c(t) {
        var e, n, o, r = Object.values(v).flat();
        r.findIndex(e=>{
            e = e.element;
            return e === t
        }
        ) < 0 && ({keydownListener: o, keyupListenr: n, capture: e} = b.get(t) || {},
        o) && n && (i(t, "keyup", n, e),
        i(t, "keydown", o, e),
        b.delete(t)),
        0 < r.length && 0 < b.size || (Object.keys(b).forEach(e=>{
            var {keydownListener: t, keyupListenr: n, capture: o} = b.get(e) || {};
            t && n && (i(e, "keyup", n, o),
            i(e, "keydown", t, o),
            b.delete(e))
        }
        ),
        b.clear(),
        Object.keys(v).forEach(e=>delete v[e]),
        O && ({listener: n, capture: o} = O,
        i(window, "focus", n, o),
        O = null))
    }
    var n = {
        getPressedKeyString: function() {
            return w.map(e=>{
                return n = e,
                Object.keys(o).find(e=>o[e] === n) || (t = e,
                Object.keys(k).find(e=>k[e] === t)) || String.fromCharCode(e);
                var t, n
            }
            )
        },
        setScope: l,
        getScope: K,
        deleteScope: function(e, t) {
            var n;
            let o;
            e = e || K();
            for (const r in v)
                if (Object.prototype.hasOwnProperty.call(v, r))
                    for (n = v[r],
                    o = 0; o < n.length; )
                        n[o].scope === e ? n.splice(o, 1).forEach(e=>{
                            e = e.element;
                            return c(e)
                        }
                        ) : o++;
            K() === e && l(t || "all")
        },
        getPressedKeyCodes: function() {
            return w.slice(0)
        },
        getAllKeyCodes: function() {
            const r = [];
            return Object.keys(v).forEach(e=>{
                v[e].forEach(e=>{
                    var {key: e, scope: t, mods: n, shortcut: o} = e;
                    r.push({
                        scope: t,
                        shortcut: o,
                        mods: n,
                        keys: e.split("+").map(e=>E(e))
                    })
                }
                )
            }
            ),
            r
        },
        isPressed: function(e) {
            return "string" == typeof e && (e = E(e)),
            !!~w.indexOf(e)
        },
        filter: function(e) {
            var t = (e = e.target || e.srcElement)["tagName"];
            let n = !e.isContentEditable && ("INPUT" !== t && "TEXTAREA" !== t && "SELECT" !== t || e.readOnly) ? !0 : !1;
            return n
        },
        trigger: function(t) {
            let n = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : "all";
            Object.keys(v).forEach(e=>{
                v[e].filter(e=>e.scope === n && e.shortcut === t).forEach(e=>{
                    e && e.method && e.method()
                }
                )
            }
            )
        },
        unbind: j,
        keyMap: o,
        modifier: k,
        modifierMap: u
    };
    for (const r in n)
        Object.prototype.hasOwnProperty.call(n, r) && (L[r] = n[r]);
    if ("undefined" != typeof window) {
        const a = window.hotkeys;
        L.noConflict = e=>(e && window.hotkeys === L && (window.hotkeys = a),
        L),
        window.hotkeys = L
    }
    return L
});
