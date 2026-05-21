export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function getAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}
