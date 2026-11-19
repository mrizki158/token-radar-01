// Farm playbooks: one template per protocol category, instantiated with the
// protocol's own name, chains and TVL tier. Every step names a concrete
// action, what it costs and how long it takes. No protocol is special-cased:
// the same category always produces the same shape of plan.

export interface FarmContext {
  name: string;
  category: string | null;
  chains: string[];
  tvlUsd: number;
}

interface Ctx {
  name: string;
  cat: string;
  chainList: string;
  mainChain: string;
  gas: string;
  capital: string;
  tierWord: string;
}

function gasFor(chain: string): string {
  switch (chain) {
    case 'Ethereum':
      return 'about $5-25 in ETH gas per transaction at typical fees';
    case 'Solana':
      return 'about $0.01 in SOL per transaction';
    case 'Bitcoin':
      return 'about $1-5 in BTC network fees per transaction';
    case 'Binance':
      return 'about $0.10-0.30 in BNB per transaction';
    case 'Tron':
      return 'about $0.50-2 in TRX per transaction';
    default:
      return 'about $0.10-1 in gas per transaction on that chain';
  }
}

function tierFor(tvlUsd: number): { capital: string; tierWord: string } {
  if (tvlUsd >= 1_000_000_000) return { capital: '$5,000-25,000', tierWord: 'a top-tier protocol by TVL' };
  if (tvlUsd >= 250_000_000) return { capital: '$1,000-5,000', tierWord: 'a large protocol by TVL' };
  if (tvlUsd >= 50_000_000) return { capital: '$250-1,000', tierWord: 'a mid-size protocol by TVL' };
  return { capital: '$50-250', tierWord: 'an early protocol by TVL' };
}

function chainListOf(chains: string[]): string {
  if (chains.length === 0) return 'its main chain';
  if (chains.length === 1) return chains[0]!;
  if (chains.length === 2) return `${chains[0]} and ${chains[1]}`;
  return `${chains[0]}, ${chains[1]} and ${chains.length - 2} more chain${chains.length - 2 === 1 ? '' : 's'}`;
}

function makeCtx(p: FarmContext): Ctx {
  const tier = tierFor(p.tvlUsd);
  const mainChain = p.chains[0] ?? 'Ethereum';
  return {
    name: p.name,
    cat: p.category ?? 'DeFi',
    chainList: chainListOf(p.chains),
    mainChain,
    gas: gasFor(mainChain),
    capital: tier.capital,
    tierWord: tier.tierWord,
  };
}

type Playbook = (c: Ctx) => string[];

const lending: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain} with a wallet you use only for farming, and read its market list, utilisation and any points or rewards page first; connecting and checking costs nothing but 15 minutes.`,
  `Supply ${c.capital} of a liquid asset (ETH or a major stablecoin) to the main ${c.name} market and leave it in place; the supply transaction costs ${c.gas}. Plan to hold 4-8 weeks, because launch snapshots usually reward time-weighted balances.`,
  `Borrow 40-60% against the supply and re-supply the borrowed asset once, a single loop rather than leverage stacking; two more transactions at ${c.gas} each, about 10 minutes. Check the health factor weekly and top up collateral if it drifts toward liquidation.`,
  `Repay and re-borrow a small amount twice a month and join any governance or rewards programme ${c.name} runs; each touch costs ${c.gas} and about 5 minutes, and steady activity separates a real user from a one-day snapshot wallet.`,
  `Repeat the same supply position on a second chain where ${c.name} is live (${c.chainList}) with half the capital if bridging is cheap; multichain usage is a common extra criterion. Budget one hour a month of upkeep in total.`,
];

const dexs: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain}, connect a dedicated farming wallet and study its pool list and fee tiers before trading; 15 minutes, no cost beyond reading.`,
  `Make 8-12 real swaps a month through ${c.name} with ${c.capital} of working capital, sized like a normal user's trades rather than wash volume; each swap costs ${c.gas} plus the pool fee, roughly 0.05-0.3% of the amount.`,
  `Add ${c.capital} as liquidity to one of the deepest pairs on ${c.name} and keep it there at least 4 weeks; the deposit costs ${c.gas}, and staying in range matters more than the exact week you enter.`,
  `Claim and re-stake any LP rewards or points ${c.name} issues on a weekly rhythm, about 10 minutes and ${c.gas} per claim; a visible, regular history is what most launch criteria count.`,
  `Use ${c.name} on a second deployment (${c.chainList}) for a few swaps a month as well; cross-chain activity is cheap at ${c.gas} per trade and often weighted in points programmes.`,
];

