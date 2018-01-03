from scipy import stats
import numpy as np


# CATEGORIES

CATEGORY_NAMES = {
    'scenarioType': ['easy', 'hard'],
    'displayType': ['minimal', 'full'],
    'newAfterOld': ['oldAfterNew', 'newAfterOld'],
    'scenarioNumber': ['first', 'second']
}

CATEGORY_VALUES = {
    'scenarioType': {
        'easy': 0,
        'hard': 1
    },
    'displayType': {
        'minimal': 0,
        'full': 1
    },
    'newAfterOld': {
        'oldAfterNew': 0,
        'newAfterOld': 1
    },
    'scenarioNumber': {
        'first': 0,
        'second': 1
    }
}


# PAIRING

class Pairing(object):
    def __init__(self, df, binary_variable, values=(0, 1)):
        self.dfs = [
            df[df[binary_variable] == value]
            for value in values
        ]
        self.variable = binary_variable
        try:
            self.category_names = CATEGORY_NAMES[self.variable]
        except KeyError:
            self.category_names = None
        try:
            self.category_values = CATEGORY_VALUES[self.variable]
        except KeyError:
            self.category_values = None

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

    def describe(self):
        print('Pairing against {}:'.format(self.variable))
        print('  0: {} vs. 1: {}'.format(self.category_names[0], self.category_names[1]))
        print('  {} 0 vs. 1 pairs.'.format(len(self.dfs[0])))
        print('  Paired t-test alternative hypotheses:')
        print('    Ha left-tailed (diff < 0): mean {} - mean {} < 0'.format(0, 1))
        print('    Ha two-tailed (|diff| > 0): mean {} - mean {} != 0'.format(0, 1))
        print('    Ha right-tailed (diff > 0): mean {} - mean {} > 0'.format(0, 1))
        print('  Wilcoxon signed-rank alternative hypotheses:')
        print('    Ha left-tailed (P(x > y) < 0.5)')
        print('    Ha two-tailed (P(x > y) != 0.5)')
        print('    Ha right-tailed (P(x > y) > 0.5)')

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

def build_pairing(df, binary_variable, values=(0, 1),
                  intersect_subjects=True, check_validity=True):
    pairing = Pairing(df, binary_variable, values=values)
    if intersect_subjects:
        pairing.dfs = intersect_by_series(*pairing, 'subjectNumber')
    if not check_validity:
        return pairing
    check_pairing_validity(*pairing, 'subjectNumber')
    for variable in ['scenarioType', 'displayType']:
        if binary_variable != variable:
            check_pairing_validity(*pairing, variable)
    if len(pairing[0]) != len(pairing[1]):
        raise ValueError('Pairing sets have different lengths: {}, {}'
                         .format(len(pairing[0]), len(pairing[1])))
    return pairing


# TESTING

OUTCOMES = [
    'sensorPlacementTime', 'ppvStartTime', 'ccStartTime',
    'inSpO2TargetRangeStartTime',
    'inSpO2TargetRangeDuration', 'inSpO2LooseTargetRangeDuration',
    'aboveSpO2TargetRangeDuration', 'belowSpO2TargetRangeDuration',
    'inFiO2TargetRangeStartTime', 'inFiO2TargetRangeDuration',
    'aboveFiO2TargetRangeDuration', 'belowFiO2TargetRangeDuration',
    'spO2SignedErrorIntegral', 'spO2UnsignedErrorIntegral', 'spO2SquaredErrorIntegral'
]

def choose_marker(p_value):
    if p_value < 0.05:
        marker = '**'
    elif p_value < 0.1:
        marker = ' *'
    elif p_value < 0.2:
        marker = ' ~'
    else:
        marker = '  '
    return marker

def compute_differences(df_a, df_b, outcome_name):
    differences = df_a[outcome_name].values - df_b[outcome_name].values
    return(differences, np.nanmean(differences))

def apply_t_test(series_a, series_b, paired=True):
    if paired:
        result = stats.ttest_rel(series_a, series_b)
    else:
        result = stats.ttest_ind(series_a, series_b)
    p_value = result[1]
    left_p_value = p_value / 2 if result[0] < 0 else 1 - p_value / 2
    right_p_value = p_value / 2 if result[0] > 0 else 1 - p_value / 2
    if np.isnan(p_value):
        print('    Skipped t-test.')
        return
    if paired:
        print('  Paired t-test:')
    else:
        print('  Independent t-test:')
    print('  {}|diff| > 0: p = {:.3f}'.format(choose_marker(p_value), p_value))
    print('  {}diff < 0: p = {:.3f}'.format(choose_marker(left_p_value), left_p_value))
    print('  {}diff > 0: p = {:.3f}'.format(choose_marker(right_p_value), right_p_value))

def apply_wilcoxon_test(series_a, series_b):
    result = stats.wilcoxon(series_a, series_b)
    mean_difference = np.nanmean(series_a.values - series_b.values)
    p_value = result[1]
    left_p_value = p_value / 2 if mean_difference < 0 else 1 - p_value / 2
    right_p_value = p_value / 2 if mean_difference > 0 else 1 - p_value / 2
    if np.isnan(p_value):
        print('    Skipped Wilcoxon test.')
        return
    print('  Wilcoxon signed-rank test:')
    print('  {}P(x > y) != 0.5: p = {:.3f}'.format(choose_marker(p_value), p_value))
    print('  {}P(x > y) < 0.5: p = {:.3f}'.format(choose_marker(left_p_value), left_p_value))
    print('  {}P(x > y) > 0.5: p = {:.3f}'.format(choose_marker(right_p_value), right_p_value))

def apply_tests(pairing, outcome_name, mask_inf=True):
    if mask_inf:
        (df_a, df_b) = exclude_infinities(*pairing, outcome_name)
    else:
        (df_a, df_b) = pairing
    (differences, mean_difference) = compute_differences(df_a, df_b, outcome_name)
    n = len(differences)
    print(outcome_name + ':')
    if n == 0:
        print('  Skipped.')
        return
    print('  mean difference = {:.3f}'.format(mean_difference))
    apply_t_test(df_a[outcome_name], df_b[outcome_name])
    apply_wilcoxon_test(df_a[outcome_name], df_b[outcome_name])

def test_standard_outcomes(pairing, mask_inf=True):
    for outcome in OUTCOMES:
        apply_tests(pairing, outcome, mask_inf)


# PLOTTING

def hist_scenario_display(df, outcome_name):
    df.hist(column=outcome_name, by=['scenarioType', 'displayType'], sharex=True, sharey=True)

