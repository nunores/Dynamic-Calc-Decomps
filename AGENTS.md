# AGENTS.md

## Project Overview
- Dynamic Calc is a browser-based showdown calculator fork with dynamic data loading and Nuzlocke-focused features.
- Tech stack is plain HTML/CSS/JavaScript plus local `calc/` engine modules.
- Primary entry points are `index.html`, `dashboard.html`, `mastersheet.html`, and scripts in `js/`.

## High-Value Directories
- `js/`: UI behavior, controls, import hooks, save readers, mastersheet logic.
- `css/`: page styling.
- `calc/`: calculation engine logic.
- `cypress/`: end-to-end tests and fixtures.
- `tools/`: data utilities and large reference JSON files.

## File Scope And Performance Rules
- Default to editing only files needed for the task.
- Ignore very large data files unless the task explicitly requires them.
- Specifically avoid scanning or editing these by default:
  - `backups/**` (large backup datasets)
  - `tools/*.json` (large reference datasets such as `trainers.json`, `elite_setdex.json`)
  - `js/mastersheet/data/**` (large generated data bundles)
  - `node_modules/**`
- Do not mass-read entire large files to answer small questions. Prefer targeted reads.

## Working Style
- Make small, focused changes that match existing patterns.
- Preserve current architecture (global browser scripts, existing event wiring) unless asked to refactor.
- Avoid unrelated cleanup and broad formatting changes.
- Ask before changing data format assumptions used by imports, setdex, or save parsing.

## Validation
- For logic/UI changes, run targeted Cypress specs when feasible:
  - `npx cypress run --spec "cypress/e2e/calc-ui/calc.cy.js"`
  - `npx cypress run --spec "cypress/e2e/calc-ui/dataValidation.cy.js"`
  - `npx cypress run --spec "cypress/e2e/calc-ui/frags.cy.js"`
- If full test execution is too heavy for the change, run the most relevant spec and report what was not run.

## Safety Rules
- Never run destructive git commands (`reset --hard`, `checkout --`) unless explicitly requested.
- Do not modify backup datasets as part of routine bugfixes/features.
- Treat `.sav`, `.ss1`, and fixture text files in `cypress/fixtures/` as test assets; only update when test intent changes.

## Change Reporting
- In summaries, include:
  - files changed
  - behavior impact
  - tests run (or why not run)
