# Deep links

Canonical public HTTPS links for Libya Freelance (WEB today, native apps later).

## Marketplace

| Resource | Canonical URL | Future native screen |
|----------|---------------|----------------------|
| Project | `https://libyanfreelance.ly/projects/{slug}` | Project detail |
| Freelancer | `https://libyanfreelance.ly/freelancers/{username}` | Freelancer profile |
| Client | `https://libyanfreelance.ly/clients/{username}` | Client profile |
| Search | `https://libyanfreelance.ly/projects?q=…` | Browse / filters |
| Messages | `https://libyanfreelance.ly/messages/{conversationId}` | Conversation (auth) |
| Notifications | `https://libyanfreelance.ly/notifications` | Inbox (auth) |

Admin stays on a separate host and is **not** a store deep-link target:

- `https://admin.libyanfreelance.ly`

API never owns marketing deep links:

- `https://api.libyanfreelance.ly`

## Native mapping (future)

1. Associate Universal Links (iOS) / App Links (Android) with `libyanfreelance.ly`.
2. Parse path + query; open the matching screen.
3. If the user is logged out and the screen requires auth, open login then continue to the path.
4. Prefer path-based routes over opaque IDs in marketing shares so WEB and apps share one URL.

## Notification / push payloads

Push `data` should carry an **internal path** (e.g. `/projects/my-slug`), never secrets. Clients resolve it the same way as a deep link.

## Do not

- Invent alternate vanity hosts per platform.
- Embed API keys in links.
- Deep-link into admin from public store builds.
