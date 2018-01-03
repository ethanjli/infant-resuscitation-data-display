from scipy import stats
import numpy as np

# PAIRING

def series_intersection_mask(df_a, df_b, series_name):
    return df_a[series_name].isin(df_b[series_name])

def intersect_by_series(df_a, df_b, series_name):
    a_mask = series_intersection_mask(df_a, df_b, series_name)
    b_mask = series_intersection_mask(df_b, df_a, series_name)
    return (df_a[a_mask], df_b[b_mask])

def check_pairing_validity(df_a, df_b, series_name):
    if np.all(df_a[series_name].values == df_b[series_name].values):
        result = 'Yes.'
    else:
        result = 'No!'
    print(series_name + ' correctly paired?', result)

# TESTING

OUTCOMES = [
    'sensorPlacementTime', 'ppvStartTime',
    'inSpO2TargetRangeDuration', 'aboveSpO2TargetRangeDuration', 'belowSpO2TargetRangeDuration',
    'inFiO2TargetRangeDuration', 'aboveFiO2TargetRangeDuration', 'belowFiO2TargetRangeDuration',
    'spO2SignedErrorIntegral', 'spO2UnsignedErrorIntegral', 'spO2SquaredErrorIntegral'
]

TESTS = {
    'Paired T-Test': stats.ttest_rel,
    'Wilcoxon Signed-Rank Test': stats.wilcoxon
}

def choose_marker(p_value):
    if p_value < 0.05:
        marker = ' **'
    elif p_value < 0.1:
        marker = ' *'
    elif p_value < 0.2:
        marker = ' ~'
    else:
        marker = ''
    return marker

def print_result(test_name, result, p_value_position=1):
    p_value = result[p_value_position]
    marker = choose_marker(p_value)
    print(marker, test_name + ':', result)

# PLOTTING

def hist_scenario_display(df, outcome_name):
    df.hist(column=outcome_name, by=['scenarioType', 'displayType'], sharex=True, sharey=True)

