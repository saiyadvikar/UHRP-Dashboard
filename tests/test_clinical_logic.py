"""
Unit and Integration Test Harness for Clinical Logic and Invariants.
Validates:
1. Severe Anemia 4-Tier Resolution Protocol (Resolved >=11.0, Mild 10.0-10.9, Moderate 7.0-9.9, Severe <7.0)
2. Consecutive Missed ANC Visits (gap >= 2 missed checkups between attended visits or >70 days inactive)
3. Maternal Death Exclusion Invariants (Never counted in pregnant, delivered, or abortion filters)
4. Gestational Age Calculation Boundaries (Early ANC <=12w/84d, ANC checkup windows, preterm <35w)
"""

import unittest
import datetime


# ---------------------------------------------------------
# Clinical Logic Functions Under Test (Deterministic Model)
# ---------------------------------------------------------

def classify_anemia_status(hb_visits, baseline_sa=0, baseline_ma=0):
    """
    Classifies anemia status according to the 4-tier NHM protocol:
    - Hb >= 11.0: Resolved
    - 10.0 <= Hb <= 10.9: Mild
    - 7.0 <= Hb <= 9.9: Moderate
    - Hb < 7.0: Severe
    If no visit Hb recorded, fall back to baseline registration risk.
    """
    valid_hb = [v for v in hb_visits if v is not None and isinstance(v, (int, float))]
    if not valid_hb:
        if baseline_sa == 1:
            return 'severe'
        if baseline_ma == 1:
            return 'moderate'
        return 'no_data'
    
    latest_hb = round(float(valid_hb[-1]), 2)
    if latest_hb >= 11.0:
        return 'resolved'
    elif 10.0 <= latest_hb <= 10.9:
        return 'mild'
    elif 7.0 <= latest_hb <= 9.9:
        return 'moderate'
    elif latest_hb < 7.0:
        return 'severe'
    return 'no_data'


def check_consecutive_missed_anc(patient, ref_date=None):
    """
    Detects if an active pregnant woman has missed >= 2 consecutive ANC visits
    or has had no ANC visit in the last 70 days.
    Delivered or abortion cases are strictly excluded from 'has_missed'.
    """
    is_delivered = (patient.get('del') == 1 or (patient.get('del_date') and patient.get('del_date') not in ('-', 'None', 'nan', '')))
    is_abortion = (patient.get('del') == 2 or patient.get('is_abortion') == 1)
    
    hb_arr = patient.get('hb_v', [])
    bp_arr = patient.get('bp_v', [])
    date_arr = patient.get('v_dates', [])
    
    visit_status = []
    for i in range(12):
        hb = hb_arr[i] if i < len(hb_arr) and hb_arr[i] is not None else None
        bp = bp_arr[i] if i < len(bp_arr) and bp_arr[i] and '/' in str(bp_arr[i]) else None
        dt = date_arr[i] if i < len(date_arr) and date_arr[i] and str(date_arr[i]) not in ('-', 'None', 'nan') else None
        attended = (hb is not None or bp is not None or dt is not None)
        visit_status.append({'index': i, 'attended': attended, 'hb': hb, 'bp': bp, 'date': dt})
    
    first_attended = -1
    last_attended = -1
    for i, v in enumerate(visit_status):
        if v['attended']:
            if first_attended == -1:
                first_attended = i
            last_attended = i
            
    max_consecutive = 0
    current_consecutive = 0
    if first_attended != -1 and last_attended != -1:
        for i in range(first_attended, last_attended + 1):
            if not visit_status[i]['attended']:
                current_consecutive += 1
                if current_consecutive > max_consecutive:
                    max_consecutive = current_consecutive
            else:
                current_consecutive = 0
                
    no_visit_in_last_70_days = False
    days_since_last_visit = None
    if not is_delivered and not is_abortion:
        last_anc_date = None
        # Try getting last visit date from attended dates
        attended_dates = [v['date'] for v in visit_status if v['attended'] and v['date']]
        if attended_dates:
            try:
                clean_d = str(attended_dates[-1]).split(' ')[0]
                parts = [int(p) for p in clean_d.replace('/', '-').split('-')]
                if len(parts) == 3:
                    if parts[0] > 1000: # YYYY-MM-DD
                        last_anc_date = datetime.date(parts[0], parts[1], parts[2])
                    else: # DD-MM-YYYY
                        last_anc_date = datetime.date(parts[2], parts[1], parts[0])
            except Exception:
                pass
                
        if last_anc_date and ref_date:
            diff_days = (ref_date - last_anc_date).days
            days_since_last_visit = diff_days
            if diff_days > 70:
                no_visit_in_last_70_days = True
                
    has_missed = (not is_delivered and not is_abortion) and (max_consecutive >= 2 or no_visit_in_last_70_days)
    
    return {
        'has_missed': has_missed,
        'max_consecutive': max_consecutive,
        'no_visit_in_last_70_days': no_visit_in_last_70_days,
        'days_since_last_visit': days_since_last_visit,
        'first_attended': first_attended,
        'last_attended': last_attended
    }


