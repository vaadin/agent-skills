# Vaadin Agent Skills

Agent skills for helping coding agents style, design, and lay out Vaadin 25 applications.

These skills can be installed as a plugin from the [`vaadin/agent-marketplace`](https://github.com/vaadin/agent-marketplace) marketplace (Claude and Codex) or with the [`skills` CLI](https://github.com/vercel-labs/skills) from `vercel-labs/skills`.

This repository can be used in three ways:

- as a plugin installed from the [`vaadin/agent-marketplace`](https://github.com/vaadin/agent-marketplace) marketplace (Claude and Codex)
- as a source for `npx skills add`
- as a Codex/Claude plugin source referenced directly

It includes:

- `.codex-plugin/plugin.json` for Codex plugin metadata
- `.claude-plugin/plugin.json` for Claude plugin metadata
- `.mcp.json` for the Vaadin MCP server configuration
- `skills/` for the shared skill definitions

For Claude users, the older [`vaadin/claude-plugin`](https://github.com/vaadin/claude-plugin) repository is kept as a marketplace that points back to this source-of-truth repository.

## Installation

### Marketplace (recommended)

The skills are published through the [`vaadin/agent-marketplace`](https://github.com/vaadin/agent-marketplace)
marketplace for both Claude Code and Codex. Installing the plugin this way also
configures the Vaadin MCP server automatically from `.mcp.json` — no separate
MCP setup required.

**Claude Code:**

```sh
/plugin marketplace add vaadin/agent-marketplace
/plugin install vaadin-skills@vaadin-marketplace
```

You can also browse and install `vaadin-skills` from the marketplace browser via
`/plugin`. To pick up later changes, run `/plugin marketplace update vaadin-marketplace`.

**Codex:**

```sh
codex plugin marketplace add vaadin/agent-marketplace --ref main
codex plugin add vaadin-skills@vaadin-marketplace
```

To pick up later changes, run `codex plugin marketplace upgrade`.

### `npx skills add`

If you prefer to install just the skill files (without the plugin and its MCP
configuration), use the [`skills` CLI](https://github.com/vercel-labs/skills).

Install all skills from this repository:

```sh
npx skills add vaadin/agent-skills
```

Install a specific skill:

```sh
npx skills add vaadin/agent-skills --skill vaadin-frontend-design
```

Install multiple specific skills:

```sh
npx skills add vaadin/agent-skills --skill vaadin-frontend-design --skill aura-theme
```

The CLI can also be run against a GitHub URL:

```sh
npx skills add https://github.com/vaadin/agent-skills --skill vaadin-form-layout
```

### MCP server

Installing from the [marketplace](#marketplace-recommended) configures the MCP
server automatically from `.mcp.json`, so you can skip this section.

`npx skills add`, on the other hand, installs only the skill files. It does
**not** install the MCP server declared in `.mcp.json`, which the skills rely on
for up-to-date Vaadin documentation and Java API lookups. Install it separately
for your agent.

This repository uses a single HTTP MCP server:

| Server | URL |
| --- | --- |
| `vaadin` | `https://mcp.vaadin.com/docs` |

**Claude Code:**

```sh
claude mcp add --transport http vaadin https://mcp.vaadin.com/docs
```

**Codex:**

```sh
codex mcp add vaadin --url https://mcp.vaadin.com/docs
```

After adding the server, start a session and run `/mcp` to verify it is
connected.

## Available Skills

| Skill | Purpose |
| --- | --- |
| `aura-theme` | Generate and customize Vaadin Aura theme CSS configurations. |
| `vaadin-frontend-design` | Create visually polished Vaadin interfaces beyond default theme styling. |
| `vaadin-form-layout` | Create Vaadin Flow forms and entity editors from a Figma URL, screenshot, text, or prompt. |

## Repository Structure

Each skill lives in its own directory under `skills/`:

```text
.codex-plugin/
  plugin.json
.claude-plugin/
  plugin.json
.mcp.json
skills/
  vaadin-frontend-design/
    SKILL.md
    references/
      design-patterns.md
  aura-theme/
    SKILL.md
    references/
      property-values.md
```

`SKILL.md` contains the skill front matter and primary instructions. The optional `references/` directory contains deeper supporting material that agents can load only when needed.

## Updating Skills

After editing a skill, reinstall it locally with the same command you used for installation. For example:

```sh
npx skills add vaadin/agent-skills --skill vaadin-frontend-design
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
