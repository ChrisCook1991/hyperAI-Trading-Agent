# HyperAI Agent

HyperAI is a decentralized AI trading assistant built for the **Hyperliquid** ecosystem. It utilizes a **GenUI (Generative UI) Architecture** to convert natural language intents into highly interactive, secure trading components.

## 🌟 Key Features

1. **Natural Language Trading**: Ask the AI to open/close positions, adjust leverage, or set TP/SL. The AI parses the intent and dynamically renders a preview card.
2. **Real-Time Context**: The AI connects natively to the Hyperliquid blockchain, continuously injecting real-time market prices, wallet balances, and open positions into its context.
3. **GenUI (Generative UI) Architecture**: Instead of generating raw markdown text, the AI generates structural JSON definitions (Component Specs), which are securely mapped to real React components on the client-side.
4. **Strict Security Model**: The AI **cannot** execute trades on its own. It only prepares the UI. All actions require a human click to execute via secure backend cryptography.

---

## 🏗️ Architecture

The project employs a robust 3-layer architecture for absolute security and flexibility:

* **Layer 1: Intent Parsing & Spec JSON (AI)**
  The LLM (Claude 3.5 Sonnet via OpenRouter) parses the user's request and outputs a structured `Spec JSON` containing component declarations.
* **Layer 2: Component Registry (Frontend)**
  A strict client-side mapping engine (`src/lib/component-registry.tsx`). It reads the `Spec JSON` and instantiates real React components (e.g., `OrderPreviewCard`, `RiskPreferenceSelector`). It never renders raw HTML, preventing XSS and injection attacks.
* **Layer 3: Agent Wallet Execution (Backend)**
  When the user confirms a trade via the UI, the frontend securely requests the backend `/api/trade` route. The backend signs the transaction using the **Agent Wallet Private Key** mapped to the user's master address via Hyperliquid's native API authentication.

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- NPM or Yarn

### 2. Installation
```bash
git clone <repository-url>
cd hyperai-agent
npm install
```

### 3. Environment Variables
Copy the `.env.example` file and create a `.env.local` file:
```bash
cp .env.example .env.local
```

Fill in the required variables:
```env
# AI Model Provider
OPENROUTER_API_KEY="sk-or-v1-..."

# Hyperliquid Agent Wallet (Used to sign transactions on the backend)
HYPERLIQUID_PRIVATE_KEY="0x..."

# Your Real Wallet Address (Used to query real-time balance and positions)
HYPERLIQUID_MAIN_ADDRESS="0x..."
HYPERLIQUID_ENV="mainnet"
```
> **Security Notice**: Your `HYPERLIQUID_PRIVATE_KEY` is completely isolated on the server-side Next.js node runtime. It is **never** sent to the frontend or exposed to the user.

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with your AI agent.

---

## 🧩 Component Registry
The GenUI engine supports a highly curated set of robust trading UI widgets:
- `OrderPreviewCard` (Confirming perp/spot trades)
- `StrategyPreviewCard` (Automated strategy setup)
- `AmountInput` / `TpSlInput` / `LeverageSlider` (Interactive parameter inputs)
- `TradingDashboard` (Monitoring live strategies)

---

## 🔒 Security Best Practices
- **Do not commit `.env.local` to Git.** The `.gitignore` file is pre-configured to ignore all `.env` files.
- **Agent Keys**: Always use a dedicated Hyperliquid Agent Key/Session Key with limited permissions (no withdrawal rights) as the `HYPERLIQUID_PRIVATE_KEY`.

---
*Built with [Next.js](https://nextjs.org/) and [@nktkas/hyperliquid](https://github.com/nktkas/hyperliquid).*
