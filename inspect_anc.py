import json, re

with open('data.js', 'r', encoding='utf-8') as f:
    txt = f.read()

txt = re.sub(r'^const DASHBOARD_DATA\s*=\s*', '', txt.strip())
txt = re.sub(r';\s*$', '', txt)
data = json.loads(txt)

anc = data.get('anc_patients', [])
print("Total ANC patients:", len(anc))

# Check first 3
for p in anc[:3]:
    pid = p.get('id', '?')
    vd = p.get('v_dates', 'MISSING')
    hb = p.get('hb_v', 'MISSING')
    print("  id=%s  v_dates=%s  hb_v=%s" % (pid, str(vd)[:80], str(hb)[:80]))

has_vd = sum(1 for p in anc if p.get('v_dates'))
print("Patients with v_dates:", has_vd)

total_visits = 0
for p in anc:
    vd = p.get('v_dates') or []
    total_visits += sum(1 for v in vd if v and v != '-' and v != 'None' and v != 'nan')
print("Total non-null visit slots:", total_visits)

# Check visit counts per slot
slot_counts = [0]*12
for p in anc:
    vd = p.get('v_dates') or []
    for i in range(min(12, len(vd))):
        v = vd[i]
        if v and v != '-' and v != 'None' and v != 'nan':
            slot_counts[i] += 1

print("Per-slot visit counts (V1..V12):", slot_counts)
