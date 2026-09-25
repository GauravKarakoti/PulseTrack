# Contributing to PulseTrack

First off, thank you for considering contributing to PulseTrack! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## How Can I Contribute?

### Reporting Bugs
If you find a bug, please open an issue using the **Bug Report** template. Include as much detail as possible:
* A clear and descriptive title.
* Steps to reproduce the issue.
* Expected vs. actual behavior.
* Your environment (OS, Node version, device/emulator).

### Suggesting Enhancements
Feature requests are always welcome. Open an issue using the **Feature Request** template. Describe the feature, why it is needed, and how it aligns with the offline-first, productivity-focused vision of the app.

### Submitting Pull Requests
1. **Fork the repository** and create your branch from `main`.
2. **Branch naming convention:** Use descriptive prefixes like `feat/`, `fix/`, `docs/`, or `refactor/` (e.g., `feat/add-dark-mode-toggle`).
3. **Write tests:** If you are adding a new feature or fixing a bug, please include the relevant Jest tests.
4. **Run linters and tests locally:** Ensure `npm run lint` and `npm run test` pass before pushing.
5. **Update documentation:** If your PR changes user-facing features or developer setup steps, update the `README.md` or wiki accordingly.
6. **Submit the PR:** Fill out the PR template completely. Link any relevant issues using "Resolves #IssueNumber".

## Development Guidelines

### Coding Standards
* **Language:** We use **TypeScript** strictly across both the frontend and backend. Please avoid `any` types wherever possible.
* **Formatting:** We use Prettier. Run `npm run format` before committing.
* **Styling:** Use Tailwind CSS utility classes for styling React Native components (via NativeWind).
* **State Management:** Keep local state in React components where possible. For global state, rely on the local SQLite/WatermelonDB instance as the single source of truth rather than heavily caching data in memory.

### Commit Messages
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
* `feat:` A new feature
* `fix:` A bug fix
* `docs:` Documentation only changes
* `style:` Changes that do not affect the meaning of the code (white-space, formatting)
* `refactor:` A code change that neither fixes a bug nor adds a feature
* `test:` Adding missing tests or correcting existing tests
* `chore:` Changes to the build process or auxiliary tools

Example: `feat(analytics): add weekly streak chart to dashboard`

### Offline-First Considerations
When adding data models or API routes:
1. Ensure the database schema in Drizzle ORM matches the local WatermelonDB schema.
2. API endpoints should handle synchronization conflicts gracefully.
3. UI components must never block on a network request to save data. Write to the local database first and let the sync engine handle the rest.

## Need Help?
If you have questions about the codebase or need help getting started, drop a message in the Discussions tab on GitHub. We are happy to help you get your first PR merged!