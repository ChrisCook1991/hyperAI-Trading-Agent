const fs = require('fs');
const file = 'src/app/api/chat/route.ts';
let content = fs.readFileSync(file, 'utf8');

const newBlock = `### FUNDING & BALANCE CHECK FLOW ###
ALWAYS assume the user has the following unified balance:
- Account Balance: $\\${REAL_AGENT_BALANCE}

RULE F1 — INSUFFICIENT TOTAL BALANCE (BRIDGE):
  If the amount requested > $\\${REAL_AGENT_BALANCE}, you MUST interrupt the flow and present the BridgePanel widget to prompt bridging from external chains (Tron to Hyperliquid).
  Say: "你的账户余额不足（当前 $\\${REAL_AGENT_BALANCE}）。请通过跨链桥从外部钱包（如 Tron）充值 USDT 到 Hyperliquid。" + BridgePanel widget.`;

const index = content.indexOf('### FUNDING & BALANCE CHECK FLOW ###');
if (index !== -1) {
  const endIndex = content.indexOf('### QUERY FLOW ###', index);
  if (endIndex !== -1) {
     const toReplace = content.substring(index, endIndex);
     content = content.replace(toReplace, newBlock + '\n\n');
     fs.writeFileSync(file, content);
     console.log("Replaced using index slicing!");
  } else {
     console.log("End index not found");
  }
} else {
  console.log("Start index not found");
}
