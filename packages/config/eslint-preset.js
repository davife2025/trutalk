/** Shared ESLint rules for all apps/packages in the monorepo. */
module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  env: { es2022: true, node: true },
  rules: {
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
