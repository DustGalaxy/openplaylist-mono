# Custom Rules

## Python Environment & Tooling (`uv`)
- Always use `uv` for package management, running scripts, and executing tests in the Python back-end (`back-end/`).
- Use `uv run python <script.py>` to run Python scripts or commands instead of direct `python` or `.venv` binaries.
- Use `uv run pytest` to execute unit tests (e.g. `uv run pytest tests/unit/test_admin_auth.py`).
- Use `uv add <package>` / `uv remove <package>` to manage project dependencies.

## Testing Guidelines
- Always write concise, simple unit/integration tests for new features, new endpoints, components, or non-trivial fixes across both back-end and front-end.
- **Python back-end (`back-end/`):** Place tests in `tests/unit/` (or matching module subdirectory) and run using `uv run pytest`.
- **React front-end (`new_ui/`):** Place tests in `__tests__/` subdirectories or `src/tests/` (e.g. `src/lib/__tests__/utils.test.ts`) and run using `npm test` or `npx vitest run <path/to/test>`.

## UI Components
- The custom `Btn` component (`src/components/ui/my-btn.tsx`) already has built-in 3D button styling, hover shadows, text-shadow, and svg drop-shadow. Do NOT add extra `hover:bg-*` or `hover:text-*` classes when using `Btn` (e.g. player controls, close preview button).
