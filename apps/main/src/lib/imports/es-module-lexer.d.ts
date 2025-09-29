declare module 'es-module-lexer' {
  export const init: Promise<void>;
  export function parse(code: string): [Array<{ s: number; e: number; ss: number; se: number }>, any];
}
