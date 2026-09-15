# NOTICE — Provenance and rights of the embedded reference data

The **source code** of `@pedi-bp/core` is licensed under the MIT License
(see [`LICENSE`](LICENSE)), Copyright (c) 2026 Iuri Leão de Almeida.

**The MIT License covers the code only.** It does not, and cannot, re-license the
blood-pressure and growth reference datasets embedded in `src/data/`. Those tables
originate from third parties and carry their own terms, described below. Anyone
redistributing this package or building on it — particularly for commercial use —
should evaluate these terms independently.

The six datasets do **not** share a single rights status. Two are public-domain works of
the United States government, two were re-derived from published tables by independent
computation, one carries a NonCommercial licence, and two are factual values whose only
available copy sat inside a GPL-2 repository. Each is stated separately below, with the
method needed to reproduce the claim rather than to take it on trust.

---

## 1. AAP 2017 — Flynn et al. Clinical Practice Guideline

**Files:** `aap2017-boys.json`, `aap2017-girls.json`

**Source:** Flynn JT, Kaelber DC, Baker-Smith CM, et al. *Clinical Practice Guideline for
Screening and Management of High Blood Pressure in Children and Adolescents.*
Pediatrics. 2017;140(3):e20171904. DOI
[10.1542/peds.2017-1904](https://doi.org/10.1542/peds.2017-1904).
Percentile values corresponding to Supplementary Tables S3 and S4.

**How the input was obtained.** The percentile tables were not transcribed from the
article. They were taken from `data-raw/flynn2017_bp_boys.dat` and `_girls.dat` in the
[`pedbp`](https://github.com/dewittpe/pedbp) R package, which is licensed **GPL-2**;
the local copies are byte-identical to that repository (verified 2026-09-15). Earlier
internal notes named the files without stating where they came from, which invited the
reading that they had been extracted from the publication directly. They had not.

**Derivation.** The shipped values are **not** those percentiles. They are Gaussian
parameters (μ, σ) fitted by ordinary least squares to the P50/P90/P95 points, computed
independently with NumPy and cross-validated against Nelder-Mead optimisation (maximum
difference 0.000000). Maximum reconstruction error 1.22 mmHg. The derivation script and
validation report ship with this package under `research/`; the raw input tables do not,
for the reason given at the end of this document.

**Rights.** The published tables are Copyright © 2017 American Academy of Pediatrics.
No permission has been sought from the AAP. The position taken here is that the
percentile values are measured facts, which attract thin or no copyright protection
(*Feist Publications v. Rural Telephone Service*, 499 U.S. 340 (1991)), and that the
fitted parameters are a separate work produced by independent computation over those
facts. **That is an argument, not a legal opinion, and no counsel has reviewed it.**

---

## 2. NHLBI — Fourth Report / Integrated Guidelines

**Files:** `nhlbi-boys.json`, `nhlbi-girls.json`

**Source:** Expert Panel on Integrated Guidelines for Cardiovascular Health and Risk
Reduction in Children and Adolescents. Pediatrics. 2011;128(Suppl 5):S213–S256. DOI
[10.1542/peds.2009-2107C](https://doi.org/10.1542/peds.2009-2107C). Tables 3–6.

**How the input was obtained.** As in §1, from `data-raw/nhlbi_bp_norms_boys.csv` and
`_girls.csv` in the GPL-2 `pedbp` package, byte-identical (verified 2026-09-15) — not
transcribed from the journal. Here the point is largely moot: the underlying tables are
a US government work, as stated below.

**Derivation.** Same independent Gaussian fit as §1, over the published P50/P90/P95/P99
points. Maximum reconstruction error 0.63 mmHg.

**Rights.** The Expert Panel report was prepared under the National Heart, Lung, and
Blood Institute, a United States federal agency. Works prepared by officers of the US
government in the course of their duties are not subject to copyright in the United
States (17 U.S.C. § 105). Note that the *journal presentation* of the report may carry
its own copyright claim, which is distinct from the underlying tabulated values.

---

## 3. ERICA — Brazilian adolescent reference

**Files:** `erica-boys.json`, `erica-girls.json`

**Source:** Jardim TV, Rosner B, Bloch KV, et al. *Blood pressure reference values for
Brazilian adolescents: data from the Study of Cardiovascular Risk in Adolescents —
ERICA Study.* J Pediatr (Rio J). 2020;96(2):168–176. DOI
[10.1016/j.jped.2018.09.003](https://doi.org/10.1016/j.jped.2018.09.003).
Polynomial regression coefficients from Supplementary Table S1, extracted directly from
the published supplementary file. No third-party package is involved.

**Rights — the most restrictive of the six.**
Crossref reports the publisher-declared licence for the version of record as
**[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)**. Two clauses
matter here:

- **NC (NonCommercial)** — commercial use requires permission from the rights holder.
- **ND (NoDerivatives)** — distribution of adapted material is not permitted.

> **Caveat.** Earlier internal notes for this package described the ERICA supplementary
> material as CC-BY. That was incorrect, and is corrected here. Whether shipping the
> published regression coefficients constitutes a "derivative" under the ND clause, or
> whether the coefficients are unprotectable facts about a dataset, is **not settled in
> this document**. Anyone redistributing `@pedi-bp/core` commercially should resolve the
> ERICA terms with the publisher or with counsel before relying on it.

---

## 4. Gemelli 1990 — infant reference

**Files:** `gemelli-boys.json`, `gemelli-girls.json`

**Source:** Gemelli M, Manganaro R, Mamì C, De Luca F. *Longitudinal study of blood
pressure during the 1st year of life.* Eur J Pediatr. 1990;149:318–320. DOI
[10.1007/BF02171556](https://doi.org/10.1007/BF02171556).

**Derivation — none.** The shipped mean and standard deviation are the values published
in the article, unmodified. No fitting or transformation was applied.

**Rights.** The copy from which the values were taken was `gemelli1990_male.csv` /
`_female.csv` in the `data-raw/` directory of the
[`pedbp`](https://github.com/dewittpe/pedbp) R package, which is licensed **GPL-2**.

> **This dataset is not "independently derived", and this document does not claim it is.**
> The argument for using it is narrower: the numbers are measured facts published in a
> 1990 journal article, and copyright — GPL-2 included — attaches to expression rather
> than to facts (*Feist*, above). On that reading, taking the factual values out of a
> GPL-2 repository does not create a work derived from it. **That reasoning has not been
> reviewed by counsel.** A redistributor uncomfortable with it can transcribe the four
> age rows directly from the published article and avoid the question entirely.

---

## 5. Lo et al. 2013 — height-independent reference

**Files:** `lo2013-boys.json`, `lo2013-girls.json`

**Source:** Lo JC, Sinaiko A, Chandra M, et al. *Prehypertension and hypertension in
community-based pediatric practice.* Pediatrics. 2013;131(2):e415–e424. DOI
[10.1542/peds.2012-1292](https://doi.org/10.1542/peds.2012-1292). Table 1.

**Derivation — none.** Direct published values, as in §4.

**Rights.** Same situation as §4: the copy used was
`lo2013_bp_weight_height_bmi.txt` from the `data-raw/` directory of the GPL-2 `pedbp`
package, and the underlying article is Copyright © 2013 American Academy of Pediatrics.
The caveat in §4 applies here without modification.

---

## 6. CDC 2000 growth charts — height-for-age

**Files:** `cdc-length-boys.json`, `cdc-length-girls.json`, `cdc-stature-boys.json`,
`cdc-stature-girls.json`

These tables are not blood-pressure data. They convert a measured height into a height
percentile, which the AAP 2017 and NHLBI references require as an input.

**Source:** CDC 2000 Growth Charts for the United States, percentile data files:
`lenageinf.csv` (recumbent length, 0–36 months) and `statage.csv` (stature, 2–20 years),
published at `https://www.cdc.gov/growthcharts/data/zscore/`.
Kuczmarski RJ, Ogden CL, Guo SS, et al. *CDC growth charts for the United States:
methods and development.* Vital Health Stat 11. 2002;(246):1–190.

**Verification:** `scripts/verify-cdc-provenance.mjs` fetches both files from the CDC
and asserts that each of the 510 committed L/M/S values is the official value rounded to
four decimals. It exits non-zero on any divergence, so an undocumented edit to
`src/data/cdc-*.json` cannot pass unnoticed.

> These four files entered the repository with no extraction script and no source notes.
> Their provenance was reconstructed after the fact, on 2026-09-15, by the verification
> described above — 510 of 510 points matched.

**Rights.** The CDC growth charts are a work of the United States federal government and
are in the public domain (17 U.S.C. § 105). No restriction applies to their reuse.

---

## Summary

| Dataset | Code licence | Data rights | Cleared for commercial reuse? |
|---|---|---|---|
| AAP 2017 (Flynn) | MIT | Independent fit over tables © AAP, input taken from GPL-2 `pedbp` | **Probably** — argument stated, not reviewed |
| NHLBI Fourth Report | MIT | US federal government work — public domain | **Yes** |
| ERICA (Brazil) | MIT | CC BY-NC-ND 4.0 (publisher-declared) | **No** — NC clause; seek permission |
| Gemelli 1990 | MIT | Published facts; copy taken from GPL-2 `pedbp` | **Unresolved** — see §4 |
| Lo et al. 2013 | MIT | Published facts; copy taken from GPL-2 `pedbp` | **Unresolved** — see §5 |
| CDC 2000 (height) | MIT | US federal government work — public domain | **Yes** |

Selecting `source: 'erica'`, or letting the automatic cascade reach it for a 12–17-year-old
with height available, is the one path through this package that touches NonCommercial
material. Callers with a commercial deployment may wish to restrict the source explicitly.

---

## A note on what is *not* redistributed here

The four raw input tables used in §1 and §2 are byte-identical copies of files in the
GPL-2 `pedbp` repository. They are deliberately **not** included in this package or its
public repository: redistributing those files verbatim under MIT would be a claim about
GPL-2 material that this project does not wish to make, and is a far weaker position
than the one taken above, which rests on the numbers being facts rather than expression.

Anyone reproducing the derivation can obtain the same inputs from
`https://github.com/dewittpe/pedbp/tree/main/data-raw` under that project's own terms,
or from the publishers' supplementary material, and run `research/derivation-script.py`.

---

Questions about provenance or licensing: open an issue, or contact the maintainer.

_Last reviewed: 2026-09-15._
