from scipy import stats
import numpy as np


# CATEGORIES

CATEGORY_NAMES = {
    'scenarioType': ['easy', 'hard'],
    'displayType': ['minimal', 'full']
}

CATEGORY_VALUES = {
    'scenarioType': {
        'easy': 0,
        'hard': 1
    },
    'displayType': {
        'minimal': 0,
        'full': 1
    }
}


# PAIRING

class Pairing(object):
    def __init__(self, df, binary_variable):
        self.dfs = [
            df[df[binary_variable] == value]
            for value in (0, 1)
        ]
        self.variable = binary_variable
        self.category_names = CATEGORY_NAMES[self.variable]
        self.category_values = CATEGORY_VALUES[self.variable]

    def __len__(self):
        return 2

    def keys(self):
        return self.category_names

    def values(self):
        return self.dfs

    def items(self):
        return zip(self.keys(), self.values())

    def __contains__(self, item):
        return item in self.keys()

    def __iter__(self):
        return iter(self.values())

    def __getitem__(self, key):
        try:
            return self.dfs[self.category_values[key]]
        except KeyError:
            return self.dfs[key]

def series_intersection_mask(df_a, df_b, series_name):
    return df_a[series_name].isin(df_b[series_name])

def series_finite_mask(df_a, df_b, series_name):
    return np.isfinite(df_a[series_name].values) & np.isfinite(df_b[series_name].values)

def intersect_by_series(df_a, df_b, series_name):
    a_mask = series_intersection_mask(df_a, df_b, series_name)
    b_mask = series_intersection_mask(df_b, df_a, series_name)
    return (df_a[a_mask], df_b[b_mask])

def exclude_infinities(df_a, df_b, series_name):
    mask = series_finite_mask(df_a, df_b, series_name)
    return (df_a[mask], df_b[mask])

def check_pairing_validity(df_a, df_b, series_name):
    if not np.all(df_a[series_name].values == df_b[series_name].values):
        raise ValueError(series_name + ' not correctly paired!')

def build_pairing(df, binary_variable, intersect_subjects=True):
    pairing = Pairing(df, binary_variable)
    if intersect_subjects:
        pairing.dfs = intersect_by_series(*pairing, 'subjectNumber')
    check_pairing_validity(*pairing, 'subjectNumber')
    for variable in ['scenarioType', 'displayType']:
        if binary_variable != variable:
            check_pairing_validity(*pairing, variable)
    if len(pairing[0]) != len(pairing[1]):
        raise ValueError('Pairing sets have different lengths: {}, {}'
                         .format(len(pairing[0]), len(pairing[1])))
    else:
        print('Found', len(pairing[0]), 'pairings.')
    return pairing


# TESTING

OUTCOMES = [
    'sensorPlacementTime', 'ppvStartTime', 'ccStartTime',
    'inSpO2TargetRangeStartTime', 'inSpO2TargetRangeDuration',
    'aboveSpO2TargetRangeDuration', 'belowSpO2TargetRangeDuration',
    'inFiO2TargetRangeStartTime', 'inFiO2TargetRangeDuration',
    'aboveFiO2TargetRangeDuration', 'belowFiO2TargetRangeDuration',
    'spO2SignedErrorIntegral', 'spO2UnsignedErrorIntegral', 'spO2SquaredErrorIntegral'
]

TESTS = {
    'Paired T-Test': stats.ttest_rel,
    'Wilcoxon Signed-Rank Test': stats.wilcoxon
}

def choose_marker(p_value):
    if p_value < 0.05:
        marker = '  **'
    elif p_value < 0.1:
        marker = '  *'
    elif p_value < 0.2:
        marker = '  ~'
    else:
        marker = ' '
    return marker

def print_result(test_name, result, n=None, p_value_position=1):
    p_value = result[p_value_position]
    marker = choose_marker(p_value)
    print(marker, test_name + ':')
    if n != 0:
        print('    n = {}, p = {:.3f}'.format(n, p_value))
        print('   ', result)
    else:
        print('    n =', n)

def apply_test(pairing, outcome_name, test, mask_inf=True):
    if mask_inf:
        (df_a, df_b) = exclude_infinities(*pairing, outcome_name)
    else:
        (df_a, df_b) = pairing
    result = test(df_a[outcome_name], df_b[outcome_name])
    print_result(outcome_name, result, n=len(df_a[outcome_name]))

def test_standard_outcomes(pairing, test, mask_inf=True):
    for outcome in OUTCOMES:
        apply_test(pairing, outcome, test, mask_inf)


# PLOTTING

def hist_scenario_display(df, outcome_name):
    df.hist(column=outcome_name, by=['scenarioType', 'displayType'], sharex=True, sharey=True)

