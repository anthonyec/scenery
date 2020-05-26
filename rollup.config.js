import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/index.js",
  output: {
    file: "./dist/scenebox.js",
    format: "iife",
    name: "SceneBox",
  },
  plugins: [resolve()],
};
