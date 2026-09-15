#!/usr/bin/env python3
"""
Independent Gaussian Parameter Derivation from Published BP Percentile Tables

This script independently derives Gaussian parameters (mean, standard deviation)
from the published blood pressure percentile tables in:

1. Flynn 2017 (AAP) - Clinical Practice Guideline for Screening and Management
   of High Blood Pressure in Children and Adolescents (Pediatrics 2017)
2. NHLBI Fourth Report (2004/2011) - Expert Panel on Integrated Guidelines for
   Cardiovascular Health and Risk Reduction in Children and Adolescents

The published percentile tables contain factual data (BP values at specific
percentile points) which is not subject to copyright. This script performs an
independent mathematical computation (least-squares Gaussian fitting) on that
factual data to derive the mean and standard deviation parameters.

Method:
  Given BP values at known percentile points (P50, P90, P95, and optionally P99),
  we find the Gaussian parameters (mu, sigma) that best reproduce those values
  via least-squares optimization.

  For percentile p, the corresponding z-score is z_p = Phi^{-1}(p).
  The BP value at percentile p under a Gaussian model is: BP(p) = mu + sigma * z_p.
  We minimize: sum_i (BP_observed(p_i) - (mu + sigma * z_p_i))^2

  This is actually a simple linear regression problem (BP = mu + sigma * z),
  so we use np.linalg.lstsq for exact solution rather than iterative optimization.

Dependencies: numpy, scipy (for norm.ppf only)
License: MIT (this script) - factual data from published tables
"""

import json
import os
import sys
import numpy as np
from scipy.stats import norm

# ============================================================================
# Core fitting function
# ============================================================================

def est_norm(percentile_values, percentile_points):
    """
    Given BP values at known percentile points, fit Gaussian mu and sigma.

    This is equivalent to linear regression: BP = mu + sigma * z
    where z = Phi^{-1}(percentile).

    Parameters
    ----------
    percentile_values : array-like
        BP values at the given percentile points (e.g., [85, 98, 102, 105])
    percentile_points : array-like
        The percentile points as fractions (e.g., [0.50, 0.90, 0.95, 0.99])

    Returns
    -------
    tuple of (float, float)
        (mean, sd) - the fitted Gaussian parameters
    """
    z_points = norm.ppf(percentile_points)
    bp = np.array(percentile_values, dtype=float)

    # Linear regression: BP = mu + sigma * z
    # Design matrix: [1, z]
    A = np.column_stack([np.ones_like(z_points), z_points])
    result, _, _, _ = np.linalg.lstsq(A, bp, rcond=None)
    mu, sigma = result[0], result[1]

    return round(mu, 4), round(abs(sigma), 4)


def est_norm_optimize(percentile_values, percentile_points):
    """
    Alternative: Nelder-Mead optimization (for comparison/validation).
    Should produce identical results to the linear regression approach.
    """
    from scipy.optimize import minimize

    z_points = norm.ppf(percentile_points)
    bp = np.array(percentile_values, dtype=float)

    def objective(params):
        mu, sigma = params
        predicted = mu + sigma * z_points
        return np.sum((predicted - bp) ** 2)

    mu0 = bp[0]  # P50 ~ mean
    sigma0 = (bp[1] - bp[0]) / 1.2816 if len(bp) > 1 else 10.0

    result = minimize(objective, [mu0, max(sigma0, 1.0)], method='Nelder-Mead',
                      options={'xatol': 1e-8, 'fatol': 1e-12, 'maxiter': 10000})
    return round(result.x[0], 4), round(abs(result.x[1]), 4)


# ============================================================================
# Data parsing functions
# ============================================================================