def is_maternal_death(patient):
    """
    Determines whether a patient record represents a maternal death.
    """
    if not patient:
        return False
    mat = patient.get('mat')
    if mat and str(mat).strip() not in ('No', '-', '', 'nan', 'None'):
        return True
    if patient.get('mat_death') is True:
        return True
    return False


def filter_by_delivery_status(patients, del_filter_val):
    """
    Applies the delivery status filter, strictly enforcing that maternal deaths
    NEVER appear in 'pregnant' (0), 'delivered' (1), or 'abortion' (2).
    """
    filtered = []
    for p in patients:
        is_dead = is_maternal_death(p)
        if del_filter_val == 'death':
            if is_dead:
                filtered.append(p)
        elif is_dead:
            # Invariant: Maternal death cases must NEVER appear in other delivery states
            continue
        elif del_filter_val == 'All':
            filtered.append(p)
        elif del_filter_val == 'abortion':
            if p.get('del') == 2 or p.get('is_abortion') == 1:
                filtered.append(p)
        elif del_filter_val == '0':
            # Pregnant strictly requires del == 0 and not abortion
            if p.get('del') == 0 and p.get('del') != 2 and p.get('is_abortion') != 1:
                filtered.append(p)
        elif del_filter_val == '1':
            # Delivered strictly requires del == 1
            if p.get('del') == 1:
                filtered.append(p)
    return filtered


def calculate_gestational_age_weeks(lmp_date, check_date):
    """
    Computes gestational age in weeks from LMP.
    """
    if not lmp_date or not check_date:
        return None
    diff_days = (check_date - lmp_date).days
    if diff_days < 0:
        return None
    return diff_days / 7.0


def classify_anc_checkup_window(ga_weeks):
    """
    Classifies ANC visit into checkup tier:
    - ga <= 12.0: ANC 1 (Early registration)
    - 12.0 < ga <= 26.0: ANC 2
    - 26.0 < ga <= 34.0: ANC 3
    - ga > 34.0: ANC 4
    """
    if ga_weeks is None or ga_weeks < 0:
        return None
    if ga_weeks <= 12.0:
        return 'ANC1'
    elif ga_weeks <= 26.0:
        return 'ANC2'
    elif ga_weeks <= 34.0:
        return 'ANC3'
    else:
        return 'ANC4'


def is_early_anc_registration(lmp_date, reg_date):
    """
    Early ANC registration must occur within 12 weeks (84 days) of LMP.
    """
    if not lmp_date or not reg_date:
        return False
    diff_days = (reg_date - lmp_date).days
    return 0 <= diff_days <= 84


def is_preterm_delivery(lmp_date, del_date, threshold_weeks=35.0):
    """
    Determines if delivery is preterm based on threshold (35.0 weeks for 4-ANC cohort eligibility).
    """
    ga_weeks = calculate_gestational_age_weeks(lmp_date, del_date)
    if ga_weeks is None:
        return False
    return 0 < ga_weeks < threshold_weeks


# ---------------------------------------------------------
# Test Suite
# ---------------------------------------------------------

