import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { buildMessages, callOpenRouter, copyToClipboard, extractTranslation } from "./translate";

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
