# NHLBI / Fourth Report - Blood Pressure Normative Data

## Source
- **Paper:** "Expert panel on integrated guidelines for cardiovascular health and risk reduction in children and adolescents: summary report." Pediatrics 128, Suppl 5 (2011): S213.
- **DOI:** 10.1542/peds.2009-2107C
- **Also known as:** Fourth Report on the Diagnosis, Evaluation, and Treatment of High Blood Pressure in Children and Adolescents (2004), updated in 2011

## Data Extraction
- **Source files:** `nhlbi_bp_norms_boys.csv` and `nhlbi_bp_norms_girls.csv` from the [pedbp R package](https://github.com/dewittpe/pedbp) `data-raw/` directory
- **Format:** CSV with columns: age, bp_%, then 7 SBP columns (height percentiles 5,10,25,50,75,90,95), then 7 DBP columns
- **Extraction method:** Programmatic (curl from GitHub raw URL)

## Coverage
- **Age range:** 1-17 years (stored as years in source, converted to months by pedbp)
- **BP percentiles in source:** 50th, 90th, 95th, 99th
- **Height percentiles:** 5th, 10th, 25th, 50th, 75th, 90th, 95th
- **Sex:** Male and female separately

## Methodology
- The raw data contains BP values (SBP and DBP) at each intersection of age, BP percentile, and height percentile
- The pedbp package fits Gaussian distributions (mean, sd) to these quantile tables using `est_norm()` optimization
- This produces the Gaussian parameters in `gaussian-params-*.json`

## Gaussian Parameter Generation
The `est_norm()` function uses `optim()` with L-BFGS-B method to find the best-fit normal distribution (mean, sd) given the quantile-probability pairs from the published tables. For example, given BP values at the 50th, 90th, 95th, and 99th percentiles, it finds the Gaussian parameters that best reproduce those values.

## Data Quality
- Large population-based dataset
- Includes overweight/obese children (unlike Flynn 2017)
- 119 parameter rows per sex (17 ages x 7 height percentiles)
- Height percentile is required for lookup

## Files
- `gaussian-params-boys.json` - 119 rows of fitted Gaussian parameters (age x height_percentile combinations)
- `gaussian-params-girls.json` - 119 rows of fitted Gaussian parameters
