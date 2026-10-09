"""
Ultra HRP Dashboard — Data Processing Script
Reads from project subfolders: HRP line list, ANC line list, Redcap linelist
Generates data.js for the frontend dashboard.
"""
import os, glob, json, time, sys, re, datetime
import pandas as pd
import numpy as np
import openpyxl
from difflib import SequenceMatcher

sys.stdout.reconfigure(encoding='utf-8')

WORKSPACE = os.path.dirname(os.path.abspath(__file__))
HRP_DIR = os.path.join(WORKSPACE, "HRP line list")
ANC_DIR = os.path.join(WORKSPACE, "ANC line list")
LOCATION_DIR = os.path.join(WORKSPACE, "Location Hirarchy")
DELIVERY_DIR = os.path.join(WORKSPACE, "Delivery linelist")

def format_to_dd_mmyyyy(val):
    """Format any date representation to strict DD-MM-YYYY string."""
    if val is None or pd.isna(val):
        return '-'
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime('%d-%m-%Y')
    s = str(val).strip()
    if s in ('', 'nan', 'None', 'NaT', '-'):
        return '-'
    # Check if already in DD-MM-YYYY
    m_ddmmyyyy = re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$', s)
    if m_ddmmyyyy:
        d, m, y = m_ddmmyyyy.groups()
        return f"{int(d):02d}-{int(m):02d}-{y}"
    # Check YYYY-MM-DD
    m_yyyymmdd = re.match(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})', s)
    if m_yyyymmdd:
        y, m, d = m_yyyymmdd.groups()
        return f"{int(d):02d}-{int(m):02d}-{y}"
    return s

def get_fiscal_year(date_val):
    """Determine fiscal year string (e.g. '2025-26', '2026-27') from any date string or object."""
    if not date_val or date_val is None or str(date_val).strip() in ('', 'nan', 'None', 'NaT', '-'):
        return '2025-26' # default fallback
    s = str(date_val).strip()
    # Check YYYY-MM-DD or YYYY-MM
    m_yyyy = re.match(r'^(\d{4})[-/](\d{1,2})', s)
    if m_yyyy:
        y, month = int(m_yyyy.group(1)), int(m_yyyy.group(2))
        if month >= 4:
            return f"{y}-{str(y+1)[2:]}"
        else:
            return f"{y-1}-{str(y)[2:]}"
    # Check DD-MM-YYYY
    m_dd = re.match(r'^\d{1,2}[-/](\d{1,2})[-/](\d{4})', s)
    if m_dd:
        month, y = int(m_dd.group(1)), int(m_dd.group(2))
        if month >= 4:
            return f"{y}-{str(y+1)[2:]}"
        else:
            return f"{y-1}-{str(y)[2:]}"
    # Search for any 4 digits
    m_any = re.search(r'(\d{4})', s)
    if m_any:
        y = int(m_any.group(1))
        return f"{y}-{str(y+1)[2:]}"
    return '2025-26'

def is_mo_str(s):
    """Detect if designation string corresponds to a Medical Officer / Doctor."""
    if not s or s is None: return False
    sl = str(s).lower().strip()
    return any(k in sl for k in ['medical officer', 'gynecologist', 'doctor', 'mo (', 'lmo', 'pgmo'])

def read_file_metadata(file_path, from_row=3, to_row=4):
    """Read From Date / To Date metadata from an Excel report."""
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    sheet = wb[wb.sheetnames[0]]
    meta = {}
    for r in range(1, 7):
        row = next(sheet.iter_rows(min_row=r, max_row=r, min_col=1, max_col=5, values_only=True))
        vals = [str(v) for v in row if v is not None]
        if r == from_row:
            meta['from_date'] = vals[1] if len(vals) > 1 else ''
        if r == to_row:
            meta['to_date'] = vals[1] if len(vals) > 1 else ''
    wb.close()
    return meta

def load_excel_fast(file_path, skip_rows=0, use_cols=None):
    """Memory-efficient and fast row-by-row Excel loader using openpyxl read_only mode."""
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    sheet = wb[wb.sheetnames[0]]
    rows_iter = sheet.iter_rows(values_only=True)
    
    # Skip initial rows
    for _ in range(skip_rows):
        next(rows_iter)
        
    # Get header row
    headers = next(rows_iter)
    
    # Determine which indices to extract
    if use_cols is not None:
        if all(isinstance(x, int) for x in use_cols):
            use_indices = use_cols
            col_names = []
            for idx in use_indices:
                if idx < len(headers) and headers[idx] is not None:
                    col_names.append(headers[idx])
                else:
                    col_names.append(f"Col{idx}")
        else:
            # use_cols is a list of strings
            header_map = {str(h).strip().lower(): i for i, h in enumerate(headers) if h is not None}
            use_indices = []
            col_names = []
            for col_name in use_cols:
                c_low = col_name.strip().lower()
                if c_low in header_map:
                    use_indices.append(header_map[c_low])
                    col_names.append(headers[header_map[c_low]])
                else:
                    # Fuzzy match
                    found = False
                    for h_low, idx in header_map.items():
                        if c_low in h_low or h_low in c_low:
                            use_indices.append(idx)
                            col_names.append(headers[idx])
                            found = True
                            break
                    if not found:
                        use_indices.append(9999) # placeholder
                        col_names.append(col_name)
    else:
        use_indices = list(range(len(headers)))
        col_names = headers
        
    # Make col_names unique to avoid pandas duplicate columns issue
    seen = {}
    unique_col_names = []
    for col in col_names:
        c_str = str(col)
        if c_str in seen:
            seen[c_str] += 1
            unique_col_names.append(f"{c_str}.{seen[c_str]}")
        else:
            seen[c_str] = 0
            unique_col_names.append(c_str)
            
    data = []
    for row in rows_iter:
        row_data = []
        for idx in use_indices:
            if idx < len(row):
                row_data.append(row[idx])
            else:
                row_data.append(None)
        data.append(row_data)
        
    wb.close()
    return pd.DataFrame(data, columns=unique_col_names)

def clean_str(v):
    if pd.isna(v) or v is None: return ''
    return re.sub(r'\s+', ' ', str(v).strip().lower())

def clean_mobile(v):
    if pd.isna(v) or v is None: return ''
    s = re.sub(r'[^0-9]', '', str(v).split('.')[0])
    if len(s) == 12 and s.startswith('91'): s = s[2:]
    if len(s) == 10 and s not in ('9999999999', '0000000000'): return s
    return ''

def fuzzy_match(s1, s2, threshold=0.75):
    if not s1 or not s2: return False
    return SequenceMatcher(None, s1, s2).ratio() >= threshold

