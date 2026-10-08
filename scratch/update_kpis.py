import os

with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

start_needle = "    // Render Dynamic Clinical Resolution KPI Metric Cards (Clickable Filters)\n    function renderKpiCards(tabPatients) {"
end_needle = "        const clearKpiBtn = document.getElementById('btn-clear-active-kpi');"

start_idx = text.find(start_needle)
end_idx = text.find(end_needle)

if start_idx == -1 or end_idx == -1:
    print(f"Error finding needles: start_idx={start_idx}, end_idx={end_idx}")
    exit(1)

new_kpi_body = """    // Render 4 Actionable Clinical KPI Cards (Clickable Filters)
    function renderKpiCards(tabPatients) {
        const kpiContainer = document.getElementById(elementIds.kpiContainer);
        if (!kpiContainer) return;

        let missedAncCount = 0;
        let moPendingCount = 0;
        let unresolvedCount = 0;
        let pendingMgmtCount = 0;
        const canMgmt = ['sa', 'ma', 'pi', 'gd'].includes(currentTab);

        tabPatients.forEach(p => {
            const ancCheck = checkConsecutiveMissedAnc(p);
            if (ancCheck.hasMissed) missedAncCount++;
            if (!hasMoVisit(p)) moPendingCount++;

            // 1. Unresolved / Uncontrolled check per clinical tab
            if (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc' || currentTab === 'all' || currentTab === 'anc') {
                const status = getPatientClinicalStatus(p, currentTab === 'anc' ? 'sa' : currentTab);
                if (status === 'severe' || (currentTab === 'ma' && status === 'moderate')) {
                    unresolvedCount++;
                } else if (currentTab === 'sa' && status !== 'resolved' && status !== 'mild') {
                    unresolvedCount++;
                }
            } else if (currentTab === 'pi') {
                const status = getPatientClinicalStatus(p, 'pi');
                if (status === 'uncontrolled' || hasPreEclampsia(p)) {
                    unresolvedCount++;
                }
            } else {
                if (p.del === 0) unresolvedCount++;
            }

            // 2. Management Pending check (for Moderate Anemia, Severe Anemia, PIH, GDM only)
            if (canMgmt && !isManagementDone(p, currentTab)) {
                pendingMgmtCount++;
            }
        });

        const activeKpiInfo = kpiFilter ? `
            <div class="active-filter-indicator">
                <span>Active KPI Filter: <strong>${kpiFilter.replace('_', ' ').toUpperCase()}</strong></span>
                <span class="clear-kpi-filter-tag" id="btn-clear-active-kpi">Show All ✖</span>
            </div>
        ` : '';

        kpiContainer.style.display = 'block';
        kpiContainer.innerHTML = `
            ${activeKpiInfo}
            <div class="kpi-cards-grid">
                <div class="kpi-card clickable unresolved-kpi ${kpiFilter === 'unresolved' ? 'active-kpi-filter' : ''}" data-kpi="unresolved" title="Click to filter unresolved/uncontrolled cases (Hb < 7.0 / BP >= 140/90)">
                    <span class="kpi-title">🔴 Unresolved / Uncontrolled</span>
                    <span class="kpi-value">${unresolvedCount.toLocaleString()}</span>
                    <span class="kpi-subtext">Clinical Action Required</span>
                </div>
                ${canMgmt ? `
                <div class="kpi-card clickable pending-mgmt-kpi ${kpiFilter === 'pending_mgmt' ? 'active-kpi-filter' : ''}" data-kpi="pending_mgmt" title="Click to filter cases where clinical management is pending (FCM / Iron Sucrose / BP meds / GDM therapy)">
                    <span class="kpi-title">⚠️ Management Pending</span>
                    <span class="kpi-value">${pendingMgmtCount.toLocaleString()}</span>
                    <span class="kpi-subtext">Rx / Meds Needed</span>
                </div>
                ` : `
                <div class="kpi-card clickable ${kpiFilter === 'all' ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all registered cases in this risk cohort">
                    <span class="kpi-title">📋 Total Registered</span>
                    <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                    <span class="kpi-subtext">All Active Cases</span>
                </div>
                `}
                <div class="kpi-card clickable missed-anc-kpi ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Click to filter mothers who missed 2+ consecutive ANC visits">
                    <span class="kpi-title">⚠️ Missed 2+ ANC</span>
                    <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                    <span class="kpi-subtext">Field Follow-up Needed</span>
                </div>
                <div class="kpi-card clickable mo-pending-kpi ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="Click to filter mothers not examined by a Medical Officer yet">
                    <span class="kpi-title">🩺 Not Seen by MO</span>
                    <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                    <span class="kpi-subtext">Pending Doctor Exam</span>
                </div>
            </div>
        `;
"""

new_text = text[:start_idx] + new_kpi_body + "\n" + text[end_idx:]
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Updated app.js renderKpiCards successfully!")
