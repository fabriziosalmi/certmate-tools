/**
 * Tiny DOM-builder helpers — eliminates innerHTML and template-string HTML
 * concatenation from tool render code. Every string interpolation reaches the
 * DOM via createTextNode/setAttribute, so the XSS class is structurally
 * impossible regardless of caller discipline.
 *
 * Keep this module DOM-only (no Astro / no SSR-only APIs) — it ships to the
 * browser as part of each tool script bundle.
 */

export type AttrValue = string | number | boolean | null | undefined;
export type ChildValue = Node | string | number | false | null | undefined | ChildValue[];

/** Create an element with attributes and children. Attributes accept primitives;
 *  `false`/`null`/`undefined` skips the attribute; `true` sets it empty. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, AttrValue> | null,
  ...children: ChildValue[]
): HTMLElementTagNameMap[K];
export function el(
  tag: string,
  attrs?: Record<string, AttrValue> | null,
  ...children: ChildValue[]
): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      node.setAttribute(k, v === true ? "" : String(v));
    }
  }
  appendAll(node, children);
  return node;
}

/** Create an SVG element (separate namespace from HTML). */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, AttrValue> | null,
  ...children: ChildValue[]
): SVGElementTagNameMap[K];
export function svg(
  tag: string,
  attrs?: Record<string, AttrValue> | null,
  ...children: ChildValue[]
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      node.setAttribute(k, v === true ? "" : String(v));
    }
  }
  appendAll(node, children);
  return node;
}

/** Build a DocumentFragment from a flat or nested child list. */
export function frag(...children: ChildValue[]): DocumentFragment {
  const f = document.createDocumentFragment();
  appendAll(f, children);
  return f;
}

/** Plain text node — explicit wrap for clarity in render functions. */
export function text(s: unknown): Text {
  return document.createTextNode(s == null ? "" : String(s));
}

/** Replace the entire content of `host` with `content`. The single safe way
 *  to do the equivalent of an HTML-string assignment from tool code. */
export function mount(host: Element, content: ChildValue): void {
  if (content == null || content === false) {
    host.replaceChildren();
    return;
  }
  if (content instanceof Node) {
    host.replaceChildren(content);
    return;
  }
  if (Array.isArray(content)) {
    host.replaceChildren(...flatten(content));
    return;
  }
  host.replaceChildren(text(content));
}

function appendAll(parent: Node, children: ChildValue[]): void {
  for (const c of flatten(children)) parent.appendChild(c);
}

function flatten(children: ChildValue[]): Node[] {
  const out: Node[] = [];
  const stack: ChildValue[] = [...children];
  while (stack.length) {
    const c = stack.shift();
    if (c == null || c === false) continue;
    if (Array.isArray(c)) stack.unshift(...c);
    else if (c instanceof Node) out.push(c);
    else out.push(text(c));
  }
  return out;
}
