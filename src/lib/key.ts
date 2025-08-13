export const keyOf = (base: string, i?: number) => `${base}-${i ?? 0}-${Math.random().toString(36).slice(2,8)}`;


