with open('app.js', 'r', encoding='utf-8') as f:
    text = f.read()

setup_str = '    setupDropdowns();\n    setupTabs();'
idx = text.rfind(setup_str)

modal_handlers = """    // Global Modal Handlers for Mobile 3-Button Card Actions
    window.openAncModal = function(mpid) {
        let p = (DASHBOARD_DATA.patients || []).find(item => String(item.id) === String(mpid));
        if (!p) p = (DASHBOARD_DATA.anc_patients || []).find(item => String(item.id) === String(mpid));
        if (!p) return;

        const overlay = document.getElementById('modal-anc-overlay');
        const titleEl = document.getElementById('modal-anc-title');
        const subtitleEl = document.getElementById('modal-anc-subtitle');
        const bodyEl = document.getElementById('modal-anc-body');
        if (!overlay || !bodyEl) return;

        titleEl.textContent = `📋 12 ANC Visits Timeline — ${p.n}`;
        subtitleEl.textContent = `MP ID: ${p.id} | Village: ${cleanVillageName(p.v)} | Block: ${p.b}`;

        const isMoSeen = hasMoVisit(p);
        const ancCheck = checkConsecutiveMissedAnc(p);

        bodyEl.innerHTML = `
            <div class="modal-vitals-bar" style="margin-bottom:0.75rem;">
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">Medical Officer (MO) Status</span>
                    <span class="modal-vitals-val" style="color:${isMoSeen ? '#059669' : '#0284c7'}; font-size:0.9rem;">
                        ${isMoSeen ? '✓ Examined by Doctor / MO' : '⚠️ Pending Mandatory MO Exam'}
                    </span>
                </div>
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">ANC Attendance Alert</span>
                    <span class="modal-vitals-val" style="color:${ancCheck.hasMissed ? '#ea580c' : '#059669'}; font-size:0.9rem;">
                        ${ancCheck.hasMissed ? '⚠️ 2+ Consecutive Missed Visits' : '✓ Regular Follow-up'}
                    </span>
                </div>
            </div>

            <div class="anc-timeline-container" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem;">
                <div class="anc-timeline-title" style="font-size:0.78rem; font-weight:800; margin-bottom:0.5rem;">📋 12 ANC Visit Attendance Timeline Tracker</div>
                <div class="anc-timeline-grid" id="modal-timeline-${p.id}"></div>
            </div>

            <div class="chart-wrapper" id="modal-chart-${p.id}" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem; min-height:180px;">
                <div style="text-align:center; padding:1.5rem; color:#64748b;">Rendering clinical progression chart...</div>
            </div>
        `;

        overlay.style.display = 'flex';
        renderAncTimelineGrid(`modal-${p.id}`, p);
        setTimeout(() => {
            if (currentTab === 'pi') {
                renderBpSparkline(`modal-${p.id}`, p);
            } else {
                renderHbSparkline(`modal-${p.id}`, p);
            }
        }, 60);
    };

    window.closeAncModal = function() {
        const overlay = document.getElementById('modal-anc-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    window.openMgmtModal = function(mpid) {
        let p = (DASHBOARD_DATA.patients || []).find(item => String(item.id) === String(mpid));
        if (!p) p = (DASHBOARD_DATA.anc_patients || []).find(item => String(item.id) === String(mpid));
        if (!p) return;

        const overlay = document.getElementById('modal-mgmt-overlay');
        const titleEl = document.getElementById('modal-mgmt-title');
        const subtitleEl = document.getElementById('modal-mgmt-subtitle');
        const bodyEl = document.getElementById('modal-mgmt-body');
        if (!overlay || !bodyEl) return;

        titleEl.textContent = `💊 Clinical Management & Vitals — ${p.n}`;
        subtitleEl.textContent = `MP ID: ${p.id} | Village: ${cleanVillageName(p.v)} | Subcenter: ${p.sub || '-'}`;

        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const cleanV = cleanVillageName(p.v);

        bodyEl.innerHTML = `
            <!-- Admission Vitals -->
            <div class="modal-vitals-bar">
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">🩸 Hb on LR Admission</span>
                    <span class="modal-vitals-val" style="color:#dc2626;">
                        ${(p.lr_hb !== null && p.lr_hb !== undefined) ? p.lr_hb + ' g/dL' : ((p.hb_lr !== null && p.hb_lr !== undefined) ? p.hb_lr + ' g/dL' : 'Not Recorded')}
                    </span>
                </div>
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">🩺 BP at Admission</span>
                    <span class="modal-vitals-val" style="color:#0284c7;">
                        ${p.bp_adm ? p.bp_adm + ' mmHg' : 'Not Recorded'}
                    </span>
                </div>
            </div>

            <!-- Facility Hierarchy & Delivery Details -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.75rem; font-size:0.8rem; line-height:1.5;">
                📍 <strong>Hierarchy:</strong> Block: <strong>${p.b}</strong> | PHC: <strong>${p.phc || 'Unknown'}</strong> | SC: <strong>${p.sub || 'Unknown'}</strong> | Village: <strong>${cleanV}</strong><br>
                ${isDelivered ? `🏥 <strong>Delivery Facility:</strong> <strong style="color:#059669;">${p.d || '-'}</strong> (${p.del_cat || 'Facility'}) ${p.del_date && p.del_date !== '-' ? `on <strong>${formatDateDDMMYYYY(p.del_date)}</strong>` : ''}` : `🤰 <strong>Delivery Status:</strong> <span style="color:#0284c7; font-weight:700;">Pregnant (Antenatal Care)</span>`}
            </div>

            <!-- Risk Factor Banner -->
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:0.6rem 0.8rem; font-size:0.8rem;">
                <strong style="color:#991b1b;">⚠️ Identified Risk Factor(s):</strong> <span style="font-weight:700; color:#b91c1c;">${p.f || 'High Risk Pregnancy'}</span>
            </div>

            <!-- Anemia Management Details -->
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.85rem;">
                <div style="font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:0.5rem; text-transform:uppercase;">💉 Anemia Clinical Management</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem;">
                    <div>Inj. FCM: <strong>${p.fcm === 'Yes' ? `✓ Given ${p.fcm_fac ? `(${p.fcm_fac})` : ''}` : '✕ Not Given'}</strong></div>
                    <div>Blood Transfusion: <strong>${p.bt || 'No'}</strong></div>
                    <div style="grid-column:1/-1;">Iron Sucrose Doses: <strong>${(p.is_doses && p.is_doses.length > 0) ? p.is_doses.join(', ') : 'None'}</strong></div>
                </div>
            </div>

            <!-- PIH / GDM Medications -->
            ${p.pih_mgmt ? `
            <div style="background:#fff7ed; border:1px solid #ffedd5; border-radius:12px; padding:0.85rem;">
                <div style="font-size:0.8rem; font-weight:800; color:#c2410c; margin-bottom:0.4rem;">🟠 PIH Hypertension Treatment:</div>
                <div style="font-size:0.825rem; font-weight:700; color:#9a3412;">✓ ${p.pih_mgmt}</div>
            </div>` : ''}

            ${(p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes') ? `
            <div style="background:#f0f9ff; border:1px solid #e0f2fe; border-radius:12px; padding:0.85rem;">
                <div style="font-size:0.8rem; font-weight:800; color:#0369a1; margin-bottom:0.4rem;">🔵 GDM Diabetes Management:</div>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem; font-size:0.78rem;">
                    <div>MNT: <strong>${p.gdm_mnt === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    <div>Metformin: <strong>${p.gdm_met === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    <div>Insulin: <strong>${p.gdm_ins === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                </div>
            </div>` : ''}
        `;

        overlay.style.display = 'flex';
    };

    window.closeMgmtModal = function() {
        const overlay = document.getElementById('modal-mgmt-overlay');
        if (overlay) overlay.style.display = 'none';
    };

    // Close Modals on overlay click or close button
    document.getElementById('btn-close-anc-modal')?.addEventListener('click', window.closeAncModal);
    document.getElementById('btn-close-mgmt-modal')?.addEventListener('click', window.closeMgmtModal);
    document.getElementById('modal-anc-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-anc-overlay') window.closeAncModal();
    });
    document.getElementById('modal-mgmt-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-mgmt-overlay') window.closeMgmtModal();
    });
"""

text = text[:idx] + modal_handlers + "\n" + text[idx:]

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Inserted modal handlers right before setupDropdowns in app.js successfully!")
