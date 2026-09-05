export const CHAT_ATTACHMENT_PREFIX = '__LF_ATTACHMENT__';

export const CHAT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/zip',
]);

export const CHAT_MAX_SIZE = 10 * 1024 * 1024;

export type ChatAttachmentPayload = {
  v: 1;
  name: string;
  url: string;
  mime: string;
  size: number;
};

export function encodeChatAttachment(payload: ChatAttachmentPayload): string {
  return `${CHAT_ATTACHMENT_PREFIX}${JSON.stringify(payload)}`;
}

export function parseChatAttachment(
  content: string,
): ChatAttachmentPayload | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith(CHAT_ATTACHMENT_PREFIX)) return null;
  try {
    const raw = JSON.parse(trimmed.slice(CHAT_ATTACHMENT_PREFIX.length)) as
      | ChatAttachmentPayload
      | null;
    if (
      !raw ||
      raw.v !== 1 ||
      typeof raw.name !== 'string' ||
      typeof raw.url !== 'string' ||
      typeof raw.mime !== 'string' ||
      typeof raw.size !== 'number'
    ) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

export function previewMessageContent(content: string, fallbackLabel: string): string {
  const attachment = parseChatAttachment(content);
  if (attachment) {
    return `📎 ${attachment.name || fallbackLabel}`;
  }
  return content;
}
