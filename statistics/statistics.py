from functools import reduce

from scipy import stats
import numpy as np
import pandas as pd


# PANDAS UTILS

def merge_dfs(left_df, right_df):
    return left_df.merge(right_df, left_index=True, right_index=True)

def merge_all_dfs(all_dfs):
    return reduce(merge_dfs, all_dfs)

def add_all_series(df, all_columns):
    def add_series(left_series, right_column):
        return left_series + df[right_column]

    return reduce(add_series, all_columns[1:], df[all_columns[0]])


# LOADING

GAZE_FEATURES = {
    'visitDuration': 'AOI Total Visit Duration incl 0',
    'visitCount': 'AOI Visit Count incl 0'
}

GAZE_ROW_BOUNDS = {
    'visitDuration': {
        'full': {
            'header': 2,
            'last': 73,
        },
        'minimal': {
            'header': 79,
            'last': 150,
        },
        'last': 155
    },
    'visitCount': {
        'full': {
            'header': 2,
            'last': 73,
        },
        'minimal': {
            'header': 78,
            'last': 149,
        },
        'last': 151
    }
}

GAZE_DROP_COLUMNS = {
    'visitDuration': [
        'Average', 'Median', 'Sum', 'Total Time of Interest Duration',
        'Total Recording Duration'
    ],
    'visitCount': ['Average', 'Median']
}

GAZE_RENAME_COLUMNS = {
    'Participant': 'id',
    'Infant': 'infant',
    'Instrument Panel': 'warmerInstrumentPanel',
    'FiO2 Dial': 'fiO2Dial',
    'SpO2 Reference Table': 'spO2ReferenceTable',
    'Monitor': 'monitorFull',
    'Blank Monitor': 'monitorBlank',
    'Time': 'monitorApgarTimer',
    'Heart Rate': 'monitorHeartRate',
    'Oxygen Saturation': 'monitorSpO2',
    'Graph': 'monitorGraph',  # only on full monitor
    'FiO2': 'monitorFiO2'  # only on full monitor
}

GAZE_COMPUTE_COLUMNS = {
    'combinedFiO2': ['fiO2Dial', 'monitorFiO2'],
    'combinedSpO2': ['spO2ReferenceTable', 'monitorSpO2', 'monitorGraph']
}

def load_tracing_features(filename='features.csv', sort='type', fillna=250):
    tracing_df = pd.read_csv(filename, index_col=0)
    if sort == 'type':
        tracing_df.sort_values(by=['subjectNumber', 'scenarioType', 'displayType'],
                               inplace=True)
    elif sort == 'order':
        tracing_df.sort_values(by=['subjectNumber', 'scenarioNumber'], inplace=True)
    if fillna is not None:
        tracing_df.fillna(value=fillna, inplace=True)
    return tracing_df

def load_recording_relations(filename='recordings.csv'):
    recording_df = pd.read_csv(filename, index_col=0)
    return recording_df

def associate_recordings(recording_df, tracing_df):
    merged_df = merge_dfs(tracing_df, recording_df)
    merged_df.dropna(subset=['recording'], inplace=True)
    merged_df.reset_index(inplace=True)
    merged_df.set_index('recording', inplace=True, verify_integrity=True)
    return merged_df

def load_gaze_features(filename='eyetracking.xlsx', feature_sets=GAZE_ROW_BOUNDS):
    display_features_dfs = {
        displayType: {
            feature_set: pd.read_excel(
                filename, sheet_name=GAZE_FEATURES[feature_set],
                index_col=0, header=row_bounds[displayType]['header'] - 1,
                skip_footer=row_bounds['last'] - row_bounds[displayType]['last']
            )
            for (feature_set, row_bounds) in feature_sets.items()
        }
        for displayType in CATEGORY_NAMES['displayType']
    }
    for (displayType, dfs) in display_features_dfs.items():
        for (feature_set, df) in dfs.items():
            df.index.names = ['recording']
            df.rename(columns=GAZE_RENAME_COLUMNS, inplace=True)
            df.dropna(subset=['Average'], inplace=True)
            df.dropna(axis=1, how='all', inplace=True)
            df.drop(columns=GAZE_DROP_COLUMNS[feature_set], inplace=True)
    features_dfs = {
        feature_set: pd.concat(
            [
                display_features_dfs[displayType][feature_set]
                for displayType in display_features_dfs
            ], verify_integrity=True
        )
        for feature_set in feature_sets
    }
    for (feature_set, df) in features_dfs.items():
        df.sort_index(inplace=True)
        df.fillna(value=0, inplace=True)
    return features_dfs

