import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "./dist/scenery.js",
    format: "iife",
    name: "Scenery",
  },
  plugins: [resolve()],
};
