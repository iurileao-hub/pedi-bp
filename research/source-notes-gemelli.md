# Gemelli 1990 - Blood Pressure Data for Infants

## Source
- **Paper:** Gemelli M, Manganaro R, Mami C, De Luca F. "Longitudinal study of blood pressure during the 1st year of life." European Journal of Pediatrics 149 (1990): 318-320.
- **DOI:** 10.1007/BF02171556

## Data Extraction
- **Source file:** `gemelli1990_male.csv` and `gemelli1990_female.csv` from the [pedbp R package](https://github.com/dewittpe/pedbp) `data-raw/` directory
- **Format:** CSV with columns: age_mo, n, SBP_mean, SBP_sd, DBP_mean, DBP_sd, HR_mean, HR_sd, wt_gr_mean, wt_gr_sd
- **Extraction method:** Programmatic (curl from GitHub raw URL)

## Coverage
- **Age range:** 1, 3, 6, 9 months
- **Sex:** Male and female separately
- **Height required:** No (not used in infant BP estimation)

## Methodology
- Direct Gaussian parameters (mean and SD) for each age/sex combination
- No height adjustment needed
- Used for children under 12 months in the pedbp "martin2022" workflow

## Data Quality
- Small sample sizes (n=132-258 per time point)
- Only 4 age points with gaps between them
- Interpolation between points may be needed for intermediate ages
- The age=9 female row has NA for the n value in the original data

## Files
- `norms-boys.json` - Original mean/SD values for males
- `norms-girls.json` - Original mean/SD values for females
- `gaussian-params-boys.json` - Gaussian parameters (identical to norms for this source)
- `gaussian-params-girls.json` - Gaussian parameters (identical to norms for this source)
