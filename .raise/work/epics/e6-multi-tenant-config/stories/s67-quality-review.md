## Quality Review: S67

### Critical (fix before merge)
- `deploy.js`:230
  - **WHY:** If the developer aborts the deployment with `Ctrl+C` (SIGINT) while `clasp push -f` or `clasp deploy` is running, or if an unhandled exception occurs in the async callback, the process terminates immediately. Because `swapClaspCredentials()` modifies the global `~/.clasprc.json`, this leaves the developer with the wrong active token, which could lead to accidental deployments to the wrong account in future commands.
  - **FIX:** Register process-level cleanup handlers to ensure `restoreClaspCredentials()` is always called on exit. Add this near the top of the file:
    ```javascript
    process.on('SIGINT', () => { restoreClaspCredentials(); process.exit(1); });
    process.on('uncaughtException', (err) => { console.error(err); restoreClaspCredentials(); process.exit(1); });
    process.on('exit', () => { restoreClaspCredentials(); });
    ```
- `deploy.js`:71
  - **WHY:** If the developer didn't have a `~/.clasprc.json` file originally, `originalClasprc` remains `null`. When `restoreClaspCredentials()` runs, it checks `if (originalClasprc !== null)` and does nothing. This leaves the swapped credentials file in place instead of returning to a clean state.
  - **FIX:** Track if the original file existed. If it didn't, `restoreClaspCredentials()` should delete (unlink) the `~/.clasprc.json` file instead of leaving the injected one.

### Recommended (improve code quality)
- `deploy.js`:67
  - **WHY:** If `fs.copyFileSync(credsPath, CLASPRC)` fails (e.g., due to file permission issues), `originalClasprc` has already been populated with the backup. If an error is thrown, `restoreClaspCredentials()` might be called (if cleanup handlers are added), which will attempt to rewrite `originalClasprc`. While safe, it's better to use a `try/catch` around the file operations in `swapClaspCredentials()` to handle potential IO errors gracefully and log a clear warning rather than crashing ungracefully.
  - **FIX:** Wrap the `fs.copyFileSync` in a try/catch, log the IO error, and abort the swap safely.

### Observations (no action needed)
- **Fallback Strategy:** The check for `if (!fs.existsSync(credsPath))` elegantly handles the missing credentials file and allows the deployment to proceed with the default token without failing.
- **Security:** Placing the specific `.clasp-*.json` files in `os.homedir()` is a good practice, ensuring they won't be accidentally committed to source control.
- **Test Muda:** No automated tests were modified or added for this story; manual validation was used given it interacts directly with the local file system and Clasp CLI.

### Verdict
- [ ] FAIL
