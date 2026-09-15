# AAP 2017 / Flynn et al. - Blood Pressure Data

## Source
- **Paper:** Flynn JT, Kaelber DC, Baker-Smith CM, et al. "Clinical practice guideline for screening and management of high blood pressure in children and adolescents." Pediatrics 140, no. 3 (2017).
- **DOI:** 10.1542/peds.2017-1904
- **Underlying methodology:** Bernard Rosner's quantile regression, Harvard/Channing Lab

## Data Extraction

### Gaussian Parameters (from pedbp)
- **Source files:** `flynn2017_bp_boys.dat` and `flynn2017_bp_girls.dat` from [pedbp R package](https://github.com/dewittpe/pedbp)
- **Format:** Space-delimited with columns: age, bp_%, then 7 SBP columns (height percentiles 5,10,25,50,75,90,95), then 7 DBP columns
- **BP percentiles in source:** 50th, 90th, 95th
- **Key difference from NHLBI:** Excludes overweight/obese children (BMI >= 85th percentile)

### Quantile Regression Coefficients (from Rosner)
- **Source:** Bernard Rosner's Harvard/Channing Lab website
- **URL:** https://sites.google.com/a/channing.harvard.edu/bernardrosner/pediatric-blood-press/childhood-blood-pressure
- **Files downloaded:**
  - `quantreg_coef.txt` - 396 rows of regression coefficients (99 quantiles x 2 BP types x 2 sexes)
  - `ht_zscore.txt` - Height-for-age LMS parameters (age >= 24 months)
  - `ht_zscore_inf.txt` - Height-for-age LMS parameters (age < 24 months)
  - `childhoodbppct.sas` - SAS macro implementing the calculation

## Coverage
- **Age range:** 1-17 years
- **Height percentiles (Gaussian):** 5th, 10th, 25th, 50th, 75th, 90th, 95th
- **Quantile regression:** Uses actual height in cm (not percentiles)
- **Sex:** Male and female separately

## Methodologies

### Approach 1: Gaussian Approximation (Simpler, from pedbp)
Same methodology as NHLBI: fit Gaussian distributions to the published percentile tables.
- **Pros:** Simple to implement (just pnorm lookup)
- **Cons:** Approximation of the published tables, which are themselves approximations

### Approach 2: Quantile Regression (Original, from Rosner)
Uses restricted cubic splines with 5 knots on height, age, and height*age interaction.
- **Formula:** BP(q) = b0 + b1*x + b2*x2s + b3*x3s + b4*x4s + ba1*y + ba2*y2s + ba3*y3s + ba4*y4s + bb1*w + bb2*w2s + bb3*w3s + bb4*w4s
  - x = height (cm), with cubic spline basis functions x2s, x3s, x4s
  - y = age (years), with cubic spline basis functions y2s, y3s, y4s
  - w = (age-10)*(height-150) for boys, (age-10)*(height-147) for girls, with spline basis w2s, w3s, w4s
- **Percentile determination:** Compute BP(q) for each quantile q=1..99, find closest match
- **Pros:** Original methodology, most accurate
- **Cons:** Complex spline computation, requires height z-score computation

### Knot Parameters (from SAS macro)
Males: height knots=[107.8, 140.0, 154.5, 166.4, 179.1], age knots=[5.06, 10.79, 13.22, 14.51, 17.30], interaction knots=[-15, 8.9, 50.375, 112.684, 250.04]
Females: height knots=[106.7, 140.7, 154.0, 160.5, 168.9], age knots=[5.00, 10.70, 13.16, 14.51, 17.33], interaction knots=[6.701, 16.438, 46.80, 84.46, 203.608]

## Data Quality
- Based on 49,967 normal-weight children
- Excludes overweight/obese (BMI >= 85th percentile), which is the key difference from NHLBI/Fourth Report
- 119 Gaussian parameter rows per sex
- 396 quantile regression coefficient rows total (99 quantiles x 2 types x 2 sexes)

## Files
- `gaussian-params-boys.json` - Fitted Gaussian parameters (pedbp approach)
- `gaussian-params-girls.json` - Fitted Gaussian parameters (pedbp approach)
