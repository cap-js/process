/** Create fully qualified name: "Service.TypeName" */
export function fqn(qualifier: string, name: string): string {
  return `${qualifier}.${name}`;
}

/** Get the part after the last dot: "a.b.c" → "c" */
export function baseName(name: string): string {
  return splitAtLastDot(name)[1];
}

/** Split at last dot: "a.b.c" → ["a.b", "c"] */
export function splitAtLastDot(name: string): [string, string] {
  const i = name.lastIndexOf('.');
  return i === -1 ? ['', name] : [name.slice(0, i), name.slice(i + 1)];
}

/** Capitalize first letter */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert to safe identifier: "foo-bar" → "foo_bar", "123x" → "_123x" */
export function sanitizeName(name: string): string {
  return String(name)
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1');
}