def parse_flynn2017(filepath):
    """
    Parse Flynn 2017 data file.
    Format: space-delimited
    Columns: age bp_% ht5_sbp ht10_sbp ht25_sbp ht50_sbp ht75_sbp ht90_sbp ht95_sbp
                     ht5_dbp ht10_dbp ht25_dbp ht50_dbp ht75_dbp ht90_dbp ht95_dbp

    BP percentiles available: 50, 90, 95 (3 rows per age)
    Ages: 1-17 years
    Height percentiles: 5, 10, 25, 50, 75, 90, 95
    """
    rows = []
    with open(filepath, 'r') as f:
        header = f.readline()  # skip header
        for line in f:
            parts = line.strip().split()
            if len(parts) < 16:
                continue
            age = int(parts[0])
            bp_pct = int(parts[1])
            sbp_values = [int(parts[i]) for i in range(2, 9)]   # 7 height percentiles
            dbp_values = [int(parts[i]) for i in range(9, 16)]  # 7 height percentiles
            rows.append({
                'age': age,
                'bp_pct': bp_pct,
                'sbp': sbp_values,
                'dbp': dbp_values
            })
    return rows


def parse_nhlbi(filepath):
    """
    Parse NHLBI data file.
    Format: CSV
    Columns: age,bp_%,ht5_sbp,...,ht95_sbp,ht5_dbp,...,ht95_dbp

    BP percentiles available: 50, 90, 95, 99 (4 rows per age)
    Ages: 1-17 years
    Height percentiles: 5, 10, 25, 50, 75, 90, 95
    """
    rows = []
    with open(filepath, 'r') as f:
        header = f.readline()  # skip header
        for line in f:
            parts = line.strip().split(',')
            if len(parts) < 16:
                continue
            age = int(parts[0])
            bp_pct = int(parts[1])
            sbp_values = [int(parts[i]) for i in range(2, 9)]
            dbp_values = [int(parts[i]) for i in range(9, 16)]
            rows.append({
                'age': age,
                'bp_pct': bp_pct,
                'sbp': sbp_values,
                'dbp': dbp_values
            })
    return rows


# ============================================================================
# Gaussian fitting pipeline
# ============================================================================

def fit_gaussian_params(rows, source_name, percentile_points):
    """
    For each (age, height_percentile) combination, collect BP values at
    the given percentile points and fit a Gaussian distribution.

    Parameters
    ----------
    rows : list of dict
        Parsed rows from the data file
    source_name : str
        Name of the data source (for logging)
    percentile_points : list of float
        The BP percentile points as fractions (e.g., [0.50, 0.90, 0.95])

    Returns
    -------
    list of dict
        Fitted parameters for each (age, height_percentile) combination
    """
    height_percentiles = [5, 10, 25, 50, 75, 90, 95]
    bp_pcts_needed = [int(p * 100) for p in percentile_points]

    # Group by age
    ages = sorted(set(r['age'] for r in rows))
    results = []

    for age in ages:
        age_rows = [r for r in rows if r['age'] == age]

        # Verify we have the expected BP percentile rows
        available_pcts = sorted(set(r['bp_pct'] for r in age_rows))
        for needed in bp_pcts_needed:
            if needed not in available_pcts:
                print(f"  WARNING: age={age}, missing bp_pct={needed} "
                      f"(available: {available_pcts})")

        for hi, ht_pct in enumerate(height_percentiles):
            # Collect BP values at each percentile point for this height percentile
            sbp_at_pcts = []
            dbp_at_pcts = []
            pct_points_used = []

            for bp_pct in bp_pcts_needed:
                matching = [r for r in age_rows if r['bp_pct'] == bp_pct]
                if matching:
                    sbp_at_pcts.append(matching[0]['sbp'][hi])
                    dbp_at_pcts.append(matching[0]['dbp'][hi])
                    pct_points_used.append(bp_pct / 100.0)

            if len(pct_points_used) < 2:
                print(f"  SKIP: age={age}, ht_pct={ht_pct} - insufficient data points")
                continue

            sbp_mean, sbp_sd = est_norm(sbp_at_pcts, pct_points_used)
            dbp_mean, dbp_sd = est_norm(dbp_at_pcts, pct_points_used)

            results.append({
                'age_months': age * 12,
                'sbp_mean': sbp_mean,
                'sbp_sd': sbp_sd,
                'dbp_mean': dbp_mean,
                'dbp_sd': dbp_sd,
                'height_percentile': float(ht_pct)
            })

    return results


