# Odyssey WhatsApp Gateway

Odyssey is a unified, intelligent WhatsApp API gateway built using Node.js, TypeScript, and the Baileys library. It acts as a central hub for personal microservices, receiving inbound WhatsApp messages and routing them intelligently to downstream applications via webhooks. It also provides a secure egress API for those applications to reply to the user.

## Features

- **Baileys-Powered**: Utilises the `@whiskeysockets/baileys` library for stable, non-official WhatsApp Web API connectivity.
- **Four-Tier Routing**:
  - **Local Commands**: Handles commands like `/remind` and `/help` in-process — no external call needed.
  - **Explicit Commands**: Routes messages starting with predefined prefixes (e.g., `/task`, `/otp`) to specific apps.
  - **Session State Context**: Temporarily locks the routing to a specific app when a conversational session is active.
  - **AI Intent Classification**: Fallback mechanism using **Google Gemini Flash** to infer which downstream app should handle conversational input.
- **Security-First**:
  - **Inbound Whitelist**: Silently drops messages from non-whitelisted numbers and notifies the admin.
  - **Egress API Keys**: Requires an `x-api-key` header to send messages to WhatsApp.
  - **Webhook Signatures**: Sends a configured `x-gateway-secret` to downstream apps to verify the request origin.
- **Docker Ready**: Designed for containerised deployments (Railway, Docker Compose).
- **Swagger Documentation**: Built-in interactive API docs.

## Architecture

```mermaid
flowchart TD
    User([User on WhatsApp]) <-->|Baileys / WebSockets| Odyssey[Odyssey Gateway]

    subgraph Routing Logic
    Odyssey --> RouteCheck{Routing Rule}
    RouteCheck -->|0. Local Command| Local[/remind, /help]
    RouteCheck -->|1. Explicit Command| AppWebhook
    RouteCheck -->|2. Active Session| AppWebhook
    RouteCheck -->|3. Gemini Intent Match| AppWebhook
    RouteCheck -.->|4. Fallback| Drop[Log & Ignore]
    end

    subgraph Downstream Apps
    AppWebhook((POST /webhook)) --> LIAW[Live in a Week]
    AppWebhook --> Notes[Notes & Links Service]
    AppWebhook --> Other[Other Services]
    end

    LIAW -->|POST /send| Egress(Odyssey Egress API)
    Notes -->|POST /send| Egress
    Other -->|POST /send| Egress

    Egress --> User
```

## Setup & Local Development

### 1. Requirements
- Node.js v20+
- Docker & Docker Compose (optional)
- A WhatsApp account to scan the QR code

### 2. Installation
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file based on `.env.example`:
```ini
PORT=3000
GATEWAY_API_KEY=your_super_secret_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_NUMBERS=919876543210  # First entry is the admin — receives alerts about unauthorized senders
```

### 4. Configuration (`src/config/index.ts`)
Downstream apps, their webhook URLs, and explicit routing prefixes are defined directly in `src/config/index.ts`. Edit that file to add or modify apps and commands. `local_commands` lists commands handled in-process (e.g. `/remind`, `/help`).

### 5. Running the Gateway
Run via Docker:
```bash
docker compose up --build
```
Or run natively:
```bash
npm run dev
```

### 6. WhatsApp Authentication
When the application starts, it will print a QR code in the terminal. Open WhatsApp on your phone -> **Linked Devices** -> **Link a Device**, and scan the QR code. Your session keys will be saved in the `auth_info_baileys` folder.

## Local Commands

Odyssey handles these commands in-process — no webhook call is made.

| Command | Description |
|---|---|
| `/remind <date-or-duration> <text>` | Set a one-off reminder |
| `/help` | Show Odyssey commands and onboarded services |
| `/help <service>` | Forward `/help` to a specific service |

### Date shortcuts for `/remind`

| Format | Meaning |
|---|---|
| `tomorrow`, `tmrw` | Next day at 9 AM |
| `tomorrow 5pm` | Next day at 5 PM |
| `nextweek` | Next Monday at 9 AM |
| `nextweek 10am` | Next Monday at 10 AM |
| `nextmonth` | 30 days from now at 9 AM |
| `7d`, `7days` | 7 days from now at 9 AM |
| `29d` | 29 days from now at 9 AM |

Time is optional on all shortcuts. Supported time formats: `5pm`, `10am`, `14:30`, `2:30pm`.

### Duration format for `/remind`

Plain durations also work: `30 min`, `2h`, `1 day 3h`.

## Egress API Reference

Odyssey exposes REST endpoints for downstream apps. Once running, view the interactive Swagger docs at:
`http://localhost:3000/docs`

### Send Message
**`POST /send`**

**Headers:**
- `x-api-key`: Must match `GATEWAY_API_KEY` in `.env`

**Body:**
```json
{
  "to": "919876543210",
  "text": "Task saved successfully!"
}
```

## Inbound Webhook Payload (Contract)

When Odyssey receives a WhatsApp message from a whitelisted number, it determines the target app and sends a `POST` request to the app's `webhook_url` with the following payload:

**Headers:**
- `x-gateway-secret`: The app's configured `webhook_secret` (for verification)
- `content-type`: `application/json`

**Body:**
```json
{
  "from": "919876543210",
  "raw_text": "Buy milk today",
  "intent": "/task",
  "app": "live_in_a_week",
  "entities": {},
  "timestamp": "2026-08-31T00:00:00.000Z",
  "push_name": "John"
}
```
*Note: Downstream apps should handle these requests asynchronously or return a `200 OK` quickly. They should use the Egress API (`POST /send`) to send any actual replies.*

## Deployment
Odyssey is designed to be deployed easily on platforms like **Railway** or AWS.
1. Deploy using the included `Dockerfile`.
2. Ensure you mount a persistent volume to `/app/auth_info_baileys` to persist your WhatsApp session keys between deployments/restarts.