def load_location_hierarchy(loc_dir):
    """Load Location Hierarchy workbook to map (block, subcentre) -> facility_name."""
    if not os.path.exists(loc_dir):
        return {}
    loc_files = [f for f in os.listdir(loc_dir) if f.endswith('.xlsx') and not f.startswith('~$')]
    if not loc_files:
        return {}
    loc_path = os.path.join(loc_dir, loc_files[0])
    try:
        wb = openpyxl.load_workbook(loc_path, data_only=True)
        sub_map = {}
        # 1. Village list
        if 'Village list' in wb.sheetnames:
            s = wb['Village list']
            for r in s.iter_rows(min_row=3, values_only=True):
                b = str(r[3] or '').strip().lower()
                fac = str(r[6] or '').strip().title()
                sub = str(r[10] or '').strip().lower()
                if sub and sub not in ('blank', 'none', 'nan', ''):
                    sub_map[(b, sub)] = fac
                    sub_map[sub] = fac
                    c_sub = sub.replace('shc ', '').replace('sc ', '').replace('shc', '').strip()
                    if c_sub:
                        sub_map[(b, c_sub)] = fac
                        sub_map[c_sub] = fac

        # 2. CHO
        if 'CHO' in wb.sheetnames:
            s = wb['CHO']
            for r in s.iter_rows(min_row=4, values_only=True):
                b = str(r[2] or '').strip().lower()
                fac = str(r[3] or '').strip().title()
                sub = str(r[4] or '').strip().lower()
                if sub and sub not in ('blank', 'none', 'nan', ''):
                    sub_map[(b, sub)] = fac
                    sub_map[sub] = fac
                    c_sub = sub.replace('shc ', '').replace('sc ', '').replace('shc', '').strip()
                    if c_sub:
                        sub_map[(b, c_sub)] = fac
                        sub_map[c_sub] = fac

        # 3. ANM
        if 'ANM' in wb.sheetnames:
            s = wb['ANM']
            for r in s.iter_rows(min_row=4, values_only=True):
                b = str(r[2] or '').strip().lower()
                fac = str(r[3] or '').strip().title()
                sub = str(r[4] or '').strip().lower()
                if sub and sub not in ('blank', 'none', 'nan', ''):
                    sub_map[(b, sub)] = fac
                    sub_map[sub] = fac
                    c_sub = sub.replace('shc ', '').replace('sc ', '').replace('shc', '').strip()
                    if c_sub:
                        sub_map[(b, c_sub)] = fac
                        sub_map[c_sub] = fac

        wb.close()
        print(f"  Loaded {len(sub_map)} location hierarchy mappings.")
        return sub_map
    except Exception as e:
        print(f"  Warning loading location hierarchy: {e}")
        return {}

def load_delivery_linelist(del_dir):
    """Load Delivery Line List report to extract delivery details, admission Hb and BP."""
    if not os.path.exists(del_dir):
        return {}
    del_files = [f for f in os.listdir(del_dir) if f.endswith('.xlsx') and not f.startswith('~$')]
    if not del_files:
        return {}
    del_path = os.path.join(del_dir, del_files[0])
    try:
        print(f"  → Loading Delivery Line List: {os.path.basename(del_path)}")
        wb = openpyxl.load_workbook(del_path, read_only=True, data_only=True)
        sheet = wb[wb.sheetnames[0]]
        rows_iter = sheet.iter_rows(values_only=True)
        # Headers at row 9 (skip 8 rows)
        for _ in range(8):
            next(rows_iter)
        headers = [c for c in next(rows_iter)]

        mpid_idx = headers.index('MPID') if 'MPID' in headers else 5
        del_at_idx = headers.index('Delivery At') if 'Delivery At' in headers else 13
        fac_type_idx = headers.index('Facility Type(Govt/Pvt)') if 'Facility Type(Govt/Pvt)' in headers else 16
        fac_name_idx = headers.index('Facility Name') if 'Facility Name' in headers else 17
        bp_adm_idx = headers.index('BP At Admission') if 'BP At Admission' in headers else 20
        hb_adm_idx = headers.index('HB on LR admission') if 'HB on LR admission' in headers else 27
        del_date_idx = headers.index('Date of Delivery') if 'Date of Delivery' in headers else 34

        delivery_map = {}
        count = 0
        for r in rows_iter:
            if mpid_idx < len(r) and r[mpid_idx] is not None:
                mpid = str(r[mpid_idx]).strip().split('.')[0]
                if mpid and mpid not in ('None', 'nan', ''):
                    del_at = str(r[del_at_idx] or '').strip() if del_at_idx < len(r) else ''
                    fac_type = str(r[fac_type_idx] or '').strip() if fac_type_idx < len(r) else ''
                    fac_name = str(r[fac_name_idx] or '').strip() if fac_name_idx < len(r) else ''
                    bp_adm = str(r[bp_adm_idx] or '').strip() if bp_adm_idx < len(r) else ''
                    raw_hb = r[hb_adm_idx] if hb_adm_idx < len(r) else None
                    raw_del_date = r[del_date_idx] if del_date_idx < len(r) else None

                    hb_val = None
                    if raw_hb is not None and str(raw_hb).strip() not in ('', '-', 'None', 'nan'):
                        try:
                            flt = float(raw_hb)
                            if not np.isnan(flt) and flt > 0:
                                hb_val = round(flt, 1)
                        except:
                            pass

                    del_date_str = format_to_dd_mmyyyy(raw_del_date)

                    delivery_map[mpid] = {
                        'del_at': del_at,
                        'fac_type': fac_type,
                        'fac_name': fac_name,
                        'del_date': del_date_str,
                        'hb_lr': hb_val,
                        'bp_adm': bp_adm if bp_adm not in ('', '-', 'None', 'nan') else ''
                    }
                    count += 1
        wb.close()
        print(f"  Loaded {count} delivery records from Delivery Line List.")
        return delivery_map
    except Exception as e:
        print(f"  Warning loading delivery line list: {e}")
        return {}

