# ERICA Study - Brazilian Blood Pressure Reference Values

## Source
- **Paper:** Jardim TV, Rosner B, Bloch KV, Kuschnir MCC, Szklo M, Jardim PC. "Blood pressure reference values for Brazilian adolescents: data from the Study of Cardiovascular Risk in Adolescents (ERICA Study)." J Pediatr (Rio J). 2020;96(2):168-176.
- **DOI:** 10.1016/j.jped.2018.09.003
- **Supplementary material:** Downloaded from ScienceDirect (mmc1.docx)

## Data Extraction
- **Source:** Supplementary Table S1 from the published article
- **Format:** DOCX file extracted via Python zipfile + XML parsing
- **Extraction method:** Programmatic extraction from supplementary material

## Coverage
- **Age range:** 12-17 years (adolescents only)
- **Sex:** Male and female separately
- **Height input:** Height Z-score (CDC 2000 reference)
- **Population:** 73,399 Brazilian adolescents, non-overweight subset used for reference construction

## Methodology
- **Polynomial regression** relating BP to age and height Z-score
- **Formula:** BP = b0 + b1*(Age-15) + b2*(Age-15)^2 + b3*(Age-15)^3 + b4*(Age-15)^4 + b5*Zht + b6*Zht^2 + b7*Zht^3 + b8*Zht^4
- **Age centered at 15 years**
- **Percentile computation:** BP_percentile_X = mean_BP + Z_X * residual_SD, where Z_X is the standard normal quantile for percentile X
- **Residual SD:** Used to compute percentiles assuming Gaussian residuals

## Significance for Brazilian Pediatrics
- First BP reference values specifically for Brazilian adolescents
- Largest study (>70,000 adolescents) for BP percentile construction in this population
- Accounts for Brazilian ethnic heterogeneity
- Recommended by Brazilian Pediatric Society for adolescent BP classification
- Shows different values compared to American references, particularly for boys

## Limitations
- Only covers ages 12-17 years
- Does not cover children under 12
- Requires CDC 2000 height Z-score as input
- Based on office BP measurements only (oscillometric)

## Data Quality
- Very large sample size
- National school-based study across all Brazilian macro-regions
- Validated oscillometric device with appropriate cuff sizes
- Mean of last two of three measurements used
- Polynomial coefficients have varying statistical significance (some p>0.05)

## Files
- `coefficients-boys.json` - Regression coefficients for males
- `coefficients-girls.json` - Regression coefficients for females
