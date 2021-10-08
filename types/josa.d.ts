declare module 'josa' {
  export function josa(str: string): string;
  export function getJosaPicker(str: string): (word: string) => string;
}
