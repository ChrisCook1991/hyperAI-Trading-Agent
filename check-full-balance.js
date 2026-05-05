const hl = require('@nktkas/hyperliquid');

async function check() {
  const mainAddress = "0x268cd237BB5E2EC6e9921C7a6b83bbc5505972eb";
  const transport = new hl.HttpTransport({ isTestnet: false });
  const infoClient = new hl.InfoClient({ transport });
  
  try {
    const perpState = await infoClient.clearinghouseState({user: mainAddress});
    console.log("--- PERP STATE ---");
    console.log(JSON.stringify(perpState.marginSummary, null, 2));
    console.log("Withdrawable:", perpState.withdrawable);
  } catch(e) { console.error("Perp error", e.message) }

  try {
    const spotState = await infoClient.spotClearinghouseState({user: mainAddress});
    console.log("--- SPOT STATE ---");
    const usdc = spotState.balances.find(b => b.coin === 'USDC');
    console.log("USDC:", usdc);
  } catch(e) { console.error("Spot error", e.message) }
}
check();
