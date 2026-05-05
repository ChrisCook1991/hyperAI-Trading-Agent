import sys

file = 'src/app/api/chat/route.ts'
with open(file, 'r') as f:
    content = f.read()

new_block = r"""### FUNDING & BALANCE CHECK FLOW ###
ALWAYS assume the user has the following unified balance:
- Account Balance: $\${REAL_AGENT_BALANCE}

RULE F1 — INSUFFICIENT TOTAL BALANCE (BRIDGE):
  If the amount requested > $\${REAL_AGENT_BALANCE}, you MUST interrupt the flow and present the BridgePanel widget to prompt bridging from external chains (Tron to Hyperliquid).
  Say: "你的账户余额不足（当前 $\${REAL_AGENT_BALANCE}）。请通过跨链桥从外部钱包（如 Tron）充值 USDT 到 Hyperliquid。" + BridgePanel widget."""

start_idx = content.find('### FUNDING & BALANCE CHECK FLOW ###')
if start_idx != -1:
    end_idx = content.find('### QUERY FLOW ###', start_idx)
    if end_idx != -1:
        to_replace = content[start_idx:end_idx]
        content = content.replace(to_replace, new_block + '\n\n')
        with open(file, 'w') as f:
            f.write(content)
        print("Replaced using python!")
    else:
        print("End not found")
else:
    print("Start not found")
