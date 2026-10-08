with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update kpiFilter handling in renderLineList
target_kpi_filter = """        let kpiFilteredPatients = mgmtFilteredPatients;
        if (kpiFilter) {
            if (kpiFilter === 'missed_anc') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => checkConsecutiveMissedAnc(p).hasMissed);
            } else if (kpiFilter === 'preeclampsia') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => hasPreEclampsia(p));
            } else if (kpiFilter === 'mo_pending') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => !hasMoVisit(p));
            } else if (kpiFilter === 'mo_done') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => hasMoVisit(p));
            } else if (kpiFilter === 'uhrp') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => p.uhrp === 1 || p.hrp === 1);
            } else if (['sa','pi','gd','ls','sc','tp','bh'].includes(kpiFilter) && currentTab === 'all') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => p[kpiFilter] === 1);
            } else if (['sa', 'ma', 'sc', 'anc', 'all'].includes(currentTab)) {
                if (kpiFilter === 'moderate') {
                    kpiFilteredPatients = mgmtFilteredPatients.filter(p => {
                        const status = getPatientClinicalStatus(p, currentTab);
                        return status === 'moderate' || (p.ma === 1 && status !== 'severe' && status !== 'resolved' && status !== 'mild');
                    });
                } else if (kpiFilter === 'severe') {
                    kpiFilteredPatients = mgmtFilteredPatients.filter(p => {
                        const status = getPatientClinicalStatus(p, currentTab);
                        return status === 'severe' || (p.sa === 1 && status !== 'moderate' && status !== 'resolved' && status !== 'mild');
                    });
                } else {
                    kpiFilteredPatients = mgmtFilteredPatients.filter(p => getPatientClinicalStatus(p, currentTab) === kpiFilter);
                }
            } else if (currentTab === 'pi') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => getPatientClinicalStatus(p, 'pi') === kpiFilter);
            }
        }"""

replacement_kpi_filter = """        let kpiFilteredPatients = mgmtFilteredPatients;
        if (kpiFilter) {
            if (kpiFilter === 'missed_anc') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => checkConsecutiveMissedAnc(p).hasMissed);
            } else if (kpiFilter === 'mo_pending') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => !hasMoVisit(p));
            } else if (kpiFilter === 'pending_mgmt') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => !isManagementDone(p, currentTab));
            } else if (kpiFilter === 'unresolved') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => {
                    if (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc' || currentTab === 'all' || currentTab === 'anc') {
                        const status = getPatientClinicalStatus(p, currentTab === 'anc' ? 'sa' : currentTab);
                        if (status === 'severe' || (currentTab === 'ma' && status === 'moderate')) return true;
                        if (currentTab === 'sa' && status !== 'resolved' && status !== 'mild') return true;
                        return false;
                    } else if (currentTab === 'pi') {
                        const status = getPatientClinicalStatus(p, 'pi');
                        return status === 'uncontrolled' || hasPreEclampsia(p);
                    } else {
                        return p.del === 0;
                    }
                });
            } else if (kpiFilter === 'preeclampsia') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => hasPreEclampsia(p));
            } else if (kpiFilter === 'uhrp') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => p.uhrp === 1 || p.hrp === 1);
            }
        }"""

if target_kpi_filter in text:
    text = text.replace(target_kpi_filter, replacement_kpi_filter)
    print("Replaced kpiFilter in renderLineList successfully!")
else:
    print("Warning: target_kpi_filter not found!")

# 2. Add Mobile Cards rendering right after Desktop Table rendering
desktop_tbody_needle = """        if (isExpandableTab) {
            document.querySelectorAll('#linelist-table tr.expandable-row').forEach(row => {
                row.addEventListener('click', () => {
                    const mpid = row.getAttribute('data-mpid');
                    toggleRowDrawer(mpid);
                });
            });
        }
    }"""

