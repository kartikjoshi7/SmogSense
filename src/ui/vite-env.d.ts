/** Types for the files Vite imports that are not code (stylesheets). */
declare module '*.css' {
  const content: string;
  export default content;
}
