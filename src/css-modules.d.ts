// Ambient declarations for stylesheet imports, which Metro (and the web
// bundler) resolve at build time but TypeScript cannot see.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.css';
