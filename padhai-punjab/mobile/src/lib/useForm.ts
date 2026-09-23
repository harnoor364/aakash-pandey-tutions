import { useState } from 'react';
import { ApiError } from './api';

/** Small form helper: values, per-field errors, and mapping server errors onto fields. */
export function useForm<V extends Record<string, any>>(initial: V) {
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof V | string, string>>>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof V>(k: K, v: V[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  /** Run client checks; returns true when valid. */
  const validate = (rules: [keyof V | string, boolean, string][]) => {
    const next: Record<string, string> = {};
    rules.forEach(([k, bad, msg]) => { if (bad && !next[k as string]) next[k as string] = msg; });
    setErrors(next as any);
    return Object.keys(next).length === 0;
  };

  /** Submit; server field errors are shown under the right field. Returns the other error message, if any. */
  const submit = async <T,>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; message: string; field?: string }> => {
    setBusy(true);
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (e: any) {
      if (e instanceof ApiError && e.field) setErrors((s) => ({ ...s, [e.field as string]: e.message }));
      return { ok: false, message: e.message, field: e instanceof ApiError ? e.field : undefined };
    } finally {
      setBusy(false);
    }
  };

  return { values, set, setValues, errors, setErrors, validate, submit, busy };
}
