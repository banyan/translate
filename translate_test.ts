import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import {
  appendHistory,
  buildMessages,
  callOpenRouter,
  copyToClipboard,
  extractTranslation,
  parseHistoryForInputs,
  resolveHistoryPath,
  serializeHistoryEntry,
} from "./translate";

Deno.test("buildMessages returns system + user message", () => {
  const messages = buildMessages("こんにちは");
  assertEquals(messages.length, 2);
  assertEquals(messages[0].role, "system");
  assertEquals(messages[1].role, "user");
  assertEquals(messages[1].content, "こんにちは");
});

Deno.test("buildMessages system prompt instructs translation rules", () => {
  const messages = buildMessages("テスト");
  const system = messages[0].content;
  assertEquals(system.includes("translate"), true);
  assertEquals(system.includes("backticks"), true);
});

Deno.test("extractTranslation pulls content from OpenRouter response", () => {
  const response = {
    choices: [{ message: { content: "Hello" } }],
  };
  assertEquals(extractTranslation(response), "Hello");
});

Deno.test("extractTranslation trims whitespace", () => {
  const response = {
    choices: [{ message: { content: "  Hello world  \n" } }],
  };
  assertEquals(extractTranslation(response), "Hello world");
});

Deno.test("extractTranslation throws on empty response", () => {
  let threw = false;
  try {
    extractTranslation({ choices: [] });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("callOpenRouter sends correct request and returns translation", async () => {
  const fakeFetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    assertEquals(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(init?.body as string);
    assertEquals(body.model, "test-model");
    assertEquals(body.messages.length, 2);
    return Promise.resolve(
      new Response(JSON.stringify({
        choices: [{ message: { content: "Hello" } }],
      })),
    );
  };
  const result = await callOpenRouter({
    apiKey: "test-key",
    model: "test-model",
    input: "こんにちは",
    fetchImpl: fakeFetch as typeof fetch,
  });
  assertEquals(result, "Hello");
});

Deno.test("callOpenRouter throws on API error", async () => {
  const fakeFetch = () =>
    Promise.resolve(new Response("Unauthorized", { status: 401 }));
  let threw = false;
  try {
    await callOpenRouter({
      apiKey: "bad-key",
      model: "test-model",
      input: "テスト",
      fetchImpl: fakeFetch as typeof fetch,
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("copyToClipboard runs pbcopy with text", async () => {
  // This test actually runs pbcopy on macOS
  await copyToClipboard("test clipboard content");
  const result = new Deno.Command("pbpaste", { stdout: "piped" });
  const { stdout } = await result.output();
  assertEquals(new TextDecoder().decode(stdout), "test clipboard content");
});

Deno.test("serializeHistoryEntry produces a single JSON line", () => {
  const entry = {
    ts: "2026-04-18T12:00:00.000Z",
    input: "こんにちは",
    output: "Hello",
  };
  const line = serializeHistoryEntry(entry);
  assertEquals(line.endsWith("\n"), true);
  assertEquals(line.slice(0, -1).includes("\n"), false);
  assertEquals(JSON.parse(line), entry);
});

Deno.test("serializeHistoryEntry escapes newlines in input and output", () => {
  const entry = {
    ts: "2026-04-18T12:00:00.000Z",
    input: "line1\nline2",
    output: "out1\nout2",
  };
  const line = serializeHistoryEntry(entry);
  assertEquals(line.slice(0, -1).includes("\n"), false);
  const parsed = JSON.parse(line);
  assertEquals(parsed.input, "line1\nline2");
  assertEquals(parsed.output, "out1\nout2");
});

Deno.test("resolveHistoryPath returns HOME-based path", () => {
  const original = Deno.env.get("HOME");
  Deno.env.set("HOME", "/tmp/fake-home");
  try {
    assertEquals(
      resolveHistoryPath(),
      "/tmp/fake-home/.local/state/translate/history.jsonl",
    );
  } finally {
    if (original === undefined) Deno.env.delete("HOME");
    else Deno.env.set("HOME", original);
  }
});

Deno.test("resolveHistoryPath throws when HOME is unset", () => {
  const original = Deno.env.get("HOME");
  Deno.env.delete("HOME");
  let threw = false;
  try {
    resolveHistoryPath();
  } catch {
    threw = true;
  } finally {
    if (original !== undefined) Deno.env.set("HOME", original);
  }
  assertEquals(threw, true);
});

Deno.test("parseHistoryForInputs returns inputs in order", () => {
  const content = [
    JSON.stringify({ ts: "t1", input: "first", output: "F" }),
    JSON.stringify({ ts: "t2", input: "second", output: "S" }),
    "",
  ].join("\n");
  assertEquals(parseHistoryForInputs(content), ["first", "second"]);
});

Deno.test("parseHistoryForInputs skips malformed lines", () => {
  const content = [
    JSON.stringify({ ts: "t1", input: "ok", output: "x" }),
    "{not json",
    JSON.stringify({ ts: "t2", output: "no input field" }),
    JSON.stringify({ ts: "t3", input: 123 }),
    JSON.stringify({ ts: "t4", input: "good", output: "y" }),
  ].join("\n");
  assertEquals(parseHistoryForInputs(content), ["ok", "good"]);
});

Deno.test("parseHistoryForInputs skips multi-line inputs", () => {
  const content = [
    JSON.stringify({ ts: "t1", input: "line1\nline2", output: "x" }),
    JSON.stringify({ ts: "t2", input: "single", output: "y" }),
  ].join("\n");
  assertEquals(parseHistoryForInputs(content), ["single"]);
});

Deno.test("parseHistoryForInputs handles empty content", () => {
  assertEquals(parseHistoryForInputs(""), []);
});

Deno.test("appendHistory writes JSONL entries and creates parent dirs", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const path = `${tmp}/nested/dir/history.jsonl`;
    await appendHistory(
      { ts: "2026-04-18T12:00:00.000Z", input: "a", output: "A" },
      path,
    );
    await appendHistory(
      { ts: "2026-04-18T12:00:01.000Z", input: "b", output: "B" },
      path,
    );
    const content = await Deno.readTextFile(path);
    const lines = content.split("\n").filter((l) => l.length > 0);
    assertEquals(lines.length, 2);
    assertEquals(JSON.parse(lines[0]).input, "a");
    assertEquals(JSON.parse(lines[0]).output, "A");
    assertEquals(JSON.parse(lines[1]).input, "b");
    assertEquals(JSON.parse(lines[1]).output, "B");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