def check_gaze_recording_associations(recording_df, gaze_dfs):
    for df in gaze_dfs.values():
        merged_df = merge_dfs(recording_df, df)
        id_mismatch_mask = merged_df.id_x != merged_df.id_y
        if np.any(id_mismatch_mask):
            raise ValueError('Mismatched ids for recordings: {}'
                             .format(merged_df.index.values[id_mismatch_mask]))
        df.drop(columns=['id'], inplace=True)

def compute_gaze_features(gaze_dfs):
    for (feature_set, df) in gaze_dfs.items():
        for (column, summand_columns) in GAZE_COMPUTE_COLUMNS.items():
            df[column] = add_all_series(df, summand_columns)

def combine_gaze_features(gaze_dfs):
    for (feature_set, df) in gaze_dfs.items():
        df.rename(axis='columns', mapper=lambda column: '{}_{}'.format(feature_set, column),
                  inplace=True)
    merged_df = merge_all_dfs(gaze_dfs.values())
    return merged_df

def combine_all_features(recording_df, gaze_df):
    return merge_dfs(recording_df, gaze_df)


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
        pairing.dfs = intersect_by_series(pairing[0], pairing[1], 'subjectNumber')
    if not check_validity:
        return pairing
    check_pairing_validity(pairing[0], pairing[1], 'subjectNumber')
    for variable in ['scenarioType', 'displayType']:
        if binary_variable != variable:
            check_pairing_validity(pairing[0], pairing[1], variable)
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
    'spO2SignedErrorIntegral', 'spO2UnsignedErrorIntegral', 'spO2SquaredErrorIntegral',
    'fiO2LargeAdjustments'
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
    p = result[1]
    left_p = p / 2 if result[0] < 0 else 1 - p / 2
    right_p = p / 2 if result[0] > 0 else 1 - p / 2
    if np.isnan(p):
        print('    Skipped t-test.')
        return
    if paired:
        print('  Paired t-test:')
    else:
        print('  Independent t-test:')
    print('  {}|diff| > 0: p = {:.3f}'.format(choose_marker(p), p))
    print('  {}diff < 0: p = {:.3f}'.format(choose_marker(left_p), left_p))
    print('  {}diff > 0: p = {:.3f}'.format(choose_marker(right_p), right_p))

def apply_wilcoxon_test(series_a, series_b):
    result = stats.wilcoxon(series_a, series_b)
    mean_difference = np.nanmean(series_a.values - series_b.values)
    p = result[1]
    left_p = p / 2 if mean_difference < 0 else 1 - p / 2
    right_p = p / 2 if mean_difference > 0 else 1 - p / 2
    if np.isnan(p):
        print('    Skipped Wilcoxon test.')
        return
    print('  Wilcoxon signed-rank test:')
    print('  {}P(x > y) != 0.5: p = {:.3f}'.format(choose_marker(p), p))
    print('  {}P(x > y) < 0.5: p = {:.3f}'.format(choose_marker(left_p), left_p))
    print('  {}P(x > y) > 0.5: p = {:.3f}'.format(choose_marker(right_p), right_p))

def apply_tests(pairing, outcome_name, mask_inf=True):
    if mask_inf:
        (df_a, df_b) = exclude_infinities(pairing[0], pairing[1], outcome_name)
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
    df.hist(column=outcome_name, by=['scenarioType', 'displayType'],
            sharex=True, sharey=True)