const bridge: Playbook = (c) => [
  `Open ${c.name}, connect a dedicated wallet and check which routes it supports ${c.chainList.includes(' and ') || c.chainList.includes(',') ? `between ${c.chainList}` : `into and out of ${c.mainChain}`}; read the fee schedule and any points page first, 15 minutes and no spend.`,
  `Bridge ${c.capital} of ETH or a major stablecoin across ${c.name} once a week for 6-8 weeks, alternating direction; each crossing costs the bridge fee (usually 0.05-0.5%) plus ${c.gas} on the source chain.`,
  `Vary the routes: use at least three different source-destination pairs ${c.name} offers instead of repeating one corridor, about 5 minutes of planning per trip; route diversity is a common scoring axis.`,
  `Keep a small balance (about 10% of your capital) parked on the destination side for a few days after each crossing rather than bridging straight back; instant round trips look like farming and are often filtered out.`,
  `If ${c.name} runs a points or quests programme, complete every low-cost task in it and keep screenshots of your transaction hashes; enrolment is free and the admin time is about 30 minutes a month.`,
];

const yieldVault: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain} and read how its vaults earn, what the withdrawal terms are and whether a points programme exists; 20 minutes of reading before any deposit.`,
  `Deposit ${c.capital} of a major stablecoin or ETH into the flagship ${c.name} vault; the deposit costs ${c.gas}. Leave it for at least 6 weeks, since vault-share snapshots tend to weight holding time.`,
  `Split a second, smaller deposit (about a third of the first) into a different ${c.name} vault or strategy so your history shows more than one product; one more transaction at ${c.gas}.`,
  `Harvest or compound the yield once a month and keep the vault shares in the same wallet; each harvest costs ${c.gas} and 5 minutes, and an untouched, compounding position reads as a genuine user.`,
  `Watch ${c.name}'s announcements for a points season or a new chain launch (${c.chainList}); early depositors in new vaults are frequently scored separately, so keep ${c.capital} of dry powder ready.`,
];

const liquidStaking: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain}, connect a fresh wallet and confirm the staking terms: unbonding period, fees and where the liquid staking token trades; 15 minutes, no cost.`,
  `Stake ${c.capital} of the chain's native asset through ${c.name} and hold the liquid staking token it issues; the stake transaction costs ${c.gas}. Plan a horizon of at least 2-3 months, matching the unbonding period.`,
  `Put about a third of the liquid staking token to work in one DeFi integration ${c.name} lists (a lending market or a liquidity pool) so the position shows real usage; one transaction at ${c.gas}, plus the host protocol's own fees.`,
  `Add a small top-up stake (about 10% of the first) once a month; each costs ${c.gas} and 5 minutes, and a staking history with regular additions reads very differently from a single snapshot-day deposit.`,
  `Follow ${c.name}'s governance and any points programme, and keep the position through any announced snapshot window; exiting early for a few percent of yield forfeits the launch allocation the position was building toward.`,
];

