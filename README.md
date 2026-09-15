# @pedi-bp/core

Pediatric blood pressure percentile calculator — AAP 2017, NHLBI, ERICA (Brazilian), Lo 2013, Gemelli.

Zero dependencies. Works in Node.js, browsers, and edge runtimes.

## Features

- **5 data sources**: AAP 2017, NHLBI, ERICA (Brazilian data), Lo 2013, Gemelli 1990
- **Automatic cascade**: selects the best source based on age, sex, and height availability
- **Classification**: AAP 2017 guidelines (percentile-based < 13y, absolute thresholds >= 13y)
- **Transparent source reporting**: shows which source was used and available alternatives
- **Height percentile**: CDC 2000 growth charts embedded (no external dependency)
- **Input validation**: rejects NaN, Infinity, out-of-range values
- **i18n**: pt-BR, en, es
- **Documented data provenance**: origin and reuse terms stated per dataset in [`NOTICE.md`](NOTICE.md)

## Data Sources

| Source | Age Range | Height | Method |
|--------|-----------|--------|--------|
| Gemelli 1990 | 1–9 months | No | Gaussian |
| AAP 2017 (Flynn) | 1–17 years | Yes (7 percentile bins) | Gaussian |
| NHLBI Fourth Report | 1–17 years | Yes / P50 fallback | Gaussian |
| Lo 2013 | 3–17 years | No | Gaussian |
| ERICA (Brazil) | 12–17 years | Yes (CDC z-score) | Polynomial regression |

### Automatic Cascade (source = 'auto')

```
Gemelli (<12mo) → AAP 2017 (1–12y + height) → ERICA (12–17y + height)
                → Lo 2013 (3–17y, no height) → NHLBI (12–35mo, P50 fallback)
```

## Install

```bash
npm install @pedi-bp/core
```

## Usage

```typescript
import { calculateBp, bpAtPercentile, availableSources } from '@pedi-bp/core';

// Calculate BP percentiles and classification
const result = await calculateBp({
  sex: 'male',
  ageMonths: 120,   // 10 years
  heightCm: 140,
  systolic: 115,
  diastolic: 75,
});

console.log(result.classification.label);    // "PA Elevada"
console.log(result.source.used);             // "aap2017"
console.log(result.systolic?.percentile);    // ~92

// Inverse: BP value at a given percentile
const bp95 = await bpAtPercentile({
  sex: 'male',
  ageMonths: 120,
  heightCm: 140,
  percentile: 95,
  type: 'systolic',
});

// List available sources for a patient
const sources = availableSources('male', 120, 140);
```

## API

### `calculateBp(input, locale?): Promise<BpResult>`

Calculate BP percentiles and classification.

**Input:**
- `sex`: `'male'` | `'female'`
- `ageMonths`: 1–204
- `heightCm?`: height in cm (enables height-dependent lookup)
- `systolic?`: systolic BP in mmHg
- `diastolic?`: diastolic BP in mmHg
- `source?`: `'auto'` (default) | `'aap2017'` | `'nhlbi'` | `'erica'` | `'lo2013'`

### `bpAtPercentile(input): Promise<number>`

Compute BP value at a given percentile (inverse function).

### `availableSources(sex, ageMonths, heightCm?): BpSourceInfo`

List available sources for a given patient profile.

## Classification (AAP 2017)

### Children < 13 years (percentile-based)

| Category | SBP | DBP |
|----------|-----|-----|
| Normal | < P90 | < P90 |
| Elevated | P90 to < P95 or >= 120/80 | P90 to < P95 |
| HTN Stage 1 | P95 to P95+12 | P95 to P95+12 |
| HTN Stage 2 | >= P95+12 | >= P95+12 |

### Adolescents >= 13 years (absolute thresholds)

| Category | SBP | DBP |
|----------|-----|-----|
| Normal | < 120 | < 80 |
| Elevated | 120–129 | < 80 |
| HTN Stage 1 | 130–139 | 80–89 |
| HTN Stage 2 | >= 140 | >= 90 |

Classification uses the **worst** of SBP and DBP.

## Formulas

- **Gaussian**: `z = (BP - mean) / SD`, percentile = normal CDF
- **ERICA**: polynomial regression `BP = f(age, z_height)` with 4th-degree terms
- **Height percentile**: CDC 2000 LMS method (recumbent < 24mo, standing >= 24mo)

## Data Sources

The six datasets do not share a single rights status. Each is documented in full — origin,
extraction method and reuse terms — in [`NOTICE.md`](NOTICE.md).

| Dataset | Reference | How it got here | Cleared for commercial reuse? |
|---|---|---|---|
| AAP 2017 | Flynn JT et al. *Pediatrics* 2017;140(3):e20171904 | Gaussian parameters re-derived by independent least-squares fit over the published tables | Probably — argument stated, not counsel-reviewed |
| NHLBI | *Pediatrics* 2011;128(Suppl 5):S213-56 | Same independent fit; US federal government work | Yes |
| ERICA | Jardim TV et al. *J Pediatr (Rio J)* 2020;96(2):168-176 | Coefficients from the published supplementary table | **No** — CC BY-NC-ND 4.0 |
| Gemelli | Gemelli M et al. *Eur J Pediatr* 1990;149(5):318-20 | Published values verbatim; copy taken from the GPL-2 `pedbp` package | Unresolved |
| Lo 2013 | Lo JC et al. *Pediatrics* 2013;131(2):e415-24 | Published values verbatim; copy taken from the GPL-2 `pedbp` package | Unresolved |
| CDC 2000 | Kuczmarski RJ et al. *Vital Health Stat 11* 2002;(246) | Official CDC files, verified by `scripts/verify-cdc-provenance.mjs` (510/510 points) | Yes |

Selecting `source: 'erica'` — or letting the automatic cascade reach it for a 12-17-year-old
with height available — is the one path through this package that touches NonCommercial
material.

## License

The **code** is MIT (see [`LICENSE`](LICENSE)), Copyright (c) 2026 Iuri Leão de Almeida.

The **data is a separate layer.** MIT covers this package's source; it does not and cannot
re-license the reference tables embedded in `src/data/`, which come from third parties and
carry their own terms. See [`NOTICE.md`](NOTICE.md) before redistributing — especially
commercially.