mobile_cards_code = """        if (isExpandableTab) {
            document.querySelectorAll('#linelist-table tr.expandable-row').forEach(row => {
                row.addEventListener('click', () => {
                    const mpid = row.getAttribute('data-mpid');
                    toggleRowDrawer(mpid);
                });
            });
        }

        // Render Native Mobile Cards View (<= 768px)
        const cardsContainer = document.getElementById(elementIds.cardsContainer);
        if (cardsContainer) {
            if (pagePatients.length === 0) {
                cardsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b; background:#fff; border-radius:12px; border:1px solid #e2e8f0;">No high-risk patient records found for the selected filters.</div>`;
            } else {
                cardsContainer.innerHTML = pagePatients.map(p => {
                    const cleanV = cleanVillageName(p.v);
                    const cleanPhone = (p.p && p.p !== 'N/A' && p.p !== '-' && p.p !== 'None' && p.p !== 'nan') ? p.p : '';
                    const gaDisplay = getPatientGaDisplay(p);
                    const isMoSeen = hasMoVisit(p);
                    const ancCheck = checkConsecutiveMissedAnc(p);

                    // Risk tags
                    let riskTagsHtml = '';
                    if (p.f) {
                        riskTagsHtml += `<span style="background:#fee2e2; color:#991b1b; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;">${p.f}</span>`;
                    }
                    if (!isMoSeen) {
                        riskTagsHtml += `<span style="background:#e0f2fe; color:#0369a1; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;">🩺 MO Pending</span>`;
                    }
                    if (ancCheck.hasMissed) {
                        riskTagsHtml += `<span style="background:#fef3c7; color:#b45309; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;">⚠️ 2+ Missed</span>`;
                    }

                    return `
                        <div class="uhrp-patient-card" data-mpid="${p.id}">
                            <div class="pcard-header">
                                <div class="pcard-name-wrap">
                                    <div class="pcard-name">${p.n}</div>
                                    <div class="pcard-husband">${p.h ? 'Husband: ' + p.h : ''}</div>
                                </div>
                                <span class="pcard-mpid-badge">ID: ${p.id}</span>
                            </div>

                            ${riskTagsHtml ? `<div class="pcard-risk-tags">${riskTagsHtml}</div>` : ''}

                            <div class="pcard-info-grid">
                                <div class="pcard-info-item">
                                    <span class="pcard-info-label">📍 Village</span>
                                    <span class="pcard-info-val">${cleanV}</span>
                                </div>
                                <div class="pcard-info-item">
                                    <span class="pcard-info-label">⏳ Gestational Age</span>
                                    <span class="pcard-info-val">${gaDisplay}</span>
                                </div>
                                <div class="pcard-info-item">
                                    <span class="pcard-info-label">📅 LMP</span>
                                    <span class="pcard-info-val">${formatDateDDMMYYYY(p.lmp)}</span>
                                </div>
                                <div class="pcard-info-item">
                                    <span class="pcard-info-label">🎯 EDD</span>
                                    <span class="pcard-info-val">${formatDateDDMMYYYY(p.edd)}</span>
                                </div>
                            </div>

                            <div class="pcard-actions-grid">
                                ${cleanPhone ? `
                                    <a href="tel:${cleanPhone}" class="btn-card-action btn-card-phone" title="Call ${p.n}">
                                        📞 ${cleanPhone}
                                    </a>
                                ` : `
                                    <button class="btn-card-action btn-card-phone" style="opacity:0.5; cursor:not-allowed;" disabled title="Phone number not available">
                                        📞 No Phone
                                    </button>
                                `}
                                <button type="button" class="btn-card-action btn-card-anc" onclick="window.openAncModal('${p.id}')" title="View 12 ANC Visits Timeline">
                                    📋 12 ANC Visits
                                </button>
                                <button type="button" class="btn-card-action btn-card-mgmt" onclick="window.openMgmtModal('${p.id}')" title="View Clinical Management & Admission Vitals">
                                    💊 Management
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    }"""

if desktop_tbody_needle in text:
    text = text.replace(desktop_tbody_needle, mobile_cards_code)
    print("Added Mobile Cards rendering to renderLineList successfully!")
else:
    print("Warning: desktop_tbody_needle not found!")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Finished writing changes to app.js!")