def categorize_delivery_facility(fac_name, fac_type, place_val):
    """Categorize delivery facility into standard dashboard categories."""
    p_lower = str(place_val or '').lower().strip()
    if 'home' in p_lower:
        return 'Home'
    if 'transit' in p_lower or 'way' in p_lower:
        return 'in transit'
    
    t_lower = str(fac_type or '').lower().strip()
    n_lower = str(fac_name or '').lower().strip()
    n_upper = str(fac_name or '').upper().strip()
    
    if 'private' in t_lower or 'private' in p_lower or 'private' in n_lower or 'pvt' in n_lower:
        return 'Private hospitals'
    if 'medical college' in t_lower or 'medical college' in n_lower or n_upper.startswith('MY ') or t_lower == 'mc':
        return 'Medical College'
    if 'district hospital' in t_lower or n_upper.startswith('DH ') or ' DH' in n_upper or 'DISTRICT HOSPITAL' in n_upper:
        return 'DH'
    if 'civil hospital' in t_lower or n_upper.startswith('CH ') or ' CH' in n_upper or 'CIVIL HOSPITAL' in n_upper:
        return 'CH'
    if 'community health' in t_lower or n_upper.startswith('CHC ') or ' CHC' in n_upper or 'COMMUNITY HEALTH' in n_upper or 'chc' in n_lower:
        return 'CHC'
    if 'primary health' in t_lower or n_upper.startswith('PHC ') or ' PHC' in n_upper or 'SHC' in n_upper or 'urban' in t_lower or 'phc' in n_lower:
        return 'PHC'
    return 'Public Facility'

def map_delivery_place(row):
    place = clean_str(row.get('Place of Delivery', ''))
    fac_type = clean_str(row.get('Facility Type(Govt/Pvt)', ''))
    district = clean_str(row.get('District', ''))

    if not place or place == 'nan': return 'Not Delivered'
    if 'out of state' in place: return 'Out of District'
    if district and 'khargone' not in district and 'west nimar' not in district and district not in ('nan', ''):
        return 'Out of District'
    if 'home' in place: return 'Home'
    if any(w in place for w in ['in-transit', 'transit', 'way']): return 'On the Way'
    if 'private' in place or 'private' in fac_type: return 'Private Hospital'
    if any(w in fac_type for w in ['district hospital', 'medical college']): return 'District Hospital'
    if any(w in fac_type for w in ['civil hospital', 'sdh', 'sub-district', 'sub district']): return 'SDH'
    if any(w in fac_type for w in ['community health', 'chc']): return 'CHC'
    if any(w in fac_type for w in ['primary health', 'phc', 'sub centre', 'health post', 'urban']): return 'PHC'
    if 'hospital' in place: return 'Public Facility'
    return 'Other'

