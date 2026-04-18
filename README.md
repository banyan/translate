# translate

> Interactive CLI tool for Japanese to English translation powered by LLM via OpenRouter.

## Features

- Interactive REPL — type Japanese, get English
- Handles mixed Japanese/English input
- Code identifiers (DB column names, table names, etc.) are wrapped in backticks
- Automatic clipboard copy via `pbcopy` (macOS)
- Each translation is independent (no conversation context)

## Requirements

- [OpenRouter](https://openrouter.ai/) API key

## Setup

```bash
export OPENROUTER_API_KEY=your-api-key
```

## Usage

```
$ translate
> こんにちは
Hello.
```

Exit with `Ctrl+C` or `Ctrl+D`.

## Configuration

| Variable             | Required | Default                       |
| -------------------- | -------- | ----------------------------- |
| `OPENROUTER_API_KEY` | yes      | -                             |
| `TRANSLATE_MODEL`    | no       | `anthropic/claude-4.6-sonnet` |

## History

Successful translations are appended to `~/.local/state/translate/history.jsonl` as JSONL:

```json
{"ts":"2026-04-18T12:34:56.789Z","input":"こんにちは","output":"Hello."}
```

Search with `jq` or `grep`. Failed translations are not recorded.

## Install

```bash
ln -sf "$(pwd)/translate" ~/bin/translate
```

## Tech Stack

- Deno
- OpenRouter API
