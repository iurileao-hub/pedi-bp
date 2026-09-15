# Lo 2013 - Blood Pressure Data (Height-Independent)

## Source
- **Paper:** Lo JC, Sinaiko A, Chandra M, et al. "Prehypertension and hypertension in community-based pediatric practice." Pediatrics 131, no. 2 (2013): e415-e424.
- **DOI:** 10.1542/peds.2012-1292

## Data Extraction
- **Source file:** `lo2013_bp_weight_height_bmi.txt` from [pedbp R package](https://github.com/dewittpe/pedbp)
- **Format:** Pipe-delimited text with columns: sex, age, n, percent, mean_sbp_mmHg, sd_sbp_mmHg, mean_dbp_mmHg, sd_dbp_mmHg, mean_height_cm, sd_height_cm, mean_weight_kg, sd_weight_kg, mean_bmi, sd_bmi
- **Extraction method:** Programmatic (curl from GitHub raw URL)

## Coverage
- **Age range:** 3-17 years (stored as years, converted to months by pedbp)
- **Sex:** Male and female separately
- **Height required:** No (uses population means, not individual height)

## Methodology
- Direct Gaussian parameters (mean and SD) for each age/sex combination
- Large community-based pediatric practice dataset
- Height is NOT used for individual lookups (unlike NHLBI/Flynn)
- Used as fallback when height is unknown for ages >= 36 months in pedbp "martin2022" workflow

## Data Quality
- Large sample sizes per age group (n=4,382 to 12,354)
- Community-based, representative of US pediatric practice
- 15 age points per sex (ages 3-17)
- No height stratification

## Files
- `gaussian-params-boys.json` - Mean and SD parameters for males (15 rows)
- `gaussian-params-girls.json` - Mean and SD parameters for females (15 rows)
