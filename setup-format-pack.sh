#!/usr/bin/env bash
set -euo pipefail

echo "Installing dev dependencies: prettier, lint-staged, husky"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.lint="prettier --check ."
npm i -D prettier@^3 lint-staged@^15 husky@^9

echo "Writing lint-staged config into package.json"
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p['lint-staged']={'*.{js,ts,vue,jsx,tsx,json,css,scss,md}':'prettier --write'};fs.writeFileSync('package.json',JSON.stringify(p,null,2));"

echo "Initializing Husky"
npx husky install
chmod +x .husky/pre-commit || true

echo "Configuring Git EOL normalization"
git config core.autocrlf false
git config merge.renormalize true

echo "If this is the first time enabling LF normalization, consider:"
echo "  git add --renormalize . && git commit -m 'chore: normalize EOL to LF'"
echo "Done."
