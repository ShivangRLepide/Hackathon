# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

- **Planning:** Using AI can increase productivity and speed. It helps write concise, error-free and optimised code that is easier to keep clean.
- **Detection:** Lookbehind/lookahead boundaries stop partial matches inside longer digit runs, and Luhn must run on the whole candidate. Overlap priority has to be explicit, or one value is counted twice. The 44 fixture and unit tests passed on the first run, but that only holds for the cases written; the Reject fixtures are still untested. Luhn alone flags about 10% of random 13–19 digit strings, so a Luhn pass is not evidence of a card. Characterisation counts pinned from observed output show current behaviour, not correctness.
- **Security/persistence:** Building the application securely is the core requirement, not an extra step.
- **UI:** Good design matters: following the Lepidus design system gives a consistent, clean result.
- **Testing/deployment:** Adding package.json made Node 24 warn that the .ts test files had no module type. Setting "type": "module" cleared it and the 49 tests still passed. Re-run the tests and type check after every install. `next build` rewrote tsconfig.json (allowJs, incremental, esModuleInterop, jsx react-jsx); review the file after the first build.
- **What I'd do differently:** Create the instruction (.md) file first, then take screenshots of the final product.
