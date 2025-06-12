# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Tools for (most) GET endpoints of entitycore

### Fixed
- Fixed bug where fastapi servers were wrongly set.

## Changed
- Track mcp.json.
- mtype resolving now use embedddings.

### Removed
- Knowledge graph tools and utils

## [0.5.5] - 02.06.2025

### Changed
- Bearer token is propagated through the `httpx_client`.
- Use `.model_dump(exclude_defaults=True)` for auto-generated classes dumping.
- Get morpho tool and resolve entities now uses entitycore.
- Remove usage of user journey in suggestion after first message.
- Tools based on API calls adapted to new autogen tool.
- Autogen tool and ways to auto gen input parameters.
- Input schema of the suggestion endpoint.

### Added
- Autogeneration of input schemas from APIs.
- Morphometrics tool using obi-one.
- Custom brain region resolving.
- Turn `neuroagent` into an MCP client.
- Tools for (most) GET endpoints of entitycore

### Fixed
- Handle breaking change in entitycore.
- Hallucinations of LS.

## [0.5.4]

### Fixed
- Fixe (hopefully) hallucinations related to literature search.

## [0.5.3]

### Fixed
- Suggestion enpoint.

## [0.5.2]

### Changed
- Merge two suggestion endpoints.


## [0.5.1]

### Added
- Suggestions inside chat.

### Fixed
- Make `docker build` work on ARM

## [v0.5.0] - 24.04.2025

### Fixed
- Multiple small frontend fixes.
- Increased route threshold.

### Changed
- Prettier automatic tailwind classes sorting.
- Nicer HIL validation window.

## Added
- [frontend] - tool thunmbnail in chat.
- Pass the entire message in LS input and let the LLM chose articles.

### Removed
- `order` column in `messages` table + fixed.
- SQLite support.

## Added
- Basic Guardrails.
- Possibility to interrupt streaming.
- Filter and sort get_thread and get_thread/messages.
- Plots for the SCS simulations.
- New semantic route.
- Pagination for threads and messages.

### Fixed
- Literature search points to right url.

## [v0.4.7] - 15.04.2025

### Fixed
- Empty groups from keycloak.

## [v0.4.6]

### Changed
- Return only one suggestion.
- Update system prompt.
- Add current time and date in system prompt.

### Added
- Every tool output schema to the OpenAPI json + swagger.
- Header containing rate limit info.

## [v0.4.5] - 28.03.2025

### Added
- Combine rate limiting with accounting for chat

## [v0.4.4] - 27.03.2025

### Added
- Limit for sequential and parallel tool calls.
- Platform description in prompt.

### Fixed
- Add LS and Web search guardrails.

## [v0.4.3] - 26.03.2025

### Added
- Accounting

## [v0.4.2] - 24.03.2025

### Added
- Rate limiting

### Fixed
- Checkbox clickable all the way.

### Changed
- LS tool now returns articles instead of paragraphs.

## [v0.4.1] - 14.03.2025

### Fixed
- ECR action

## [v0.4.0] - 14.03.2025

### Removed
- Removed trailing slashes from endpoints.
- Bunch of unused code
- God account logic
- Skipped tests (but astream)

### Changed
- Return model dumps of DB schema objects.
- Moved swarm_copy to neuroagent and delete old code.
- Create thread now has a body.
- Made streaming vercel compatible.
- [frontend] - Make human messages not span the entire width of the chat.
- Copyright and acknowledgement.
- pre-commit hooks for frontend.
- [frontend] - Loading bar and better first message.
- Better system prompt
- Sort components in folder.
- Brain region/cell hierarchies read from storage (not from local filesystem).
- Authentication is done directly through keycloak.
- Don't assume we run minIO by default and also add documentation.

### Added
- Docker compose for local development
- [frontend] Keycloak sign in + documentation.
- LLM evaluation logic
- Integrated Alembic for managing chat history migrations
- Tool implementations without langchain or langgraph dependencies
- Unit tests for the migrated tools
- CRUDs.
- BlueNaas CRUD tools
- Tests for threads module
- Cell types, resolving and utils tests
- app unit tests
- Tests of AgentsRoutine.
- Unit tests for database
- Tests for tool CRUD endpoints.
- Human In the Loop.
- Alembic in CI.
- Vitest tests for frontend
- Title generation endpoint.
- [frontend] - Dark mode.
- [frontend] - Automatic title generation
- [frontend] - Collapsible side bar.
- [frontend] - Add confirmation box on thread deletion.
- Feedback for HIL tool call refusal.
- [frontend] - Per message tool toggle.
- [frontend] - Possibility to dynamically chose available tools.
- [frontend] - Search bar in tool list.
- Displaying tool metadata
- GET threads depends on vlab+project_id.
- Object storage + plotting logic.
- Keywords filtering for literature search.
- [frontend] - bugfixes.
- Suggestion endpoint.
- Support empty vlab+project in threads.

