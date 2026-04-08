import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { buildMessages, extractTranslation } from "./translate";

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
  assertEquals(system.includes("backtick"), true);
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
