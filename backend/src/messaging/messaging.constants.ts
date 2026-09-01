export const MESSAGE_MIN_LENGTH = 1;
export const MESSAGE_MAX_LENGTH = 5000;
export const MESSAGES_DEFAULT_LIMIT = 30;
export const MESSAGES_MAX_LIMIT = 50;
export const CONVERSATIONS_DEFAULT_LIMIT = 20;
export const MESSAGE_RATE_LIMIT = 30;
export const MESSAGE_RATE_WINDOW_MS = 60_000;
export const TYPING_RATE_LIMIT = 8;
export const TYPING_RATE_WINDOW_MS = 1_000;

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}
