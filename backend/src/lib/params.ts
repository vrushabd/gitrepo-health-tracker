import { Request } from 'express';

/** Normalize Express route param to a single string (strict TS compat). */
export function paramId(req: Request, key = 'id'): string {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