### Fixed
- [frontend] - Parallel execution of tools
- Migrate LLM Evaluation logic to scripts and add tests
- Query size limiter.
- Fix /threads/messages endpoint.
- [frontend] - remove first message delay.
- [frontend] - improve loading UI on first message.
- [frontend] - MarkDown rendering.
- [frontend] - dark mode flickering.
- [frontend] - Concatenate base url and endpoint correctly.
- Display the tool results as valid JSONs.
- Do not return entire coordinates in `scs-get-one` tool.
- [frontend] - Better Vlab and Project selection.
- [frontend] - Fix long message overflowing.
- Display the entire input json for tool calls.
- Push to ECR prod+Staging.
- [frontend] - Text input disabled when HIL.
- Tool + content is saved as `AI_tool` now.
- [frontend] - Scrolling while streaming.
- [frontend] - Handle invalid json errors.
- [frontend] - Tool selection is all checked when refreshing.
- Fix bug for AI + tool calls.
- [frontend] - Fix docker compose redirect bug.
- [frontend] - Refactor
- Websearch tools.
- Small bugfixes.
- [frontend] - Fix suggestion UI.
- [frontend] - cosmetic fixes.

## [0.3.3] - 30.10.2024

### Changed
- Removed release please bot and add automatic on tag pushes to ecr.

## [0.3.2](https://github.com/BlueBrain/neuroagent/compare/v0.3.1...v0.3.2) (2024-10-29)


### Bug Fixes

* Fix ([#39](https://github.com/BlueBrain/neuroagent/issues/39)) ([948b8bf](https://github.com/BlueBrain/neuroagent/commit/948b8bf7b77fa62baddba357c293979b9ba05847))

## [0.3.1](https://github.com/BlueBrain/neuroagent/compare/v0.3.0...v0.3.1) (2024-10-29)


### Bug Fixes

* fix ecr yml ([#37](https://github.com/BlueBrain/neuroagent/issues/37)) ([1983b20](https://github.com/BlueBrain/neuroagent/commit/1983b2083e276ce2991cee6b6c3b0fc1e8268512))

## [0.3.0](https://github.com/BlueBrain/neuroagent/compare/v0.2.0...v0.3.0) (2024-10-29)


### Features

* Added release please ([dd11700](https://github.com/BlueBrain/neuroagent/commit/dd1170095a92b086d264e09d6ba417b506f2d3e4))
* Added release please to automate changelogs and releases. ([5b9d30b](https://github.com/BlueBrain/neuroagent/commit/5b9d30b1d304a4a16761939625db31ed581bc57b))
* Added stream ([#33](https://github.com/BlueBrain/neuroagent/issues/33)) ([3df8463](https://github.com/BlueBrain/neuroagent/commit/3df84637649fce5937688f288d4d03f9c4eab0b6))


### Added
- Swarm copy POC.
- Agent memory.


## [0.2.0] - 22.10.2024

### Changed
- Switched from OAUTH2 security on FASTAPI to HTTPBearer.
- Switched to async sqlalchemy.
- Expanded list of etypes.

### Added
- Add get morphoelectric (me) model tool
- BlueNaaS simulation tool.
- Validation of the project ID.
- BlueNaaS tool test.
- Human in the loop for bluenaas.

### Fixed
- Fixed 0% unittest coverage bug.
- Get ME model tool querying logic

## [0.1.1] - 26.09.2024

### Fixed
- Fixed a bug that prevented AsyncSqlite checkpoint to access the DB in streamed endpoints.
- Fixed a bug that caused some unit tests to fail due to a change in how httpx_mock works in version 0.32

## [0.1.0] - 19.09.2024

### Added
- Update readme
- Extra multi agent unit tests
- Extra unit tests for dependencies.py

### Removed
- Github action to create the docs.

### Changed
- Migration to pydantic V2.

### Fixed
- Streaming with chat agent.
- Deleted some legacy code.
