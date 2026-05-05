const hl = require('@nktkas/hyperliquid');

async function check() {
  const mainAddress = process.env.HYPERLIQUID_MAIN_ADDRESS;
  console.log("Main Address from ENV:", mainAddress);
  
  if (!mainAddress) {
    console.log("Please set HYPERLIQUID_MAIN_ADDRESS");
    return;
  }
  
  const transport = new hl.HttpTransport({ isTestnet: false });
  const infoClient = new hl.InfoClient({ transport });
  
  try {
    const perpState = await infoClient.clearinghouseState(mainAddress);
    console.log("Perp Margin:", perpState.marginSummary.accountValue);
  } catch(e) { console.error("Perp error", e.message) }

  try {
    const spotState = await infoClient.spotClearinghouseState(mainAddress);
    const usdcBal = spotState.balances.find(b => b.coin === 'USDC');
    console.log("Spot USDC:", usdcBal ? usdcBal.total : 0);
  } catch(e) { console.error("Spot error", e.message) }
}
check();
