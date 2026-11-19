# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mrizki158/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mrizki158/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

An entry for make.fun's **token-radar-01** bounty ("Build the best token launch radar").

The program reads the sealed DefiLlama snapshot (`/input/snapshot.json` at grade time) and ranks
**every** protocol that records no token — 342 of the snapshot's 758 — by an implied launch value:

```
implied value = TVL x category multiple x momentum x maturity
```

- **Category multiple** — the median market-cap/TVL of the snapshot's own tokened protocols in the
  same category, computed at runtime; categories with fewer than 3 tokened peers (or none) fall back
  to the global tokened median.
- **Momentum** — the 7-day TVL change, clamped to [-60%, +120%] and mapped onto [0.80, 1.40];
  unreported is neutral.
- **Maturity** — days since DefiLlama began tracking the protocol, ramping from 0.80 to 1.20 over
  five years; unknown is neutral.

No protocol name is special-cased: the same figures always produce the same value, and two runs
write identical bytes.

Each row also carries a farm plan: a per-category playbook (lending, DEXs, bridges, yield vaults,
liquid staking, RWA, CDPs, derivatives, exchanges, chains, curators, allocators) instantiated with
the protocol's name, chains and TVL tier, every step with a concrete action, a cost and a time
commitment.

## Layout

- `main.ts` — entrypoint: snapshot in, `board.json` + `data.js` + `dashboard/` + `screenshots/` +
  `dossier.json` out.
- `lib/model.ts` — the value model, the board and its self-check.
- `lib/farm.ts` — the farm playbooks.
- `dashboard/` — a static, offline page (sortable, filterable, per-protocol detail) reading `data.js`.
- `screenshots/` — the board, a detail view and a filtered view, rendered from the real page.
- `vendor/makefun-board.ts` — the vendored make.fun dossier library, unchanged.

## Run locally

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=qe91xxve&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
