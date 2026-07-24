import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const listBookmarksTool = defineTool({
  name: "list_bookmarks",
  title: "List bookmarks",
  description: "List the signed-in user's saved coding problem bookmarks.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("bookmarks")
      .select("id, problem_title, problem_url, topic, created_at")
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { bookmarks: data ?? [] },
    };
  },
});

export const addBookmarkTool = defineTool({
  name: "add_bookmark",
  title: "Add bookmark",
  description: "Save a coding problem to the signed-in user's bookmarks.",
  inputSchema: {
    problem_title: z.string().trim().min(1).max(200),
    problem_url: z.string().trim().url().max(1000),
    topic: z.string().trim().max(100).nullable().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async ({ problem_title, problem_url, topic }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("bookmarks")
      .insert({ user_id: ctx.getUserId(), problem_title, problem_url, topic: topic ?? null })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Bookmarked: ${data.problem_title}` }],
      structuredContent: { bookmark: data },
    };
  },
});

export const listProgressTool = defineTool({
  name: "list_dsa_progress",
  title: "List DSA progress",
  description: "List DSA roadmap topics the signed-in user has marked complete.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("dsa_progress")
      .select("topic, completed, updated_at")
      .eq("completed", true);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { progress: data ?? [] },
    };
  },
});

export const markTopicTool = defineTool({
  name: "mark_topic_complete",
  title: "Mark DSA topic complete",
  description: "Mark a DSA roadmap topic as complete or not-complete for the signed-in user.",
  inputSchema: {
    topic: z.string().trim().min(1).max(200).describe("Roadmap topic id or name."),
    completed: z.boolean().describe("true to mark complete, false to un-mark."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ topic, completed }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("dsa_progress")
      .upsert(
        { user_id: ctx.getUserId(), topic, completed, updated_at: new Date().toISOString() },
        { onConflict: "user_id,topic" },
      )
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Topic "${topic}" set to ${completed ? "complete" : "incomplete"}.` }],
      structuredContent: { progress: data },
    };
  },
});

export const listNotificationsTool = defineTool({
  name: "list_notifications",
  title: "List notifications",
  description: "List the signed-in user's recent Codex notifications.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).nullable().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("notifications")
      .select("id, title, message, type, read, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 15);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