# ============================================================================
# Validation
# ============================================================================

def load_pedbp_params(filepath):
    """Load the pedbp-derived Gaussian parameters for comparison."""
    with open(filepath, 'r') as f:
        data = json.load(f)
    return data['data']


def validate_against_pedbp(independent_params, pedbp_params, source_name):
    """
    Compare independently derived parameters against pedbp-derived ones.
    Returns a validation report.
    """
    report_lines = []
    report_lines.append(f"\n### {source_name}\n")

    # Build lookup for pedbp params
    pedbp_lookup = {}
    for row in pedbp_params:
        key = (row['age_months'], row.get('height_percentile'))
        pedbp_lookup[key] = row

    max_sbp_mean_diff = 0
    max_sbp_sd_diff = 0
    max_dbp_mean_diff = 0
    max_dbp_sd_diff = 0
    total_rows = 0
    matched_rows = 0
    large_diffs = []

    for row in independent_params:
        key = (row['age_months'], row.get('height_percentile'))
        total_rows += 1

        if key not in pedbp_lookup:
            report_lines.append(f"  NO MATCH: age={key[0]}, ht_pct={key[1]}")
            continue

        matched_rows += 1
        pedbp = pedbp_lookup[key]

        sbp_mean_diff = abs(row['sbp_mean'] - pedbp['sbp_mean'])
        sbp_sd_diff = abs(row['sbp_sd'] - pedbp['sbp_sd'])
        dbp_mean_diff = abs(row['dbp_mean'] - pedbp['dbp_mean'])
        dbp_sd_diff = abs(row['dbp_sd'] - pedbp['dbp_sd'])

        max_sbp_mean_diff = max(max_sbp_mean_diff, sbp_mean_diff)
        max_sbp_sd_diff = max(max_sbp_sd_diff, sbp_sd_diff)
        max_dbp_mean_diff = max(max_dbp_mean_diff, dbp_mean_diff)
        max_dbp_sd_diff = max(max_dbp_sd_diff, dbp_sd_diff)

        threshold = 0.1  # Report discrepancies > 0.1 mmHg
        if max(sbp_mean_diff, sbp_sd_diff, dbp_mean_diff, dbp_sd_diff) > threshold:
            large_diffs.append({
                'age_months': key[0],
                'height_percentile': key[1],
                'sbp_mean': (row['sbp_mean'], pedbp['sbp_mean'], sbp_mean_diff),
                'sbp_sd': (row['sbp_sd'], pedbp['sbp_sd'], sbp_sd_diff),
                'dbp_mean': (row['dbp_mean'], pedbp['dbp_mean'], dbp_mean_diff),
                'dbp_sd': (row['dbp_sd'], pedbp['dbp_sd'], dbp_sd_diff),
            })

    report_lines.append(f"Matched rows: {matched_rows}/{total_rows}")
    report_lines.append(f"Max |SBP mean diff|: {max_sbp_mean_diff:.4f} mmHg")
    report_lines.append(f"Max |SBP SD diff|:   {max_sbp_sd_diff:.4f}")
    report_lines.append(f"Max |DBP mean diff|: {max_dbp_mean_diff:.4f} mmHg")
    report_lines.append(f"Max |DBP SD diff|:   {max_dbp_sd_diff:.4f}")

    if large_diffs:
        report_lines.append(f"\nDiscrepancies > 0.1 ({len(large_diffs)} rows):")
        for d in large_diffs[:10]:  # Show first 10
            report_lines.append(
                f"  age={d['age_months']}mo, ht_pct={d['height_percentile']}: "
                f"SBP mean: {d['sbp_mean'][0]} vs {d['sbp_mean'][1]} (diff={d['sbp_mean'][2]:.4f}), "
                f"SD: {d['sbp_sd'][0]} vs {d['sbp_sd'][1]} (diff={d['sbp_sd'][2]:.4f}), "
                f"DBP mean: {d['dbp_mean'][0]} vs {d['dbp_mean'][1]} (diff={d['dbp_mean'][2]:.4f}), "
                f"SD: {d['dbp_sd'][0]} vs {d['dbp_sd'][1]} (diff={d['dbp_sd'][2]:.4f})"
            )
        if len(large_diffs) > 10:
            report_lines.append(f"  ... and {len(large_diffs) - 10} more")
    else:
        report_lines.append("\nNo discrepancies > 0.1 mmHg found.")

    return '\n'.join(report_lines), {
        'max_sbp_mean_diff': max_sbp_mean_diff,
        'max_sbp_sd_diff': max_sbp_sd_diff,
        'max_dbp_mean_diff': max_dbp_mean_diff,
        'max_dbp_sd_diff': max_dbp_sd_diff,
        'matched_rows': matched_rows,
        'total_rows': total_rows,
        'large_diff_count': len(large_diffs)
    }


