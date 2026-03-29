/**
 * Re-export text moderation module.
 * Core logic lives in server/text-moderation.ts (shared with socket server).
 */
export { moderateText, moderateTextSync } from "../../server/text-moderation";
export type { TextModerationResult, ThreatCategory } from "../../server/text-moderation";
