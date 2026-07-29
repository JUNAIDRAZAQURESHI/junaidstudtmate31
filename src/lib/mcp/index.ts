import { auth, defineMcp } from "@lovable.dev/mcp-js";
import summarizeText from "./tools/summarize-text";
import generateNotes from "./tools/generate-notes";
import generateMcq from "./tools/generate-mcq";
import generateQuiz from "./tools/generate-quiz";
import translateText from "./tools/translate-text";
import checkGrammar from "./tools/check-grammar";
import listRecentItems from "./tools/list-recent-items";
import getItem from "./tools/get-item";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time and survives publish.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ai-studymate-pro",
  title: "AI StudyMate Pro",
  version: "1.0.0",
  instructions:
    "Study and writing tools for AI StudyMate Pro. Generate notes, summaries, MCQs, quizzes, translations, and grammar checks from source text; list and fetch the signed-in user's saved items. Every write is scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    summarizeText,
    generateNotes,
    generateMcq,
    generateQuiz,
    translateText,
    checkGrammar,
    listRecentItems,
    getItem,
  ],
});