const rwa: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain} and read exactly what real-world asset backs each product, the minimum ticket and the redemption terms; RWA products vary widely, so give this 30 minutes before spending anything.`,
  `Complete any KYC or eligibility check ${c.name} requires, which is free but can take 1-3 days to clear; do this first, because farming steps that need verification cannot be backdated.`,
  `Buy ${c.capital} of the most liquid ${c.name} product (usually the treasury or credit token with the deepest secondary market); the purchase costs ${c.gas} plus any platform spread, and holding it is the core of the position.`,
  `Hold for at least a full quarter and collect the yield distributions in the same wallet; each claim costs ${c.gas}, and a clean hold-and-collect history is the usage pattern these platforms can actually verify.`,
  `If ${c.name} lists the token on a partner chain or lending market (${c.chainList}), supply a small part there too; one extra position at ${c.gas} shows ecosystem usage beyond a passive buy.`,
];

const cdp: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain}, connect a dedicated wallet and study its collateral types, stability fees and liquidation rules; 20 minutes of reading, because CDP positions can be liquidated.`,
  `Deposit ${c.capital} of ETH or a liquid staking token as collateral and mint the stablecoin at a conservative 40-50% of the maximum allowed; opening the vault costs ${c.gas}.`,
  `Use the minted stablecoin productively (a savings vault or a liquidity pool) rather than swapping it straight back; one more transaction at ${c.gas}, and genuine circulation is what a stablecoin issuer can measure.`,
  `Adjust the position monthly: top up collateral if the price falls, repay a slice if it rises; each adjustment costs ${c.gas} and 5 minutes, and an actively managed vault is both safer and a stronger usage signal.`,
  `Keep the vault open for at least 8 weeks and through any points season ${c.name} announces; closing early forfeits the time-weighted history that launch criteria usually reward.`,
];

const derivatives: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain}, connect a dedicated wallet and read its fee schedule, funding rates and any points programme; 20 minutes, and note that perps can lose the whole margin.`,
  `Deposit ${c.capital} as margin and trade small, deliberate positions (2-3 a week, held for hours rather than seconds); each open and close costs ${c.gas} plus trading fees of roughly 0.02-0.06% of notional.`,
  `Keep total leverage at or below 3x and size positions so a normal week of volatility cannot liquidate you; the goal is a long, ordinary trading history, not a profit record. Budget 30 minutes a week.`,
  `Provide liquidity to ${c.name}'s vault or pool product as well if it has one, with about a third of your capital; the deposit costs ${c.gas} and LP history is often scored separately from trading volume.`,
  `Trade on a second market or chain ${c.name} offers (${c.chainList}) once a month; breadth across its markets is a common points multiplier and costs only ${c.gas} per extra trade.`,
];

const cex: Playbook = (c) => [
  `Create an account with ${c.name} and complete its identity verification, which is free and usually clears within a day; use your real details, because exchange allocations are paid only to verified accounts.`,
  `Deposit ${c.capital} and make your normal spot trades on ${c.name} instead of another venue for 6-8 weeks; exchange trading fees run about 0.1% per trade, and ordinary, varied activity is the whole strategy here.`,
  `Hold a working balance on ${c.name} between trades rather than withdrawing after every order; balances held over time are the simplest signal an exchange can snapshot if it ever issues or expands a token.`,
  `Join every free campaign ${c.name} runs (launchpools, learn-and-earn, staking of stablecoins); each takes about 10 minutes, costs nothing beyond funds you already hold, and builds a visible activity record.`,
  `Use one extra product, such as the earn or card product, with a small amount; product breadth is how exchanges segment loyal users, and it costs only the 15 minutes it takes to set up.`,
];

const chain: Playbook = (c) => [
  `Bridge ${c.capital} of ETH or stablecoins to ${c.name} from Ethereum and set the chain up in your wallet; the bridge costs about $5-25 in source-chain gas plus any bridge fee, and takes 10-30 minutes to arrive.`,
  `Become a regular user of ${c.name}: make 3-5 transactions a week on its main apps (a swap, a lending deposit, an NFT mint) so the address accrues active days; gas on the chain itself is usually under $0.10 a transaction.`,
  `Hold a balance on ${c.name} continuously rather than bridging in and out; chain launch criteria typically count active months and retained balances, so plan for at least one transaction in 8 different weeks.`,
  `Deploy or interact with one contract if you are technical, or join the chain's official quests and testnet programmes, which are free and take about an hour a month; early-builder and quest records are often rewarded separately.`,
  `Keep records of your bridge transactions into ${c.name}; if a launch ever asks users to prove early activity, the hashes are the proof, and saving them costs nothing.`,
];

