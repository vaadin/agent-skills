# Vaadin Agent Skills

Agent skills for helping coding agents build, style, test, and secure Vaadin 25 applications.

These skills are designed to be installed with the [`skills` CLI](https://github.com/vercel-labs/skills) from `vercel-labs/skills`.

This repository can be used in three ways:

- as a source for `npx skills add`
- as a Codex plugin source
- as a Claude plugin source

It includes:

- `.codex-plugin/plugin.json` for Codex plugin metadata
- `.claude-plugin/plugin.json` for Claude plugin metadata
- `.mcp.json` for the Vaadin MCP server configuration
- `skills/` for the shared skill definitions

For Claude users, the older [`vaadin/claude-plugin`](https://github.com/vaadin/claude-plugin) repository is kept as a marketplace that points back to this source-of-truth repository.

## Installation

Install all skills from this repository:

```sh
npx skills add vaadin/agent-skills
```

Install a specific skill:

```sh
npx skills add vaadin/agent-skills --skill frontend-design
```

Install multiple specific skills:

```sh
npx skills add vaadin/agent-skills --skill frontend-design --skill theming --skill ui-unit-testing
```

The CLI can also be run against a GitHub URL:

```sh
npx skills add https://github.com/vaadin/agent-skills --skill views-and-navigation
```

## Available Skills

| Skill | Purpose |
| --- | --- |
| `aura-theme` | Generate and customize Vaadin Aura theme CSS configurations. |
| `client-side-views` | Build client-side React/Hilla views, file-based routes, and type-safe backend communication in Vaadin 25. |
| `data-providers` | Use Vaadin data providers for Grid, ComboBox, lazy loading, filtering, sorting, and pagination. |
| `forms-and-validation` | Build Binder-based Vaadin Flow forms with validation, converters, and robust submission handling. |
| `frontend-design` | Create visually polished Vaadin interfaces beyond default theme styling. |
| `responsive-layouts` | Build responsive Vaadin layouts for desktop and mobile screens. |
| `reusable-components` | Structure large Vaadin Flow views into focused, reusable components. |
| `security` | Secure Vaadin applications with Spring Security, route access control, login, logout, roles, and OAuth2. |
| `signals` | Use Vaadin Signals for reactive local and shared state management. |
| `testbench-testing` | Write end-to-end browser tests with Vaadin TestBench. |
| `theming` | Configure and customize Vaadin Aura and Lumo themes. |
| `third-party-components` | Integrate third-party Web Components and React components into Vaadin Flow applications. |
| `ui-unit-testing` | Write fast browser-free Vaadin view tests with Browserless Testing. |
| `vaadin-layouts` | Use HorizontalLayout, VerticalLayout, FlexLayout, AppLayout, spacing, sizing, and alignment correctly. |
| `views-and-navigation` | Create Vaadin views, routes, router layouts, navigation menus, and URL parameter handling. |

## Repository Structure

Each skill lives in its own directory under `skills/`:

```text
.codex-plugin/
  plugin.json
.claude-plugin/
  plugin.json
.mcp.json
skills/
  frontend-design/
    SKILL.md
    references/
      design-patterns.md
  theming/
    SKILL.md
    references/
      theming-patterns.md
```

`SKILL.md` contains the skill front matter and primary instructions. The optional `references/` directory contains deeper supporting material that agents can load only when needed.

## Updating Skills

After editing a skill, reinstall it locally with the same command you used for installation. For example:

```sh
npx skills add vaadin/agent-skills --skill frontend-design
```

If you are working from a local checkout, use the local path:

```sh
npx skills add .
```

## Contributing

When adding a new skill:

1. Create `skills/<skill-name>/SKILL.md`.
2. Keep the front matter `name` equal to the directory name.
3. Write a specific `description` that tells agents when the skill should be used.
4. Put longer examples and supporting documents in `skills/<skill-name>/references/`.
5. Update the skill list in this README.
6. Update the skill list in `.claude-plugin/plugin.json`.