# ============================================================================
# Reconstruction validation: check that fitted params reproduce original tables
# ============================================================================

def validate_reconstruction(params, rows, percentile_points, source_name):
    """
    Verify that the fitted Gaussian parameters reproduce the original
    published percentile values within acceptable tolerance.
    """
    height_percentiles = [5, 10, 25, 50, 75, 90, 95]
    report_lines = []
    report_lines.append(f"\n### Reconstruction Validation: {source_name}\n")

    max_sbp_error = 0
    max_dbp_error = 0
    total_checks = 0
    errors_above_1 = 0

    for row in params:
        age_years = row['age_months'] // 12
        ht_pct = row['height_percentile']
        hi = height_percentiles.index(int(ht_pct))

        age_rows = [r for r in rows if r['age'] == age_years]

        for bp_pct_int in [int(p * 100) for p in percentile_points]:
            matching = [r for r in age_rows if r['bp_pct'] == bp_pct_int]
            if not matching:
                continue

            z = norm.ppf(bp_pct_int / 100.0)
            predicted_sbp = row['sbp_mean'] + row['sbp_sd'] * z
            predicted_dbp = row['dbp_mean'] + row['dbp_sd'] * z

            actual_sbp = matching[0]['sbp'][hi]
            actual_dbp = matching[0]['dbp'][hi]

            sbp_error = abs(predicted_sbp - actual_sbp)
            dbp_error = abs(predicted_dbp - actual_dbp)

            max_sbp_error = max(max_sbp_error, sbp_error)
            max_dbp_error = max(max_dbp_error, dbp_error)
            total_checks += 1

            if max(sbp_error, dbp_error) > 1.0:
                errors_above_1 += 1

    report_lines.append(f"Total checks: {total_checks}")
    report_lines.append(f"Max SBP reconstruction error: {max_sbp_error:.4f} mmHg")
    report_lines.append(f"Max DBP reconstruction error: {max_dbp_error:.4f} mmHg")
    report_lines.append(f"Checks with error > 1 mmHg: {errors_above_1}/{total_checks}")

    if max_sbp_error < 1.0 and max_dbp_error < 1.0:
        report_lines.append("PASS: All reconstructed values within 1 mmHg of published tables.")
    else:
        report_lines.append("NOTE: Some reconstructed values differ by > 1 mmHg from published tables.")
        report_lines.append("This is expected when fitting 3 percentile points to 2 parameters (overdetermined).")

    return '\n'.join(report_lines), {
        'max_sbp_error': max_sbp_error,
        'max_dbp_error': max_dbp_error,
        'total_checks': total_checks,
        'errors_above_1': errors_above_1
    }


