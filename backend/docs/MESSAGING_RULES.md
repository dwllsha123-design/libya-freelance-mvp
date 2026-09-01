# Messaging Business Rules (Phase E)

## Core principle

Messaging is **proposal-context aware**. Users cannot freely message arbitrary accounts.

## Pre-acceptance

| Actor | Rule |
|-------|------|
| **CLIENT** | May initiate conversation for proposals on their own project when proposal is `PENDING` or `ACCEPTED` |
| **FREELANCER** | **Cannot** initiate unsolicited conversations. Cover letter is the introduction |
| **Both** | Once client creates conversation, both may send messages while rules allow |

## Post-acceptance

When proposal is `ACCEPTED` and project is `IN_PROGRESS`, both parties may use the conversation.

Freelancer may create/access conversation for `ACCEPTED` proposals even if client never messaged first.

## One conversation per proposal

`Conversation.proposalId` is **unique**. Duplicate creation returns the existing conversation.

## Status changes

| Situation | Behavior |
|-----------|----------|
| Proposal `REJECTED`/`WITHDRAWN` before conversation | Cannot create conversation |
| Conversation exists, proposal later rejected | History readable; **no new messages** |
| Project `CANCELLED`/`CLOSED`/`COMPLETED` | History readable; **no new messages** |
| Project `IN_PROGRESS` + `ACCEPTED` proposal | Messaging active |
| Project `COMPLETED` + `ACCEPTED` proposal | Messaging remains enabled (post-project follow-up) |

History is never deleted when status changes.

## Members

Exactly two participants, derived from backend:

- `project.clientId`
- `proposal.freelancerId`

Never accept member IDs from the client.

## Socket authentication & reconnection

- WebSocket auth uses the same **in-memory access JWT** as REST (`handshake.auth.token`).
- Access token is **never** stored in `localStorage`.
- `useMessagingSocket` keeps `accessTokenRef` synced with `AuthContext`.
- On `reconnect_attempt`, the socket updates `socket.auth` from the ref so reconnect uses the **latest** token after REST refresh.
- When `accessToken` state changes (login/refresh), the socket effect reconnects with the new token.
- `reconnection: true` with up to 10 attempts handles brief network drops.

## Typing events

- `typing:start` / `typing:stop` require authenticated socket + `ConversationMember` (via shared `authorizeRoomJoin`).
- Throttled to 8 events/second per user (not persisted).

## NEW_MESSAGE notifications

- First message in a conversation creates `رسالة جديدة`.
- Subsequent unread messages in the same conversation update the existing notification to `رسائل جديدة` / `لديك رسائل جديدة من {name}`.

## Invariant

**At most one conversation per proposal.**

See also: `PROPOSAL_INVARIANT.md` for accepted proposal rules.
