# Custom Rules

## Python Environment & Tooling (`uv`)

- Always use `uv` for package management, running scripts, and executing tests in the Python back-end (`back-end/`) and Python bots.
- Use `uv run python <script.py>` to run Python scripts or commands instead of direct `python` or `.venv` binaries.
- Use `uv run pytest` to execute unit tests (e.g. `uv run pytest tests/unit/test_admin_auth.py`).
- Use `uv add <package>` / `uv remove <package>` to manage project dependencies.

## Code Style, Linting & Formatting (`ruff` & `basedpyright`)

- **Line Endings:** All files must strictly use `LF` (`\n`) line endings. Never commit `CRLF` (`\r\n`). Editor settings (`"files.eol": "\n"`) and `.gitattributes` enforce this.
- **Import Organization (`isort`):** Imports must always be organized and grouped into 3 sections:
  1. Standard library (`typing`, `uuid`, `datetime`, etc.)
  2. Third-party packages (`fastapi`, `sqlalchemy`, `pydantic`, etc.)
  3. Local first-party modules (`src.*` and relative imports).
  - Run `uv run ruff check --select I --fix .` to organize imports across the project.
- **Modern Python Typing (`pyupgrade` / `UP`):**
  - Always use modern union syntax: `str | None` instead of `Optional[str]`, and `int | str` instead of `Union[int, str]` (Python 3.10+ / 3.13 standard).
  - Run `uv run ruff check --select UP007 --fix .` to modernize type annotations.
- **Type Checking (`basedpyright`):**
  - Class attributes in Pydantic models/configs without type annotations are allowed (`reportUnannotatedClassAttribute = "none"`).
  - If a module intentionally redefines constants in class validators/methods (e.g. `src/settings.py`), add `# pyright: reportConstantRedefinition=false` at the top of the file.

## Testing Guidelines

- Always write concise, simple unit/integration tests for new features, new endpoints, components, or non-trivial fixes across both back-end and front-end.
- **Python back-end (`back-end/`):** Place tests in `tests/unit/` (or matching module subdirectory) and run using `uv run pytest`.
- **React front-end (`new_ui/`):** Place tests in `__tests__/` subdirectories or `src/tests/` (e.g. `src/lib/__tests__/utils.test.ts`) and run using `npm test` or `npx vitest run <path/to/test>`.

## UI Components

- The custom `Btn` component (`src/components/ui/my-btn.tsx`) already has built-in 3D button styling, hover shadows, text-shadow, and svg drop-shadow. Do NOT add extra `hover:bg-*` or `hover:text-*` classes when using `Btn` (e.g. player controls, close preview button).

## Documentation & Markdown Links

- **Documentation Updates:** Always keep project documentation (`docs/`, `README.md`, etc.) up to date with code changes. When modifying, adding, or refactoring features, endpoints, architecture, configuration, or microservices, proactively update the relevant documentation files.
- **Relative Links:** Never use absolute file system paths or `file:///` URLs in documentation files (`docs/`, `README.md`, etc.). Always use relative paths (e.g. `./playback.md`, `../bot_ttv`, `../../bot_donatepay/src/...`).