# ============================================================================
# Main
# ============================================================================

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(base_dir, 'raw-tables')
    pedbp_dir = os.path.dirname(base_dir)  # bp-data-research/

    validation_report = []
    validation_report.append("# Independent Gaussian Parameter Derivation - Validation Report\n")
    validation_report.append(f"Generated by: derivation-script.py")
    validation_report.append(f"Method: Least-squares linear regression of BP values on Gaussian z-scores")
    validation_report.append(f"Software: Python {sys.version.split()[0]}, NumPy {np.__version__}, "
                             f"SciPy {__import__('scipy').__version__}\n")

    # ========================================================================
    # Flynn 2017
    # ========================================================================
    print("=" * 60)
    print("Processing Flynn 2017 (AAP)")
    print("=" * 60)

    # Flynn 2017 has P50, P90, P95 (3 points)
    flynn_percentiles = [0.50, 0.90, 0.95]

    for sex, sex_label, sex_source in [('boys', 'male', 'flynn2017_male'),
                                        ('girls', 'female', 'flynn2017_female')]:
        print(f"\n--- Flynn 2017 {sex} ---")
        raw_file = os.path.join(raw_dir, f'flynn2017_bp_{sex}.dat')
        rows = parse_flynn2017(raw_file)
        print(f"  Parsed {len(rows)} rows from published table")

        params = fit_gaussian_params(rows, f'Flynn 2017 {sex}', flynn_percentiles)
        print(f"  Fitted {len(params)} Gaussian parameter sets")

        # Save
        output = {
            'source': sex_source,
            'sex': sex_label,
            'methodology': 'Independent least-squares Gaussian fit to published AAP 2017 percentile tables (P50, P90, P95)',
            'computation': 'percentile = pnorm(bp_value, mean=sbp_mean, sd=sbp_sd)',
            'license': 'Factual data from published tables (Pediatrics 2017;140(3)) - not subject to copyright. Gaussian fitting is independent computation.',
            'derivation_script': 'derivation-script.py',
            'percentile_points_used': [50, 90, 95],
            'fitting_method': 'numpy.linalg.lstsq (exact linear regression solution)',
            'columns': ['age_months', 'sbp_mean', 'sbp_sd', 'dbp_mean', 'dbp_sd', 'height_percentile'],
            'note': 'height_percentile=null means height is not used (gemelli1990, lo2013 sources)',
            'data': params
        }

        output_file = os.path.join(base_dir, f'flynn2017-{sex}.json')
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"  Saved to {output_file}")

        # Validate against pedbp
        pedbp_file = os.path.join(pedbp_dir, 'aap2017', f'gaussian-params-{sex}.json')
        if os.path.exists(pedbp_file):
            pedbp_params = load_pedbp_params(pedbp_file)
            report_text, stats = validate_against_pedbp(
                params, pedbp_params, f'Flynn 2017 {sex} vs pedbp'
            )
            print(report_text)
            validation_report.append(report_text)
        else:
            print(f"  pedbp file not found: {pedbp_file}")

        # Reconstruction validation
        recon_text, recon_stats = validate_reconstruction(
            params, rows, flynn_percentiles, f'Flynn 2017 {sex}'
        )
        print(recon_text)
        validation_report.append(recon_text)

    # ========================================================================
    # NHLBI / Fourth Report
    # ========================================================================
    print("\n" + "=" * 60)
    print("Processing NHLBI / Fourth Report")
    print("=" * 60)

    # NHLBI has P50, P90, P95, P99 (4 points)
    nhlbi_percentiles = [0.50, 0.90, 0.95, 0.99]

    for sex, sex_label, sex_source in [('boys', 'male', 'nhlbi_male'),
                                        ('girls', 'female', 'nhlbi_female')]:
        print(f"\n--- NHLBI {sex} ---")
        raw_file = os.path.join(raw_dir, f'nhlbi_bp_norms_{sex}.csv')
        rows = parse_nhlbi(raw_file)
        print(f"  Parsed {len(rows)} rows from published table")

        params = fit_gaussian_params(rows, f'NHLBI {sex}', nhlbi_percentiles)
        print(f"  Fitted {len(params)} Gaussian parameter sets")

        # Save
        output = {
            'source': sex_source,
            'sex': sex_label,
            'methodology': 'Independent least-squares Gaussian fit to published NHLBI Fourth Report percentile tables (P50, P90, P95, P99)',
            'computation': 'percentile = pnorm(bp_value, mean=sbp_mean, sd=sbp_sd)',
            'license': 'Factual data from US government publication (public domain). Gaussian fitting is independent computation.',
            'derivation_script': 'derivation-script.py',
            'percentile_points_used': [50, 90, 95, 99],
            'fitting_method': 'numpy.linalg.lstsq (exact linear regression solution)',
            'columns': ['age_months', 'sbp_mean', 'sbp_sd', 'dbp_mean', 'dbp_sd', 'height_percentile'],
            'note': 'height_percentile=null means height is not used (gemelli1990, lo2013 sources)',
            'data': params
        }

        output_file = os.path.join(base_dir, f'nhlbi-{sex}.json')
        with open(output_file, 'w') as f:
            json.dump(output, f, indent=2)
        print(f"  Saved to {output_file}")

        # Validate against pedbp
        pedbp_file = os.path.join(pedbp_dir, 'nhlbi', f'gaussian-params-{sex}.json')
        if os.path.exists(pedbp_file):
            pedbp_params = load_pedbp_params(pedbp_file)
            report_text, stats = validate_against_pedbp(
                params, pedbp_params, f'NHLBI {sex} vs pedbp'
            )
            print(report_text)
            validation_report.append(report_text)
        else:
            print(f"  pedbp file not found: {pedbp_file}")

        # Reconstruction validation
        recon_text, recon_stats = validate_reconstruction(
            params, rows, nhlbi_percentiles, f'NHLBI {sex}'
        )
        print(recon_text)
        validation_report.append(recon_text)

    # ========================================================================
    # Cross-validation: lstsq vs optimize
    # ========================================================================
    print("\n" + "=" * 60)
    print("Cross-validation: lstsq vs Nelder-Mead optimization")
    print("=" * 60)

    validation_report.append("\n### Cross-validation: lstsq vs Nelder-Mead\n")

    # Test with a few samples from NHLBI boys
    raw_file = os.path.join(raw_dir, 'nhlbi_bp_norms_boys.csv')
    rows = parse_nhlbi(raw_file)
    height_percentiles = [5, 10, 25, 50, 75, 90, 95]
    max_diff = 0

    test_count = 0
    for age in [1, 5, 10, 17]:
        age_rows = [r for r in rows if r['age'] == age]
        for hi in [0, 3, 6]:  # ht_pct = 5, 50, 95
            sbp_at_pcts = []
            dbp_at_pcts = []
            for bp_pct in [50, 90, 95, 99]:
                matching = [r for r in age_rows if r['bp_pct'] == bp_pct]
                if matching:
                    sbp_at_pcts.append(matching[0]['sbp'][hi])
                    dbp_at_pcts.append(matching[0]['dbp'][hi])

            pct_points = [0.50, 0.90, 0.95, 0.99]

            lstsq_sbp = est_norm(sbp_at_pcts, pct_points)
            optim_sbp = est_norm_optimize(sbp_at_pcts, pct_points)
            lstsq_dbp = est_norm(dbp_at_pcts, pct_points)
            optim_dbp = est_norm_optimize(dbp_at_pcts, pct_points)

            diff = max(
                abs(lstsq_sbp[0] - optim_sbp[0]),
                abs(lstsq_sbp[1] - optim_sbp[1]),
                abs(lstsq_dbp[0] - optim_dbp[0]),
                abs(lstsq_dbp[1] - optim_dbp[1])
            )
            max_diff = max(max_diff, diff)
            test_count += 1

    cross_msg = (f"Tested {test_count} parameter sets.\n"
                 f"Max difference between lstsq and Nelder-Mead: {max_diff:.6f}\n"
                 f"{'PASS' if max_diff < 0.001 else 'WARN'}: Methods {'agree' if max_diff < 0.001 else 'disagree'}.")
    print(cross_msg)
    validation_report.append(cross_msg)

    # ========================================================================
    # Save validation report
    # ========================================================================
    report_file = os.path.join(base_dir, 'validation-report.md')
    with open(report_file, 'w') as f:
        f.write('\n'.join(validation_report))
    print(f"\nValidation report saved to {report_file}")


if __name__ == '__main__':
    main()
