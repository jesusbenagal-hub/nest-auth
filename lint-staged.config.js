// Runs on the staged files only, in order, for each glob.

/** @type {import("lint-staged").Configuration} */
const config = {
  "*.ts": ["eslint --fix", "prettier --write"],
  "*.{js,json,md,yaml,yml}": "prettier --write",
};

export default config;
