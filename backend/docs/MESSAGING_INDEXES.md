# Messaging Indexes (Phase E)

## Conversation

| Index | Rationale |
|-------|-----------|
| `proposalId` UNIQUE | One conversation per proposal; fast lookup on create |
| `lastMessageAt` | Sort conversation list by recent activity |
| `projectId` | Optional project-scoped queries |

## ConversationMember

| Index / constraint | Rationale |
|---------------------|-----------|
| `userId` | List conversations for authenticated user |
| Composite PK `(conversationId, userId)` | Membership uniqueness — prevents duplicate members |

## Message

| Index | Rationale |
|-------|-----------|
| `(conversationId, createdAt)` | Paginated history per conversation |
| `senderId` | Sender lookups (secondary) |

## Notification

| Index | Rationale |
|-------|-----------|
| `(userId, isRead)` | Unread notification queries |