def main():
    print("=" * 60)
    print("    ULTRA HRP DASHBOARD — DATA PROCESSING")
    print("=" * 60)
    start_time = time.time()

    # ===================================================================
    # STEP 1: LOAD HRP LINE LIST FILES
    # ===================================================================
    print("\n[1/5] Loading HRP Line List files...")
    hrp_files = sorted([f for f in glob.glob(os.path.join(HRP_DIR, "*.xlsx"))
                        if not os.path.basename(f).startswith("~$")])
    print(f"  Found {len(hrp_files)} HRP file(s)")

    hrp_frames = []
    hrp_raw_counts = {}

    for fpath in hrp_files:
        fname = os.path.basename(fpath)
        meta = read_file_metadata(fpath, from_row=3, to_row=4)
        fy = get_fiscal_year(meta.get('from_date', ''))
        print(f"  → {fname}: FY {fy} ({meta.get('from_date','')} to {meta.get('to_date','')})")
        df = load_excel_fast(fpath, skip_rows=7)
        # Assign fiscal year dynamically per record based on PW Registration Date (or LMP Date)
        reg_col = 'PW Registration Date' if 'PW Registration Date' in df.columns else None
        lmp_col = 'LMP Date' if 'LMP Date' in df.columns else None

        def extract_row_fy(row):
            dt = row.get(reg_col) if reg_col else None
            if dt is None or pd.isna(dt) or str(dt).strip() in ('', '-', 'nan', 'None', 'NaT'):
                dt = row.get(lmp_col) if lmp_col else None
            return get_fiscal_year(dt)

        df['Year'] = df.apply(extract_row_fy, axis=1)
        df['SourceFile'] = fname
        hrp_frames.append(df)

    df_hrp = pd.concat(hrp_frames, ignore_index=True)
    # Recalculate raw counts per fiscal year
    for fy_val, count in df_hrp['Year'].value_counts().items():
        hrp_raw_counts[str(fy_val)] = int(count)
    print(f"  Total HRP records loaded: {len(df_hrp)} | Counts by Year: {hrp_raw_counts}")

    # ===================================================================
    # STEP 2: CLASSIFY 6 RISK FACTORS
    # ===================================================================
    print("\n[2/5] Classifying risk factors...")

    # Severe Anemia — Col AH
    df_hrp['is_severe_anemia'] = df_hrp['If severe anemia (Yes/No)'].astype(str).str.strip().str.lower() == 'yes'
    # Moderate Anemia — Col AG (Requirement 2)
    df_hrp['is_moderate_anemia'] = df_hrp['If moderate anemia (Yes/No)'].astype(str).str.strip().str.lower() == 'yes'
    # PIH — Col AQ
    df_hrp['is_pih'] = df_hrp['Identified with PIH (Yes/No)'].astype(str).str.strip().str.lower() == 'yes'
    # Previous LSCS — Col AD
    df_hrp['is_lscs'] = df_hrp['Previous LSCS'].astype(str).str.strip().str.lower() == 'yes'
    # Sickle Cell Disease — Col W
    sickle_cols = [c for c in df_hrp.columns if 'sickle cell test' in c.lower()]
    if sickle_cols:
        df_hrp['is_sickle'] = df_hrp[sickle_cols[0]].fillna('').astype(str).str.lower().apply(
            lambda x: ('disease' in x or 'sickle beta' in x) and 'trait' not in x)
    else:
        df_hrp['is_sickle'] = False
    # Teenage Pregnancy — Col Q: Age <= 17
    df_hrp['age_numeric'] = pd.to_numeric(df_hrp['Age'], errors='coerce')
    df_hrp['is_teenage'] = (df_hrp['age_numeric'] > 0) & (df_hrp['age_numeric'] <= 17)
    # Complications in Last Pregnancy (Bad Obstetric History) — Col AB
    df_hrp['is_boh'] = df_hrp['Complication in Last Pregnancy (Yes/No)'].astype(str).str.strip().str.lower() == 'yes'

    # GDM — Col AS:
    # Keep only those GDM which are associated with other 6 risk factors OR documented on treatment in Col AT, Col AX (On MNT), Col AY (On Metformin), or Col AZ (On Insulin)
    df_hrp['is_gdm_raw'] = df_hrp['GDM Positive'].astype(str).str.strip().str.lower() == 'yes'
    df_hrp['gdm_mgmt_at'] = df_hrp['GDM Mangement'].astype(str).str.strip().str.lower() == 'yes'
    df_hrp['gdm_mnt'] = df_hrp['On MNT'].astype(str).str.strip().str.lower() == 'yes' if 'On MNT' in df_hrp.columns else False
    df_hrp['gdm_metformin'] = df_hrp['On Metformin'].astype(str).str.strip().str.lower() == 'yes' if 'On Metformin' in df_hrp.columns else False
    df_hrp['gdm_insulin'] = df_hrp['On Insulin'].astype(str).str.strip().str.lower() == 'yes' if 'On Insulin' in df_hrp.columns else False

    df_hrp['gdm_on_treatment'] = df_hrp['gdm_mgmt_at'] | df_hrp['gdm_mnt'] | df_hrp['gdm_metformin'] | df_hrp['gdm_insulin']
    df_hrp['has_other_6'] = (
        df_hrp['is_severe_anemia'] | df_hrp['is_pih'] | df_hrp['is_lscs'] |
        df_hrp['is_sickle'] | df_hrp['is_teenage'] | df_hrp['is_boh']
    )
    df_hrp['is_gdm'] = df_hrp['is_gdm_raw'] & (df_hrp['has_other_6'] | df_hrp['gdm_on_treatment'])

    df_hrp['is_uhrp_severe'] = (
        df_hrp['is_severe_anemia'] | df_hrp['is_pih'] | df_hrp['is_gdm'] |
        df_hrp['is_lscs'] | df_hrp['is_sickle'] | df_hrp['is_teenage'] | df_hrp['is_boh']
    )
    df_hrp['has_any_risk'] = df_hrp['is_uhrp_severe'] | df_hrp['is_moderate_anemia']

    # De-duplicate by (Year, MP ID)
    df_hrp['MP_ID_clean'] = df_hrp['MP ID'].astype(str).str.strip().str.split('.').str[0]
    df_hrp.loc[df_hrp['MP_ID_clean'].isin([None, '', 'nan', 'None']), 'MP_ID_clean'] = \
        'TEMP_' + df_hrp.loc[df_hrp['MP_ID_clean'].isin([None, '', 'nan', 'None']), 'S.No'].astype(str)

    df_unique = df_hrp.drop_duplicates(subset=['Year', 'MP_ID_clean']).copy()
    df_risk = df_unique[df_unique['has_any_risk']].copy()

    print(f"  Unique HRP patients: {len(df_unique)}")
    print(f"  Combined cohort (UHRP + Moderate Anemia): {len(df_risk)}")
    print(f"  UHRP cohort (7 severe risk factors): {df_risk['is_uhrp_severe'].sum()}")
    for label, col in [('Severe Anemia','is_severe_anemia'),('Moderate Anemia','is_moderate_anemia'),
                        ('PIH','is_pih'),('GDM','is_gdm'),('Previous LSCS','is_lscs'),
                        ('Sickle Cell','is_sickle'),('Teenage ≤17','is_teenage'),
                        ('Complication Last Preg','is_boh')]:
        print(f"    {label}: {df_risk[col].sum()}")

    # ===================================================================
    # STEP 3: MAP DELIVERY PLACES & MONTHS
    # ===================================================================
    print("\n[3/5] Mapping delivery places...")
    df_risk['delivery_place'] = df_risk.apply(map_delivery_place, axis=1)
    df_risk['reg_date'] = pd.to_datetime(df_risk['PW Registration Date'], errors='coerce')
    df_risk['reg_month'] = df_risk['reg_date'].dt.to_period('M').astype(str).replace('NaT', 'Unknown')
    df_risk['is_delivered'] = df_risk['delivery_place'] != 'Not Delivered'
    df_risk['block'] = df_risk['Health Block Name'].astype(str).str.strip().str.title()

    print("  Delivery place distribution:")
    print(df_risk['delivery_place'].value_counts().to_string())

    # ===================================================================
    # STEP 4: LOAD DELIVERY LINE LIST & ANC DENOMINATOR
    # ===================================================================
    print("\n[4/5] Loading Delivery Line List & ANC files...")
    delivery_lookup = load_delivery_linelist(DELIVERY_DIR)
    sub_to_phc_map = load_location_hierarchy(LOCATION_DIR)

    anc_files = sorted([f for f in glob.glob(os.path.join(ANC_DIR, "*.xlsx"))
                        if not os.path.basename(f).startswith("~$")])
    print(f"  Found {len(anc_files)} ANC file(s)")

    anc_counts = {}
    anc_visit_lookup = {}
    anc_records = []
    uhrp_mpids = set(df_risk['MP_ID_clean'].dropna())

    for fpath in anc_files:
        fname = os.path.basename(fpath)
        meta = read_file_metadata(fpath, from_row=4, to_row=5)
        fy = get_fiscal_year(meta.get('from_date', ''))
        print(f"  → {fname}: FY {fy}")

        wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
        sheet = wb[wb.sheetnames[0]]
        rows_iter = sheet.iter_rows(values_only=True)
        for _ in range(8):
            next(rows_iter)
        headers = [c for c in next(rows_iter)]

        mpid_idx = headers.index('MP ID') if 'MP ID' in headers else 9
        date_indices = [idx for idx, h in enumerate(headers) if h and str(h).strip() == 'ANC Visit Date']
        hb_indices = [idx for idx, h in enumerate(headers) if h and str(h).strip() == 'Hb']
        bp_indices = [idx for idx, h in enumerate(headers) if h and 'BP (Systolic/Diastolic)' in str(h)]
        alb_indices = [idx for idx, h in enumerate(headers) if h and 'urine albumin' in str(h).lower()]
        mo_indices = [idx for idx, h in enumerate(headers) if h and 'conducted by' in str(h).lower()]

        pw_name_idx = headers.index('Name of Pregnant Woman') if 'Name of Pregnant Woman' in headers else 8
        husb_idx = headers.index('Husband  Name') if 'Husband  Name' in headers else (headers.index('Husband Name') if 'Husband Name' in headers else 10)
        block_idx = headers.index('Health Block Name') if 'Health Block Name' in headers else 2
        sub_idx = headers.index('Health Sub Centre Name') if 'Health Sub Centre Name' in headers else 3
        vil_idx = headers.index('Village Name') if 'Village Name' in headers else 4
        lmp_idx = headers.index('LMP Date') if 'LMP Date' in headers else 11
        edd_idx = headers.index('EDD Date') if 'EDD Date' in headers else 12
        reg_date_indices = [i for i, h in enumerate(headers) if h and 'registration' in str(h).lower()]
        reg_date_idx = reg_date_indices[0] if reg_date_indices else 13
        age_idx = headers.index('Age') if 'Age' in headers else 14
        mob_idx = headers.index('Mobile Number') if 'Mobile Number' in headers else 15
        
        del_comp_indices = [i for i, h in enumerate(headers) if h and 'delivery complted' in str(h).lower()]
        del_comp_idx = del_comp_indices[0] if del_comp_indices else 175
        hrp_id_indices = [i for i, h in enumerate(headers) if h and 'hrp identified' in str(h).lower()]
        hrp_id_idx = hrp_id_indices[0] if hrp_id_indices else 177

        # Col 172 (FQ) Abortion & Col 173 (FR) Place of Abortion
        abort_indices = [i for i, h in enumerate(headers) if h and 'abortion (' in str(h).lower()]
        abort_idx = abort_indices[0] if abort_indices else 172
        abort_p_indices = [i for i, h in enumerate(headers) if h and 'place of abortion' in str(h).lower()]
        abort_p_idx = abort_p_indices[0] if abort_p_indices else 173

        count_indexed = 0
        total_anc_mpids_by_year = {}

        for row in rows_iter:
            if mpid_idx < len(row) and row[mpid_idx] is not None:
                mpid = str(row[mpid_idx]).strip().split('.')[0]
                if mpid and mpid not in ('None', 'nan', ''):
                    raw_reg_date = row[reg_date_idx] if reg_date_idx < len(row) else None
                    raw_lmp_date = row[lmp_idx] if lmp_idx < len(row) else None
                    fy_row = get_fiscal_year(raw_reg_date or raw_lmp_date)
                    if fy_row not in total_anc_mpids_by_year:
                        total_anc_mpids_by_year[fy_row] = set()
                    total_anc_mpids_by_year[fy_row].add(mpid)
                    
                    # Extract ANC Line List Record
                    raw_del_flag = (del_comp_idx < len(row) and str(row[del_comp_idx] or '').strip().lower() == 'yes')
                    is_hrp_anc = 1 if (hrp_id_idx < len(row) and str(row[hrp_id_idx] or '').strip().lower() == 'yes') else 0
                    lmp_val = format_to_dd_mmyyyy(raw_lmp_date)
                    edd_val = format_to_dd_mmyyyy(row[edd_idx] if edd_idx < len(row) else None)
                    age_str = str(row[age_idx] if age_idx < len(row) and row[age_idx] is not None else '-').split('.')[0].strip()
                    mob_str = clean_mobile(row[mob_idx]) if mob_idx < len(row) else ''
                    
                    # Abortion check (Cols FQ & FR)
                    raw_abort = str(row[abort_idx] or '').strip() if abort_idx < len(row) else ''
                    raw_abort_p = str(row[abort_p_idx] or '').strip() if abort_p_idx < len(row) else ''
                    is_abortion = (raw_abort.lower() in ('induced', 'spontaneous'))
                    
                    if is_abortion:
                        del_anc_status = 2 # 2 = Abortion
                        deliv_place_anc = f"Abortion ({raw_abort}{f' - {raw_abort_p}' if raw_abort_p else ''})"
                        del_cat_anc = 'Abortion'
                    elif raw_del_flag:
                        del_anc_status = 1
                        deliv_place_anc = 'Public Facility'
                        del_cat_anc = 'Public Facility'
                    else:
                        del_anc_status = 0
                        deliv_place_anc = 'Pregnant'
                        del_cat_anc = 'Not Delivered'

                    # Map PHC from Location Hierarchy
                    b_str = str(row[block_idx] or 'Unknown').strip().title() if block_idx < len(row) else 'Unknown'
                    sub_str = str(row[sub_idx] or 'Unknown').strip().title() if sub_idx < len(row) else 'Unknown'
                    b_lower = b_str.lower()
                    sub_lower = sub_str.lower()
                    mapped_phc = sub_to_phc_map.get((b_lower, sub_lower)) or sub_to_phc_map.get(sub_lower)
                    if not mapped_phc:
                        c_sub = sub_lower.replace('shc ', '').replace('sc ', '').replace('shc', '').strip()
                        mapped_phc = sub_to_phc_map.get((b_lower, c_sub)) or sub_to_phc_map.get(c_sub)
                    phc_str = mapped_phc if mapped_phc else 'Unknown'

                    date_list = []
                    for idx in date_indices:
                        val = row[idx] if idx < len(row) else None
                        date_list.append(format_to_dd_mmyyyy(val) if val is not None else None)

                    hb_list = []
                    for idx in hb_indices:
                        val = row[idx] if idx < len(row) else None
                        if val is not None and str(val).strip() not in ('', 'nan', 'None'):
                            try:
                                hb_list.append(round(float(val), 1))
                            except:
                                hb_list.append(None)
                        else:
                            hb_list.append(None)

                    bp_list = []
                    for idx in bp_indices:
                        val = row[idx] if idx < len(row) else None
                        if val is not None and str(val).strip() not in ('', 'nan', 'None'):
                            bp_list.append(str(val).strip())
                        else:
                            bp_list.append(None)

                    alb_list = []
                    for idx in alb_indices:
                        val = row[idx] if idx < len(row) else None
                        if val is not None and str(val).strip() not in ('', 'nan', 'None', 'Select'):
                            alb_list.append(str(val).strip())
                        else:
                            alb_list.append(None)

                    mo_list = []
                    for idx in mo_indices:
                        val = row[idx] if idx < len(row) else None
                        if val is not None and str(val).strip() not in ('', 'nan', 'None', 'Select'):
                            mo_list.append(str(val).strip())
                        else:
                            mo_list.append(None)

                    mo_done = 1 if any(is_mo_str(x) for x in mo_list) else 0

                    anc_records.append({
                        'id': mpid,
                        'n': str(row[pw_name_idx] or 'N/A').strip().title() if pw_name_idx < len(row) else 'N/A',
                        'h': str(row[husb_idx] or 'N/A').strip().title() if husb_idx < len(row) else 'N/A',
                        'b': b_str,
                        'sub': sub_str,
                        'v': str(row[vil_idx] or 'Unknown').strip().title() if vil_idx < len(row) else 'Unknown',
                        'lmp': lmp_val,
                        'edd': edd_val,
                        'a': age_str if age_str not in ('nan', 'None', '', 'NaT') else '-',
                        'p': mob_str if mob_str else 'N/A',
                        'del': del_anc_status,
                        'is_abortion': 1 if is_abortion else 0,
                        'd': deliv_place_anc,
                        'del_cat': del_cat_anc,
                        'del_date': '-',
                        'hrp': is_hrp_anc,
                        'phc': phc_str,
                        'y': fy_row,
                        'v_dates': date_list,
                        'hb_v': hb_list,
                        'bp_v': bp_list,
                        'alb_v': alb_list,
                        'mo_v': mo_list,
                        'mo_done': mo_done
                    })

                    if mpid in uhrp_mpids:
                        if mpid not in anc_visit_lookup:
                            anc_visit_lookup[mpid] = {'dates': date_list, 'hb': hb_list, 'bp': bp_list, 'alb': alb_list, 'mo': mo_list}
                            count_indexed += 1
                        else:
                            existing = anc_visit_lookup[mpid]
                            if 'alb' not in existing:
                                existing['alb'] = [None] * 12
                            if 'mo' not in existing:
                                existing['mo'] = [None] * 12
                            for vi in range(12):
                                if vi < len(date_list) and date_list[vi] is not None:
                                    existing['dates'][vi] = date_list[vi]
                                if vi < len(hb_list) and hb_list[vi] is not None:
                                    existing['hb'][vi] = hb_list[vi]
                                if vi < len(bp_list) and bp_list[vi] is not None:
                                    existing['bp'][vi] = bp_list[vi]
                                if vi < len(alb_list) and alb_list[vi] is not None:
                                    existing['alb'][vi] = alb_list[vi]
                                if vi < len(mo_list) and mo_list[vi] is not None:
                                    existing['mo'][vi] = mo_list[vi]

        wb.close()
        for y_key, mp_set in total_anc_mpids_by_year.items():
            anc_counts[y_key] = anc_counts.get(y_key, 0) + len(mp_set)
        total_unique_anc = sum(len(s) for s in total_anc_mpids_by_year.values())
        print(f"    Unique ANC registrations: {total_unique_anc} across FYs {list(total_anc_mpids_by_year.keys())} | ANC linelist rows: {len(anc_records)} | UHRP visit trends indexed: {count_indexed}")

    # ===================================================================
    # STEP 5: PREPARE FINAL PATIENTS LIST
    # ===================================================================
    print("\n[5/5] Processing HRP patient records with delivery and LR admission Hb...")
    patients_list = []
    for _, row in df_risk.iterrows():
        factors = []
        if row['is_severe_anemia']: factors.append('Severe Anemia')
        if row['is_moderate_anemia']: factors.append('Moderate Anemia')
        if row['is_pih']: factors.append('PIH')
        if row['is_gdm']: factors.append('GDM')
        if row['is_lscs']: factors.append('Previous LSCS')
        if row['is_sickle']: factors.append('Sickle Cell')
        if row['is_teenage']: factors.append('Teenage Pregnancy')
        if row['is_boh']: factors.append('Complication in Last Pregnancy')

        husband_name = clean_str(row.get('Husband  Name', '')) or clean_str(row.get('Husband Name', ''))
        mobile_num = clean_mobile(row.get('Mobile Number', ''))
        age_val = str(row.get('Age', '')).strip()
        if age_val in ('nan', 'None', '', 'NaT'):
            age_val = '-'

        phc_name = str(row.get('Health Facility Name', 'N/A')).strip().title()
        subcenter_name = str(row.get('Health Sub Centre Name', 'N/A')).strip().title()
        village_name = str(row.get('Village Name', 'N/A')).strip().title()
        
        lmp_date = format_to_dd_mmyyyy(row.get('LMP Date'))
        edd_date = format_to_dd_mmyyyy(row.get('EDD Date'))
        del_date = format_to_dd_mmyyyy(row.get('Date of Delivery'))

        mat_death_date = str(row.get('Maternal Death Date', '')).strip()
        if mat_death_date and mat_death_date not in ('nan', 'None', '', 'NaT'):
            mat_info = f"Yes ({format_to_dd_mmyyyy(mat_death_date)})"
        else:
            mat_info = "No"

        mpid_key = row['MP_ID_clean']
        anc_trends = anc_visit_lookup.get(mpid_key, {})
        hb_v = anc_trends.get('hb', [])
        bp_v = anc_trends.get('bp', [])
        v_dates = anc_trends.get('dates', [])
        alb_v = anc_trends.get('alb', [])
        mo_v = anc_trends.get('mo', [])

        mo_done = 1 if any(is_mo_str(x) for x in mo_v) else 0

        # Strict Pre-eclampsia definition: BP >= 140/90 (or PIH) AND Urine Albumin >= +2
        has_alb2 = any(a and any(p in str(a).lower() for p in ['+2', '+3', '+4', '++', '+++', '++++']) for a in alb_v)
        has_high_bp = row['is_pih']
        for b in bp_v:
            if b and '/' in str(b):
                try:
                    parts = str(b).split('/')
                    s_bp = float(parts[0])
                    d_bp = float(parts[1])
                    if s_bp >= 140 or d_bp >= 90:
                        has_high_bp = True
                        break
                except:
                    pass
        is_preeclampsia = 1 if (has_alb2 and has_high_bp) else 0

        mpid_key = row['MP_ID_clean']
        del_info = delivery_lookup.get(mpid_key, {})

        # Column AB / BK: HB on LR admission (Delivery Line List Col AB preferred)
        lr_hb_val = del_info.get('hb_lr')
        if lr_hb_val is None:
            raw_lr_hb = row.get('HB on LR admission')
            if raw_lr_hb is not None and not pd.isna(raw_lr_hb):
                try:
                    val = float(raw_lr_hb)
                    if not np.isnan(val) and val > 0:
                        lr_hb_val = round(val, 1)
                except (ValueError, TypeError):
                    pass

        # Column U: BP At Admission (From Delivery Line List Col U)
        bp_adm_val = del_info.get('bp_adm', '')

        reg_date_str = format_to_dd_mmyyyy(row.get('PW Registration Date'))

        # Anemia Management: Iron Sucrose doses 1-5, BT units, Inj FCM
        is_doses = []
        for d_idx in range(1, 6):
            col_name = f'Iron sucrose dose {d_idx} (Date)'
            d_raw = row.get(col_name)
            d_formatted = format_to_dd_mmyyyy(d_raw)
            if d_formatted != '-':
                is_doses.append(d_formatted)

        bt_units_val = row.get('Number of Blood transfusion units (If BT Given Only)')
        bt_val = 'No'
        try:
            if pd.notna(bt_units_val) and bt_units_val is not None:
                flt_bt = float(bt_units_val)
                if flt_bt > 0:
                    bt_val = f"{int(flt_bt)} Unit{'s' if flt_bt > 1 else ''}"
        except:
            pass

        fcm_given = str(row.get('Inj FCM given (Yes/No)', '')).strip().title()
        fcm_val = 'Yes' if fcm_given == 'Yes' else 'No'
        fcm_fac = str(row.get('Facility Name where FCM given', '')).strip().title()
        if fcm_fac in ('Nan', 'None', '', 'No Facility Found'):
            fcm_fac = ''

        # Column AR: PIH Management Done
        pih_mgmt_raw = str(row.get('PIH Management Done (If Yes in PIH) (Methyledopa/Labetalol/Inj. MgSO4/ Nifedipine)', '')).strip()
        if pih_mgmt_raw in ('nan', 'None', '', 'NaT', '-'):
            pih_mgmt_raw = ''

        # Check Abortion (Cols 53 & 54 in HRP Line List)
        raw_ab = str(row.get('Abortion (Induced/Spontaneous/No)', '')).strip()
        raw_ab_p = str(row.get('Place of Abortion (Govt/Pvt)', '')).strip()
        is_hrp_abortion = raw_ab.lower() in ('spontaneous', 'induced')

        # Delivery Information: Delivery Line List (Cols N, Q, R, AI) takes primary precedence
        if is_hrp_abortion:
            is_del_final = 2 # 2 = Abortion
            deliv_place_display = f"Abortion ({raw_ab}{f' - {raw_ab_p}' if raw_ab_p else ''})"
            del_cat = 'Abortion'
            final_del_date = '-'
        elif del_info:
            is_del_final = 1
            d_at = del_info.get('del_at', '')
            f_type = del_info.get('fac_type', '')
            f_name = del_info.get('fac_name', '')
            final_del_date = del_info.get('del_date', '-')

            if f_name and f_name.lower() not in ('nan', 'none', '-'):
                deliv_place_display = f_name.title()
            elif f_type and f_type.lower() not in ('nan', 'none', '-'):
                deliv_place_display = f_type.title()
            elif d_at and d_at.lower() not in ('nan', 'none', '-'):
                deliv_place_display = d_at.title()
            else:
                deliv_place_display = 'Facility'
            del_cat = categorize_delivery_facility(f_name, f_type, d_at)
        else:
            # Fallback to HRP line list columns BE, BG, BH, BM
            be_place = str(row.get('Place of Delivery', '')).strip()
            bg_type = str(row.get('Facility Type(Govt/Pvt)', '')).strip()
            bh_fac = str(row.get('Facility Name', '')).strip()
            has_delivery = (del_date != '-') or (be_place.lower() not in ('', 'nan', 'none', 'not delivered', '-'))

            if has_delivery:
                is_del_final = 1
                final_del_date = del_date
                if bh_fac and bh_fac.lower() not in ('nan', 'none', '-'):
                    deliv_place_display = bh_fac.title()
                elif bg_type and bg_type.lower() not in ('nan', 'none', '-'):
                    deliv_place_display = bg_type.title()
                elif be_place and be_place.lower() not in ('nan', 'none', '-'):
                    deliv_place_display = be_place.title()
                else:
                    deliv_place_display = 'Facility'
                del_cat = categorize_delivery_facility(bh_fac, bg_type, be_place)
            else:
                is_del_final = 0
                final_del_date = '-'
                deliv_place_display = 'Pregnant'
                del_cat = 'Not Delivered'

        patients_list.append({
            'y': row['Year'],
            'b': row['block'],
            'phc': phc_name if phc_name not in ('Nan', 'None', '') else 'Unknown',
            'sub': subcenter_name if subcenter_name not in ('Nan', 'None', '') else 'Unknown',
            'v': village_name if village_name not in ('Nan', 'None', '') else 'Unknown',
            'm': row['reg_month'] if str(row['reg_month']) != 'NaT' else 'Unknown',
            'reg': reg_date_str,
            'd': deliv_place_display,
            'del_cat': del_cat,
            'del_date': final_del_date,
            'sa': 1 if row['is_severe_anemia'] else 0,
            'ma': 1 if row['is_moderate_anemia'] else 0,
            'pi': 1 if row['is_pih'] else 0,
            'gd': 1 if row['is_gdm'] else 0,
            'ls': 1 if row['is_lscs'] else 0,
            'sc': 1 if row['is_sickle'] else 0,
            'tp': 1 if row['is_teenage'] else 0,
            'bh': 1 if row['is_boh'] else 0,
            'uhrp': 1 if row['is_uhrp_severe'] else 0,
            'del': is_del_final,
            'is_abortion': 1 if is_hrp_abortion else 0,
            'id': mpid_key,
            'n': str(row.get('Name of Pregnant Woman', 'N/A')).strip().title(),
            'h': husband_name.title() if husband_name else 'N/A',
            'p': mobile_num if mobile_num else 'N/A',
            'a': age_val,
            'lmp': lmp_date,
            'edd': edd_date,
            'f': ', '.join(factors) if factors else 'N/A',
            'mat': mat_info,
            'nnd': 'No',
            'hb_v': hb_v,
            'bp_v': bp_v,
            'v_dates': v_dates,
            'alb_v': alb_v,
            'mo_v': mo_v,
            'mo_done': mo_done,
            'pe': is_preeclampsia,
            'lr_hb': lr_hb_val,
            'bp_adm': bp_adm_val,
            'is_doses': is_doses,
            'bt': bt_val,
            'fcm': fcm_val,
            'fcm_fac': fcm_fac,
            'pih_mgmt': pih_mgmt_raw,
            'gdm_mnt': 'Yes' if str(row.get('On MNT', '')).strip().lower() == 'yes' else 'No',
            'gdm_met': 'Yes' if str(row.get('On Metformin', '')).strip().lower() == 'yes' else 'No',
            'gdm_ins': 'Yes' if str(row.get('On Insulin', '')).strip().lower() == 'yes' else 'No',
            'gdm_mgmt_at': 'Yes' if str(row.get('GDM Mangement', '')).strip().lower() == 'yes' else 'No',
        })

    # Enrich ANC records with Delivery line list and HRP risk tags
    hrp_patient_map = {p['id']: p for p in patients_list}
    for r in anc_records:
        mpid = r['id']
        del_info = delivery_lookup.get(mpid, {})
        
        # Check delivery line list first
        if del_info:
            r['del'] = 1
            f_name = del_info.get('fac_name', '')
            f_type = del_info.get('fac_type', '')
            d_at = del_info.get('del_at', '')
            if f_name and f_name.lower() not in ('nan', 'none', '-'):
                r['d'] = f_name.title()
            elif f_type and f_type.lower() not in ('nan', 'none', '-'):
                r['d'] = f_type.title()
            elif d_at and d_at.lower() not in ('nan', 'none', '-'):
                r['d'] = d_at.title()
            else:
                r['d'] = 'Facility'
            r['del_cat'] = categorize_delivery_facility(f_name, f_type, d_at)
            if del_info.get('del_date') and del_info.get('del_date') != '-':
                r['del_date'] = del_info['del_date']
            if del_info.get('hb_lr') is not None:
                r['lr_hb'] = del_info['hb_lr']
            if del_info.get('bp_adm'):
                r['bp_adm'] = del_info['bp_adm']

        if mpid in hrp_patient_map:
            hp = hrp_patient_map[mpid]
            r['hrp'] = 1
            r['sa'] = hp.get('sa', 0)
            r['ma'] = hp.get('ma', 0)
            r['pi'] = hp.get('pi', 0)
            r['gd'] = hp.get('gd', 0)
            r['ls'] = hp.get('ls', 0)
            r['sc'] = hp.get('sc', 0)
            r['tp'] = hp.get('tp', 0)
            r['bh'] = hp.get('bh', 0)
            r['f'] = hp.get('f', 'High Risk')
            r['is_doses'] = hp.get('is_doses', [])
            r['bt'] = hp.get('bt', 'No')
            r['fcm'] = hp.get('fcm', 'No')
            r['fcm_fac'] = hp.get('fcm_fac', '')
            if hp.get('lr_hb') is not None:
                r['lr_hb'] = hp.get('lr_hb')
            if hp.get('bp_adm'):
                r['bp_adm'] = hp.get('bp_adm')
            r['pih_mgmt'] = hp.get('pih_mgmt', '')
            r['gdm_mnt'] = hp.get('gdm_mnt', 'No')
            r['gdm_met'] = hp.get('gdm_met', 'No')
            r['gdm_ins'] = hp.get('gdm_ins', 'No')
            if hp.get('del') == 2 or hp.get('is_abortion') == 1:
                r['del'] = 2
                r['is_abortion'] = 1
                r['d'] = hp.get('d', 'Abortion')
                r['del_cat'] = 'Abortion'
            elif hp.get('del') == 1:
                r['del'] = 1
                r['d'] = hp.get('d', 'Facility')
                r['del_cat'] = hp.get('del_cat', 'Facility')
                if hp.get('del_date') and hp.get('del_date') != '-':
                    r['del_date'] = hp['del_date']
            if hp.get('phc') and hp.get('phc') != 'Unknown':
                r['phc'] = hp['phc']

    nmr_list = []
    nmr_by_factor = {'Severe Anemia': 0, 'PIH': 0, 'GDM': 0, 'Previous LSCS': 0, 'Sickle Cell': 0, 'Teenage': 0}

    data_object = {
        'gen_date': datetime.datetime.now().strftime('%d-%m-%Y'),
        'hrp_raw_counts': hrp_raw_counts,
        'anc_counts': anc_counts,
        'nmr_by_factor': nmr_by_factor,
        'nmr_total_matched': 0,
        'nmr_total_nnd': 0,
        'patients': patients_list,
        'anc_patients': anc_records,
        'nmr_matches': nmr_list,
    }

    output_path = os.path.join(WORKSPACE, "data.js")
    with open(output_path, "w", encoding='utf-8') as f:
        f.write("/* Auto-generated by update_dashboard.py */\n")
        f.write("const DASHBOARD_DATA = ")
        json.dump(data_object, f, ensure_ascii=False)
        f.write(";\n")

    # Automatically generate updated SOP PDF and Standalone HTML
    try:
        import generate_sop_pdf
        sop_path = os.path.join(WORKSPACE, "UHRP_Dashboard_SOP.pdf")
        generate_sop_pdf.build_sop_pdf(sop_path)
    except Exception as e:
        print(f"  WARNING: Could not generate SOP PDF: {e}")

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"  SUCCESS — Dashboard data (data.js) & SOP PDF updated!")
    print(f"  Data Output:    {output_path}")
    print(f"  Dashboard Page: {os.path.join(WORKSPACE, 'index.html')}")
    print(f"  SOP Output:     {os.path.join(WORKSPACE, 'UHRP_Dashboard_SOP.pdf')}")
    print(f"  UHRP cohort:    {len(patients_list)}")
    print(f"  ANC denominators: {anc_counts}")
    print(f"  Time: {elapsed:.1f}s")
    print(f"{'='*60}")

    # Automatically push updated files to GitHub
    git_push_updates()

