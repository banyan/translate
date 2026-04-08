# translate

Interactive CLI tool for Japanese to English translation powered by LLM via OpenRouter.

## Features

- Interactive REPL — type Japanese, get English
- Handles mixed Japanese/English input
- Code identifiers (DB column names, table names, etc.) are wrapped in backticks
- Automatic clipboard copy via `pbcopy` (macOS)
- Each translation is independent (no conversation context)

## Setup

```bash
export OPENROUTER_API_KEY=your-api-key
```

## Usage

```
$ translate
> hasura になれてもらうのも含めて coach の query のタスクをお願いしますか
Would you like to take on the coach query task as part of getting familiar with Hasura?

> user_id カラムに index を貼ってください
Please add an index to the `user_id` column.
```

Exit with `Ctrl+C` or `Ctrl+D`.

## Configuration

| Variable | Required | Default |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | yes | - |
| `TRANSLATE_MODEL` | no | `anthropic/claude-4.6-sonnet` |

## Install

```bash
ln -sf "$(pwd)/translate" ~/bin/translate
```

## Tech

- Deno (single file, no dependencies)
- OpenRouter API
