export function importStyles(paths: string[]) {
  return paths.map(path => `@import "${path}";`).join('\n')
}