const curator: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain} and read which vaults or markets it curates, its own fee share and any rewards it passes through; 20 minutes, because curator products sit on top of a host protocol.`,
  `Deposit ${c.capital} into the largest ${c.name} vault on its host protocol and hold the shares; the deposit costs ${c.gas} on ${c.mainChain}. Plan for at least 6 weeks of holding.`,
  `Spread a second deposit (about a third of the first) into a different ${c.name} vault with a different risk profile; one more transaction at ${c.gas}, and using more than one curated product is the usage a curator can verify.`,
  `Claim rewards monthly and re-deposit them into the same vault; each claim costs ${c.gas} and 5 minutes, and compounding in place keeps your full history in one wallet.`,
  `Follow ${c.name}'s risk reports and governance posts on its host protocol; curators that launch tokens tend to reward depositors of long standing, so avoid hopping between curators every few weeks.`,
];

const allocator: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain}, connect a dedicated wallet and read its allocation strategy, fees and lock-up terms; 20 minutes before any deposit, since allocator vaults can have withdrawal queues.`,
  `Deposit ${c.capital} into the main ${c.name} vault and keep the position for at least a full quarter; the deposit costs ${c.gas}, and allocator launches, when they come, reward duration above size.`,
  `Add a small monthly top-up (about 10% of the initial deposit); each costs ${c.gas} and 5 minutes, building the steady-depositor pattern that time-weighted criteria measure.`,
  `If ${c.name} offers more than one vault or chain (${c.chainList}), open a second small position there rather than enlarging the first; breadth across its products is verifiable usage.`,
  `Track ${c.name}'s reports and any points or loyalty programme, and keep records of your deposits; enrolment in its programmes is free and takes about 15 minutes a month.`,
];

const generic: Playbook = (c) => [
  `Open ${c.name} on ${c.mainChain} with a wallet you use only for farming and read its documentation, fee schedule and any points or rewards page; 20 minutes, no spend, and it is ${c.tierWord}.`,
  `Use the core ${c.cat} product of ${c.name} with ${c.capital} of capital in the ordinary way a real user would; the main transaction costs ${c.gas}. A genuine position, held over time, is the foundation every launch criterion builds on.`,
  `Repeat a small action weekly for 6-8 weeks (a deposit, a trade or a claim, whichever ${c.name} centres on); each costs ${c.gas} and about 5 minutes, and weekly active weeks are the most common scoring unit.`,
  `Extend the same usage to a second chain where ${c.name} is deployed (${c.chainList}) with about a third of the capital; multichain histories are frequently weighted above single-chain ones.`,
  `Join ${c.name}'s official community channels and any quests or points programme it runs, and keep your transaction hashes saved; enrolment is free, admin is about 30 minutes a month, and records are your proof if criteria are ever published.`,
];

const ALIASES: Record<string, Playbook> = {
  'Uncollateralized Lending': lending,
  'CDP Manager': cdp,
  'Options Vault': derivatives,
  'Interest Rate Derivatives': derivatives,
  'Liquidity Manager': yieldVault,
  'Options': derivatives,
};

const PLAYBOOKS: Record<string, Playbook> = {
  Lending: lending,
  Dexs: dexs,
  Bridge: bridge,
  'Cross Chain Bridge': bridge,
  'Canonical Bridge': bridge,
  Yield: yieldVault,
  'Yield Aggregator': yieldVault,
  'Liquid Staking': liquidStaking,
  'Liquid Restaking': liquidStaking,
  Restaking: liquidStaking,
  'Restaked BTC': liquidStaking,
  'Staking Pool': liquidStaking,
  RWA: rwa,
  CDP: cdp,
  Derivatives: derivatives,
  CEX: cex,
  CeDeFi: cex,
  Chain: chain,
  'Risk Curators': curator,
  'Onchain Capital Allocator': allocator,
  'Basis Trading': yieldVault,
  Indexes: yieldVault,
  'Leveraged Farming': yieldVault,
  Farm: yieldVault,
};

export function farmStepsFor(p: FarmContext): string[] {
  const book = (p.category !== null ? (PLAYBOOKS[p.category] ?? ALIASES[p.category]) : undefined) ?? generic;
  return book(makeCtx(p));
}
