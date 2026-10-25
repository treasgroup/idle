// A small checker of data shapes for the engine: the catalog's recipes and ingredients and the saved state. It does
// the part of the «zod» library the engine used (string, number, boolean, enum, array, object, record; min, max, int,
// positive, nonnegative, regex, optional, nullable, default, strict, passthrough, refine; safeParse) with the same
// error codes, so the catalog check in the admin says the same things — and the first page loads ~50 KB less.

export class ZodError extends Error {
  constructor(issues) {
    super("Неверные данные");
    this.issues = issues;
  }
}

const typeOf = (v) =>
  v === undefined ? "undefined" : v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "number" && Number.isNaN(v) ? "nan" : typeof v;

class Schema {
  constructor(kind, def = {}) {
    this.kind = kind;
    this.def = { checks: [], ...def };
  }
  with(extra) {
    const s = Object.create(Object.getPrototypeOf(this));
    s.kind = this.kind;
    s.def = { ...this.def, ...extra };
    return s;
  }
  check(c) {
    return this.with({ checks: [...this.def.checks, c] });
  }
  min(n, message) { return this.check({ k: "min", n, message }); }
  max(n, message) { return this.check({ k: "max", n, message }); }
  int() { return this.check({ k: "int" }); }
  positive() { return this.check({ k: "gt", n: 0 }); }
  nonnegative() { return this.check({ k: "min", n: 0 }); }
  regex(re, message) { return this.check({ k: "regex", re, message: message || "неверный формат" }); }
  url() { return this.check({ k: "regex", re: /^https?:\/\/\S+$/i, message: "неверная ссылка" }); }
  uuid() { return this.check({ k: "regex", re: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message: "неверный номер" }); }
  trim() { return this.with({ trim: true }); }
  optional() { return this.with({ optional: true }); }
  nullable() { return this.with({ nullable: true }); }
  default(v) { return this.with({ hasDefault: true, dflt: v }); }
  refine(fn, message) { return this.check({ k: "refine", fn, message: message || "неверные данные" }); }
  strict() { return this.with({ unknown: "strict" }); }
  passthrough() { return this.with({ unknown: "keep" }); }
  get shape() { return this.def.shape; }

  safeParse(v) {
    const issues = [];
    const data = this.run(v, [], issues);
    return issues.length ? { success: false, error: new ZodError(issues) } : { success: true, data };
  }
  parse(v) {
    const r = this.safeParse(v);
    if (!r.success) throw r.error;
    return r.data;
  }

  run(v, path, issues) {
    const d = this.def;
    if (v === undefined) {
      if (d.hasDefault) v = typeof d.dflt === "object" && d.dflt !== null ? structuredClone(d.dflt) : d.dflt;
      else if (d.optional) return undefined;
    }
    if (v === null && d.nullable) return null;
    // A list's length is checked before its items (and said even when an item is wrong), as the library did.
    if (this.kind === "array" && Array.isArray(v)) {
      for (const c of d.checks) this.apply(c, v, path, issues);
      return this.own(v, path, issues);
    }
    const before = issues.length;
    const out = this.own(v, path, issues);
    if (issues.length > before) return out;
    for (const c of d.checks) this.apply(c, out, path, issues);
    return out;
  }

  apply(c, v, path, issues) {
    const kind = this.kind;
    const size = kind === "string" || kind === "array" ? v.length : v;
    const type = kind === "string" ? "string" : kind === "array" ? "array" : "number";
    if (c.k === "min" && size < c.n) issues.push({ code: "too_small", path, type, minimum: c.n, inclusive: true, message: c.message || "слишком мало" });
    else if (c.k === "gt" && !(size > c.n)) issues.push({ code: "too_small", path, type, minimum: c.n, inclusive: false, message: c.message || "должно быть больше " + c.n });
    else if (c.k === "max" && size > c.n) issues.push({ code: "too_big", path, type, maximum: c.n, inclusive: true, message: c.message || "слишком много" });
    else if (c.k === "int" && !Number.isInteger(v)) issues.push({ code: "invalid_type", path, expected: "integer", received: "float", message: "ожидается целое число" });
    else if (c.k === "regex" && !c.re.test(v)) issues.push({ code: "invalid_string", path, validation: "regex", message: c.message });
    else if (c.k === "refine" && !c.fn(v)) issues.push({ code: "custom", path, message: c.message });
  }

  own(v, path, issues) {
    const bad = (expected) => (issues.push({ code: "invalid_type", path, expected, received: typeOf(v), message: "ожидается " + expected }), v);
    switch (this.kind) {
      case "string": return typeof v === "string" ? (this.def.trim ? v.trim() : v) : bad("string");
      case "number": return typeof v === "number" && !Number.isNaN(v) ? v : bad("number");
      case "boolean": return typeof v === "boolean" ? v : bad("boolean");
      case "enum":
        if (v === undefined) return bad(this.def.values.map((x) => "'" + x + "'").join(" | "));
        if (this.def.values.includes(v)) return v;
        issues.push({ code: "invalid_enum_value", path, received: v, options: this.def.values, message: "значение не из списка" });
        return v;
      case "array": {
        if (!Array.isArray(v)) return bad("array");
        return v.map((x, i) => this.def.item.run(x, [...path, i], issues));
      }
      case "record": {
        if (typeOf(v) !== "object") return bad("object");
        const out = {};
        for (const [k, x] of Object.entries(v)) {
          this.def.key.run(k, [...path, k], issues);
          out[k] = this.def.value.run(x, [...path, k], issues);
        }
        return out;
      }
      case "object": {
        if (typeOf(v) !== "object") return bad("object");
        const shape = this.def.shape;
        const out = {};
        for (const k of Object.keys(shape)) {
          const r = shape[k].run(v[k], [...path, k], issues);
          if (r !== undefined || k in v) out[k] = r;
        }
        const extra = Object.keys(v).filter((k) => !(k in shape));
        if (extra.length && this.def.unknown === "strict") issues.push({ code: "unrecognized_keys", path, keys: extra, message: "лишние поля " + extra.join(", ") });
        if (this.def.unknown === "keep") for (const k of extra) out[k] = v[k];
        return out;
      }
      default: return v;
    }
  }
}

export const z = {
  string: () => new Schema("string"),
  number: () => new Schema("number"),
  boolean: () => new Schema("boolean"),
  enum: (values) => new Schema("enum", { values }),
  array: (item) => new Schema("array", { item }),
  object: (shape) => new Schema("object", { shape }),
  record: (key, value) => (value ? new Schema("record", { key, value }) : new Schema("record", { key: new Schema("string"), value: key })),
  ZodError,
};