class TestClinicalLogic(unittest.TestCase):

    # ---------------------------------------------------------
    # 1. Severe Anemia 4-Tier Resolution Protocol
    # ---------------------------------------------------------
    def test_anemia_severe_tier(self):
        # Boundaries for Severe: Hb < 7.0
        self.assertEqual(classify_anemia_status([6.9]), 'severe')
        self.assertEqual(classify_anemia_status([4.5, 6.99]), 'severe')
        self.assertEqual(classify_anemia_status([6.0]), 'severe')

    def test_anemia_moderate_tier(self):
        # Boundaries for Moderate: 7.0 <= Hb <= 9.9
        self.assertEqual(classify_anemia_status([7.0]), 'moderate')
        self.assertEqual(classify_anemia_status([8.5]), 'moderate')
        self.assertEqual(classify_anemia_status([9.9]), 'moderate')

    def test_anemia_mild_tier(self):
        # Boundaries for Mild: 10.0 <= Hb <= 10.9
        self.assertEqual(classify_anemia_status([10.0]), 'mild')
        self.assertEqual(classify_anemia_status([10.5]), 'mild')
        self.assertEqual(classify_anemia_status([10.9]), 'mild')

    def test_anemia_resolved_tier(self):
        # Boundaries for Resolved: Hb >= 11.0
        self.assertEqual(classify_anemia_status([11.0]), 'resolved')
        self.assertEqual(classify_anemia_status([11.1]), 'resolved')
        self.assertEqual(classify_anemia_status([6.5, 8.2, 11.4]), 'resolved')
        self.assertEqual(classify_anemia_status([14.0]), 'resolved')

    def test_anemia_progression_latest_visit_governance(self):
        # Ensure latest non-null visit overrides earlier visits
        self.assertEqual(classify_anemia_status([5.5, 6.8, None, 10.2]), 'mild')
        self.assertEqual(classify_anemia_status([6.0, 7.5, 9.8, 11.2]), 'resolved')
        self.assertEqual(classify_anemia_status([11.0, 9.5, 6.4]), 'severe')

    def test_anemia_fallback_to_baseline_when_no_visits(self):
        self.assertEqual(classify_anemia_status([], baseline_sa=1), 'severe')
        self.assertEqual(classify_anemia_status([None, None], baseline_sa=1), 'severe')
        self.assertEqual(classify_anemia_status([], baseline_ma=1), 'moderate')
        self.assertEqual(classify_anemia_status([], baseline_sa=0, baseline_ma=0), 'no_data')

    # ---------------------------------------------------------
    # 2. Consecutive Missed ANC Visits
    # ---------------------------------------------------------
    def test_missed_anc_gap_gte_2(self):
        # Attended visit 1 and visit 4 (indices 0 and 3), missed visit 2 and 3 (gap of 2)
        patient = {
            'del': 0,
            'hb_v': [8.0, None, None, 9.0],
            'bp_v': ['110/70', None, None, '115/75'],
            'v_dates': ['01-01-2026', '-', '-', '01-04-2026']
        }
        res = check_consecutive_missed_anc(patient)
        self.assertTrue(res['has_missed'])
        self.assertEqual(res['max_consecutive'], 2)

    def test_missed_anc_gap_lt_2(self):
        # Attended visit 1, missed visit 2 (gap 1), attended visit 3, missed visit 4 (gap 1), attended visit 5
        patient = {
            'del': 0,
            'hb_v': [8.0, None, 8.5, None, 9.0],
            'bp_v': ['110/70', None, '110/70', None, '115/75'],
            'v_dates': ['01-01-2026', '-', '01-03-2026', '-', '01-05-2026']
        }
        res = check_consecutive_missed_anc(patient)
        self.assertFalse(res['has_missed'])
        self.assertEqual(res['max_consecutive'], 1)

    def test_missed_anc_inactive_for_delivered_or_abortion(self):
        # Even with gap >= 2, delivered patients must not be flagged as missed ANC
        delivered_pt = {
            'del': 1,
            'hb_v': [7.0, None, None, 8.0],
            'bp_v': ['120/80', None, None, '120/80'],
            'v_dates': ['01-01-2026', '-', '-', '01-04-2026']
        }
        res_del = check_consecutive_missed_anc(delivered_pt)
        self.assertFalse(res_del['has_missed'])

        abortion_pt = {
            'del': 2,
            'hb_v': [7.0, None, None, 8.0],
            'bp_v': ['120/80', None, None, '120/80'],
            'v_dates': ['01-01-2026', '-', '-', '01-04-2026']
        }
        res_ab = check_consecutive_missed_anc(abortion_pt)
        self.assertFalse(res_ab['has_missed'])

    def test_missed_anc_70_day_lookback_pregnant(self):
        ref_date = datetime.date(2026, 4, 15)
        # Last visit 80 days before reference date
        last_visit_date = '25-01-2026'
        patient = {
            'del': 0,
            'hb_v': [8.0],
            'bp_v': ['110/70'],
            'v_dates': [last_visit_date]
        }
        res = check_consecutive_missed_anc(patient, ref_date=ref_date)
        self.assertTrue(res['has_missed'])
        self.assertTrue(res['no_visit_in_last_70_days'])
        self.assertGreater(res['days_since_last_visit'], 70)

    # ---------------------------------------------------------
    # 3. Maternal Death Exclusion Invariants
    # ---------------------------------------------------------
    def test_maternal_death_classification(self):
        self.assertTrue(is_maternal_death({'mat': 'Yes', 'mat_death': True}))
        self.assertTrue(is_maternal_death({'mat': 'Cause of death: PPH'}))
        self.assertTrue(is_maternal_death({'mat_death': True}))
        self.assertFalse(is_maternal_death({'mat': 'No', 'mat_death': False}))
        self.assertFalse(is_maternal_death({'mat': '-'}))
        self.assertFalse(is_maternal_death({}))

    def test_maternal_death_exclusion_from_pregnant_delivered_abortion(self):
        cohort = [
            {'id': 1, 'n': 'Alive Pregnant', 'del': 0, 'mat': 'No', 'mat_death': False},
            {'id': 2, 'n': 'Alive Delivered', 'del': 1, 'mat': 'No', 'mat_death': False},
            {'id': 3, 'n': 'Alive Abortion', 'del': 2, 'mat': 'No', 'mat_death': False},
            {'id': 4, 'n': 'Maternal Death 1', 'del': 0, 'mat': 'Yes', 'mat_death': True},
            {'id': 5, 'n': 'Maternal Death 2', 'del': 1, 'mat': 'Eclampsia Death', 'mat_death': True},
        ]

        pregnant = filter_by_delivery_status(cohort, '0')
        self.assertEqual([p['id'] for p in pregnant], [1])
        self.assertNotIn(4, [p['id'] for p in pregnant])

        delivered = filter_by_delivery_status(cohort, '1')
        self.assertEqual([p['id'] for p in delivered], [2])
        self.assertNotIn(5, [p['id'] for p in delivered])

        abortion = filter_by_delivery_status(cohort, 'abortion')
        self.assertEqual([p['id'] for p in abortion], [3])

        deaths = filter_by_delivery_status(cohort, 'death')
        self.assertEqual(sorted([p['id'] for p in deaths]), [4, 5])

    # ---------------------------------------------------------
    # 4. Gestational Age Calculation Boundaries
    # ---------------------------------------------------------
    def test_ga_calculation_exact_weeks(self):
        lmp = datetime.date(2026, 1, 1)
        check = datetime.date(2026, 1, 15)  # 14 days = 2.0 weeks
        self.assertEqual(calculate_gestational_age_weeks(lmp, check), 2.0)

    def test_anc_checkup_trimester_windows(self):
        # ANC 1: <= 12.0 weeks
        self.assertEqual(classify_anc_checkup_window(11.9), 'ANC1')
        self.assertEqual(classify_anc_checkup_window(12.0), 'ANC1')

        # ANC 2: 12.0 < ga <= 26.0 weeks
        self.assertEqual(classify_anc_checkup_window(12.1), 'ANC2')
        self.assertEqual(classify_anc_checkup_window(26.0), 'ANC2')

        # ANC 3: 26.0 < ga <= 34.0 weeks
        self.assertEqual(classify_anc_checkup_window(26.1), 'ANC3')
        self.assertEqual(classify_anc_checkup_window(34.0), 'ANC3')

        # ANC 4: > 34.0 weeks
        self.assertEqual(classify_anc_checkup_window(34.1), 'ANC4')
        self.assertEqual(classify_anc_checkup_window(38.0), 'ANC4')

    def test_early_anc_registration_boundary(self):
        lmp = datetime.date(2026, 1, 1)
        reg_84d = lmp + datetime.timedelta(days=84)
        reg_85d = lmp + datetime.timedelta(days=85)

        self.assertTrue(is_early_anc_registration(lmp, reg_84d))
        self.assertFalse(is_early_anc_registration(lmp, reg_85d))

    def test_preterm_delivery_boundary(self):
        lmp = datetime.date(2026, 1, 1)
        # 34 weeks + 6 days = 244 days (< 35 weeks) -> Preterm
        del_preterm = lmp + datetime.timedelta(days=244)
        # 35 weeks = 245 days (>= 35 weeks) -> Eligible / Non-preterm
        del_term = lmp + datetime.timedelta(days=245)

        self.assertTrue(is_preterm_delivery(lmp, del_preterm, threshold_weeks=35.0))
        self.assertFalse(is_preterm_delivery(lmp, del_term, threshold_weeks=35.0))

    # ---------------------------------------------------------
    # 5. Updated Clinical Logic (Management >= 3 IS doses, GDM >= 140, BOH Col AC)
    # ---------------------------------------------------------
    def test_anemia_management_done_requires_3_is_doses_or_fcm_or_bt(self):
        def is_anemia_mgmt_done(p):
            has_doses = isinstance(p.get('is_doses'), list) and len(p['is_doses']) >= 3
            has_fcm = p.get('fcm') == 'Yes'
            has_bt = bool(p.get('bt') and p['bt'] not in ('No', '-'))
            return has_doses or has_fcm or has_bt

        self.assertFalse(is_anemia_mgmt_done({'is_doses': ['2026-05-01'], 'fcm': 'No', 'bt': 'No'}))
        self.assertFalse(is_anemia_mgmt_done({'is_doses': ['2026-05-01', '2026-05-03'], 'fcm': 'No', 'bt': 'No'}))
        self.assertTrue(is_anemia_mgmt_done({'is_doses': ['2026-05-01', '2026-05-03', '2026-05-05'], 'fcm': 'No', 'bt': 'No'}))
        self.assertTrue(is_anemia_mgmt_done({'is_doses': [], 'fcm': 'Yes', 'bt': 'No'}))
        self.assertTrue(is_anemia_mgmt_done({'is_doses': [], 'fcm': 'No', 'bt': '1 Unit'}))

    def test_gdm_ogtt_threshold_140_inclusive(self):
        def is_gdm_ogtt(val1, val2):
            return (val1 is not None and val1 >= 140) or (val2 is not None and val2 >= 140)

        self.assertFalse(is_gdm_ogtt(139.9, 130.0))
        self.assertTrue(is_gdm_ogtt(140.0, None))
        self.assertTrue(is_gdm_ogtt(None, 140.0))
        self.assertTrue(is_gdm_ogtt(120.0, 155.0))

    def test_boh_only_neonate_death_or_stillbirth(self):
        def is_boh(val):
            s = str(val or '').lower()
            return 'neonate death' in s or 'neonatal death' in s or 'stillbirth' in s or 'still birth' in s

        self.assertTrue(is_boh('Neonate Death'))
        self.assertTrue(is_boh('Stillbirth'))
        self.assertTrue(is_boh('Caesarean Section, Neonate Death'))
        self.assertTrue(is_boh('PIH (Pregnancy Induced Hypertension) , Stillbirth'))
        self.assertFalse(is_boh('Caesarean Section'))
        self.assertFalse(is_boh('Repeated Abortion'))
        self.assertFalse(is_boh('Pre-Term'))
        self.assertFalse(is_boh('No'))


if __name__ == '__main__':
    unittest.main()
