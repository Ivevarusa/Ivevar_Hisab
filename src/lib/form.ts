/** Small helpers to read FormData safely in server actions. */

export const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
};

export const req = (f: FormData, k: string, name = k) => {
  const v = str(f, k);
  if (!v) throw new FormError(`${name} is required.`);
  return v;
};

export const numOf = (f: FormData, k: string) => {
  const v = str(f, k);
  if (v === undefined) return undefined;
  const n = Number(v.replaceAll(",", ""));
  if (!Number.isFinite(n)) throw new FormError(`${k} must be a number.`);
  return n;
};

export const reqNum = (f: FormData, k: string, name = k) => {
  const n = numOf(f, k);
  if (n === undefined) throw new FormError(`${name} is required.`);
  if (n < 0) throw new FormError(`${name} cannot be negative.`);
  return n;
};

export const dateOf = (f: FormData, k: string) => {
  const v = str(f, k);
  return v ? new Date(`${v}T00:00:00Z`) : undefined;
};

export class FormError extends Error {}

/** Wraps a server action so validation errors come back as a message instead of a crash. */
export function formAction<A extends unknown[]>(fn: (...args: A) => Promise<void>) {
  return async (...args: A): Promise<string | undefined> => {
    try {
      await fn(...args);
    } catch (e) {
      if (e instanceof FormError) return e.message;
      throw e;
    }
  };
}