def git_push_updates():
    """Automatically stages, commits, and pushes updated dashboard files to GitHub."""
    import subprocess
    print(f"\n{'='*60}")
    print("  AUTOMATIC GITHUB REPOSITORY SYNC")
    print(f"{'='*60}")
    try:
        # Check if git is installed and directory is inside a git repository
        git_check = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            check=False
        )
        if git_check.returncode != 0:
            print("  INFO: Not a git repository or git command not found. Skipping auto-push.")
            return

        # Stage updated project files
        print("  Staging updated dashboard project files (git add .)...")
        subprocess.run(["git", "add", "."], cwd=WORKSPACE, check=True, capture_output=True, text=True)

        # Check if there are changes to commit
        status_proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            check=True
        )

        has_changes = bool(status_proc.stdout.strip())
        now_str = datetime.datetime.now().strftime("%d-%m-%Y %H:%M")

        if has_changes:
            commit_msg = f"Auto-update UHRP dashboard data: {now_str}"
            print(f"  Committing changes: '{commit_msg}'...")
            subprocess.run(
                ["git", "commit", "-m", commit_msg],
                cwd=WORKSPACE,
                capture_output=True,
                text=True,
                check=True
            )
            print("  Commit successful.")
        else:
            print("  No new local file changes to commit. Checking remote sync status...")

        # Push to remote repository
        print("  Pushing to GitHub (origin)...")
        push_proc = subprocess.run(
            ["git", "push", "origin", "HEAD"],
            cwd=WORKSPACE,
            capture_output=True,
            text=True,
            check=True,
            timeout=120
        )
        print("  SUCCESS: Project files successfully pushed to GitHub!")

    except subprocess.TimeoutExpired:
        print("  WARNING: Git push timed out after 120s. Please check network connectivity.")
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.strip() if e.stderr else str(e)
        print(f"  WARNING: Git auto-push encountered an issue: {err_msg}")
        print("  You can push manually anytime using: git push")
    except Exception as e:
        print(f"  WARNING: Git auto-push error: {e}")

if __name__ == "__main__":
    main()
