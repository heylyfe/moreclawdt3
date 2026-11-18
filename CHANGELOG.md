# Changelog

All notable changes to Clawd Crab. Versions follow [semver](https://semver.org); betas are marked as pre-releases.

## [1.0.0-beta.2] - 2026-11-18

### Added
- **5 new crabs**, picked by the tool the agent is running:
  - **Terminal** (shell commands): types into a tiny terminal, output scrolls in.
  - **Editing** (file edits): snips the old red line out, a new green line grows in.
  - **Browsing** (web search and fetch): surfs a wave with a spinning globe.
  - **Planning** (todo list): ticks items off a clipboard.
  - **Listening** (you are typing): watches your message with a "…" bubble, even while the agent works.
- **Empty chats:** a mini crab walks along the top of the message box, towards big Clawd.
- **Reduced motion:** with the system setting on, every crab holds still on its first frame.
- The gallery shows the version and links to this repo.
- Release tooling: a changelog, issue templates, and a workflow that tests, builds and publishes each release.
- README: troubleshooting, uninstalling, and badges.

### Changed
- Web searches show the new Browsing crab instead of Reading.
- File edits show the new Editing crab instead of Working.
- Theme CSS is now about 47,300 characters (still under the 50,000 limit of the 14 Nov 2026 nightly).

## [1.0.0-beta.1] - 2026-11-17

### Added
- 11 animated pixel crabs: idle, thinking, working, reading, deploying subagents, subagent, waiting, error, done, sleeping, compacting.
- Composer mascot that follows the open thread, a crab beside "Working for…", a mini crab beside each running subagent, and a status crab per thread in the sidebar.
- After a turn ends: a short celebration, then idle, then asleep after about 2.5 minutes.
- `t3-clawd-crab.json`: [t3-clawd](https://github.com/rohit3a/t3-clawd) with the crabs, ready to add in T3 Code.
- Tests: T3 Code's own theme checks, plus a headless browser run with T3 Code's theme loader.

### Fixed
- The ⌘N hint on New chat from t3-clawd now shows. T3 Code was dropping it because it was written with a backslash escape.
- The resting animation's CSS shorthand made the browser read the animation name as the word `forwards`, so the celebrate, idle, sleep cycle stopped playing as soon as any other state ended.

[1.0.0-beta.2]: https://github.com/heylyfe/moreclawdt3/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/heylyfe/moreclawdt3/releases/tag/v1.0.0-beta.1
