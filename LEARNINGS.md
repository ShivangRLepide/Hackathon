# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

- **Planning:**
- **Detection:** Lookbehind/lookahead boundaries stop partial matches inside longer digit runs, and Luhn must run on the whole candidate. Overlap priority has to be explicit, or one value is counted twice. The 44 fixture and unit tests passed on the first run, but that only holds for the cases written; the Reject fixtures are still untested. Luhn alone flags about 10% of random 13–19 digit strings, so a Luhn pass is not evidence of a card. Characterisation counts pinned from observed output show current behaviour, not correctness.
- **Security/persistence:**
- **UI:**
- **Testing/deployment:** Adding package.json made Node 24 warn that the .ts test files had no module type. Setting "type": "module" cleared it and the 49 tests still passed. Re-run the tests and type check after every install. `next build` rewrote tsconfig.json (allowJs, incremental, esModuleInterop, jsx react-jsx); review the file after the first build.
- **What I'd do differently:**
