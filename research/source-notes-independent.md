# Independent Gaussian Parameter Derivation

## Purpose

This directory contains independently derived Gaussian parameters (mean, standard deviation) for pediatric blood pressure distribution, computed from the original published percentile tables. This independent derivation ensures the parameters are free from GPL-2 licensing constraints of the pedbp R package.

## Legal Basis

Published percentile tables contain **factual data** -- the specific BP values at given percentile points for specific age/sex/height combinations. Factual data is not subject to copyright protection (see *Feist Publications v. Rural Telephone Service*, 499 U.S. 340 (1991)).

The Gaussian fitting is an **independent mathematical computation** performed on this factual data using standard statistical methods (least-squares linear regression). The resulting parameters are independently derived works, not copies of the pedbp package's output.

## Methodology

### Input Data

For each (age, sex, height_percentile) combination, the published tables provide BP values at specific percentile points:
- **Flynn 2017:** P50, P90, P95 (3 points per combination)
- **NHLBI:** P50, P90, P95, P99 (4 points per combination)

### Fitting Procedure

Given BP values at known percentile points, we fit Gaussian parameters using the relationship:

```
BP(p) = mu + sigma * z_p
```

where `z_p = Phi^{-1}(p)` is the standard normal quantile for percentile `p`.

This is a linear regression problem (BP = mu + sigma * z), solved exactly via `numpy.linalg.lstsq`. The solution minimizes the sum of squared errors:

```
min_{mu, sigma} sum_i (BP_i - mu - sigma * z_i)^2
```

### Software

- Python 3.14.2
- NumPy 2.4.1 (for `linalg.lstsq`)
- SciPy 1.17.0 (for `norm.ppf` only)

### Validation

Cross-validated against Nelder-Mead optimization (max difference: 0.000000), confirming the exact solution is correct.

## Published Data Sources

### Flynn 2017 (AAP)

- **Paper:** Flynn JT, Kaelber DC, Baker-Smith CM, et al. "Clinical practice guideline for screening and management of high blood pressure in children and adolescents." Pediatrics 2017;140(3):e20171904.
- **DOI:** 10.1542/peds.2017-1904
- **Tables used:** Supplementary Tables S3 and S4 (normative SBP and DBP tables by age, sex, and height percentile)
- **Raw data file:** `raw-tables/flynn2017_bp_boys.dat` and `raw-tables/flynn2017_bp_girls.dat` (space-delimited format matching the published tables)
- **Percentile points:** P50, P90, P95
- **Coverage:** Ages 1-17 years, height percentiles 5/10/25/50/75/90/95
- **Population:** 49,967 normal-weight children (BMI < 85th percentile)

### NHLBI / Fourth Report

- **Paper:** Expert Panel on Integrated Guidelines for Cardiovascular Health and Risk Reduction in Children and Adolescents. Pediatrics 2011;128(Suppl 5):S213-256.
- **DOI:** 10.1542/peds.2009-2107C
- **Tables used:** Tables 3-6 (BP levels for boys and girls by age and height percentile)
- **Raw data file:** `raw-tables/nhlbi_bp_norms_boys.csv` and `raw-tables/nhlbi_bp_norms_girls.csv`
- **Percentile points:** P50, P90, P95, P99
- **Coverage:** Ages 1-17 years, height percentiles 5/10/25/50/75/90/95
- **Population:** All children (including overweight/obese)
- **License:** US government publication -- public domain

## Output Files

| File | Description | Rows |
|------|-------------|------|
| `flynn2017-boys.json` | Independent Gaussian params for Flynn 2017, males | 119 |
| `flynn2017-girls.json` | Independent Gaussian params for Flynn 2017, females | 119 |
| `nhlbi-boys.json` | Independent Gaussian params for NHLBI, males | 119 |
| `nhlbi-girls.json` | Independent Gaussian params for NHLBI, females | 119 |
| `derivation-script.py` | Complete Python script for reproducibility | - |
| `validation-report.md` | Detailed comparison against pedbp values | - |
| `raw-tables/` | Downloaded published percentile tables | - |

## Sources NOT Requiring Re-derivation

| Source | Reason |
|--------|--------|
| **Gemelli 1990** | Direct mean/SD from the paper (not Gaussian-fitted by pedbp). Exact match verified. |
| **Lo et al. 2013** | Direct mean/SD from Table 1 of the paper. Exact match verified. |
| **ERICA Study** | Polynomial regression coefficients from CC-BY supplementary material. Direct extraction, no pedbp involvement. |

## Reproducibility

To regenerate the parameters:

```bash
cd docs/bp-data-research/independent
python3 derivation-script.py
```

This will:
1. Parse the published percentile tables from `raw-tables/`
2. Fit Gaussian parameters via least-squares
3. Save results to `flynn2017-{boys,girls}.json` and `nhlbi-{boys,girls}.json`
4. Compare against pedbp-derived values in `../aap2017/` and `../nhlbi/`
5. Generate `validation-report.md`
