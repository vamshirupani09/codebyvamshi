import { auth, defineMcp } from "@lovable.dev/mcp-js";
import {
  addBookmarkTool,
  listBookmarksTool,
  listNotificationsTool,
  listProgressTool,
  markTopicTool,
} from "./tools";

// OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined at build time by Vite; sentinel keeps the
// issuer well-formed during manifest extraction.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "codex-mcp",
  title: "Codex Coding Assistant",
  version: "0.1.0",
  instructions:
    "Tools for the Codex multi-agent AI coding assistant. Use these to read and update the signed-in user's DSA roadmap progress, saved problem bookmarks, and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBookmarksTool,
    addBookmarkTool,
    listProgressTool,
    markTopicTool,
    listNotificationsTool,
  ],
});
