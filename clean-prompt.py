import sys

file = 'src/app/api/chat/route.ts'
with open(file, 'r') as f:
    content = f.read()

# Replace TransferPanel doc
content = content.replace(
    'WHEN: user wants to transfer funds between Master Account and Agent Account, OR when Agent Account balance ($\${REAL_AGENT_BALANCE}) is insufficient but Master Account ($2000) can cover the difference.',
    'WHEN: user wants to transfer funds (Disabled for Unified Margin).'
)
content = content.replace(
    '"availableBalance": 2000',
    '"availableBalance": \${REAL_AGENT_BALANCE}'
)

# Replace BridgePanel doc
content = content.replace(
    'WHEN: user wants to bridge assets cross-chain, OR when both Agent ($\${REAL_AGENT_BALANCE}) and Master ($2000) accounts combined have insufficient balance for the transaction.',
    'WHEN: user wants to bridge assets cross-chain, OR when Account ($\${REAL_AGENT_BALANCE}) has insufficient balance.'
)

with open(file, 'w') as f:
    f.write(content)
print("Cleaned prompt!")
