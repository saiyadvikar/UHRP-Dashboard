/* Ultra High Risk Pregnancy Care Dashboard JavaScript */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof DASHBOARD_DATA === 'undefined') {
        console.error('DASHBOARD_DATA is missing!');
        return;
    }

    let currentTab = 'anc';
    let currentMainView = 'linelist';
    let initializedCharts = {};
    let currentPage = 1;
    let pageSize = 50;

    // Sorting State
    let sortState = { col: null, dir: 'asc' };

    // KPI Card Filter State
    let kpiFilter = null;
    let trimesterFilter = null;
    let visitFilter = null;
    let currentAnalyticsPatients = [];

    // Chart Instances for Section 2
    let mgmtRiskChartInstance = null;
    let mgmtBlockChartInstance = null;
    let moBlockChartInstance = null;
    let moRiskChartInstance = null;
    let blockChartInstance = null;
    let deliveryChartInstance = null;
    let yoyChartInstance = null;
    let periodChartInstance = null;
    let tpTreemapChartInstance = null;

    // Hierarchy Mappings for Cascading Filters
    let blockToPhcMap = {};
    let phcToSubMap = {};
    let blockToSubMap = {};

    const elementIds = {
        year: 'year-filter',
        block: 'block-filter',
        phc: 'phc-filter',
        subcenter: 'subcenter-filter',
        riskFactor: 'risk-factor-filter',
        delivery: 'delivery-filter',
        mgmtStatus: 'mgmt-status-filter',
        exportSelect: 'export-select',
        exportTabBtn: 'btn-export-tab',
        clearFiltersBtn: 'btn-clear-filters',
        searchInput: 'table-search',
        tbody: 'linelist-tbody',
        cardsContainer: 'patient-cards-container',
        tabTitle: 'active-tab-title',
        patientCountBadge: 'patient-count-badge',
        counsellingBanner: 'counselling-banner',
        kpiContainer: 'kpi-summary-container',
        trimesterContainer: 'trimester-kpi-container',
        analyticsSubtitle: 'analytics-subtitle'
    };

    const TAB_NAMES = {
        anc: 'Total ANC Registered',
        sa: 'Severe Anemia',
        ma: 'Moderate Anemia',
        pi: 'PIH (Hypertension)',
        gd: 'GDM (Diabetes)',
        ls: 'Previous LSCS',
        sc: 'Sickle Cell Disease',
        tp: 'Teenage Pregnancy',
        bh: 'Complication in Last Pregnancy',
        all: 'Total UHRP Cohort'
    };

    // Protocol Guidelines in Hindi as per National Health Mission (NHM) Protocols
    const COUNSELLING_POINTS = {
        anc: {
            title: "📋 संपूर्ण प्रसव पूर्व देखभाल (Comprehensive ANC) प्रोटोकॉल",
            points: [
                "गर्भावस्था का 12 सप्ताह के भीतर शीघ्र पंजीकरण (Early Registration) अनिवार्य रूप से सुनिश्चित करें।",
                "कम से कम 4 गुणवत्तापूर्ण एएनसी जांच तथा प्रत्येक माह की 9 तारीख को PMSMA क्लीनिक में डॉक्टर से जांच कराएं।",
                "प्रत्येक जांच पर हीमोग्लोबिन (Hb), रक्तचाप (BP), मूत्र एल्बुमिन एवं वजन की अनिवार्य जांच कराएं।",
                "उच्च जोखिम लक्षणों की पहचान होते ही तत्काल उच्च स्वास्थ्य केंद्र पर रेफरल एवं संस्थागत प्रसव की योजना बनाएं।"
            ]
        },
        sa: {
            title: "🔴 गंभीर एनीमिया प्रबंधन प्रोटोकॉल (Hb < 7.0 g/dL)",
            points: [
                "एफआरयू / जिला अस्पताल में तत्काल संदर्भित करें एवं आईवी आयरन (Iron Sucrose / FCM) या आवश्यकतानुसार रक्त आधान (Blood Transfusion) सुनिश्चित करें।",
                "स्वास्थ्य सुधार के पश्चात दैनिक डबल डोज आईएफए गोलियों (100mg एलीमेंटल आयरन + 500mcg फोलिक एसिड) का नियमित सेवन सुनिश्चित करें।",
                "आहार संबंधी परामर्श: हरी पत्तेदार सब्जियां, गुड़, सहजन, एवं विटामिन-सी युक्त फल (आंवला/नींबू) खाने की सलाह दें।",
                "प्रत्येक 14 दिनों में हीमोग्लोबिन की पुनः जांच करें और 12-विजिट एएनसी ट्रेंड चार्ट की निगरानी करें।"
            ]
        },
        ma: {
            title: "🟡 मध्यम एनीमिया प्रबंधन प्रोटोकॉल (Hb 7.0 - 9.9 g/dL / Col AG)",
            points: [
                "प्राथमिक/सामुदायिक स्वास्थ्य केंद्र (PHC/CHC/DH) पर आईवी आयरन सुक्रोज (Inj. Iron Sucrose) या आईवी एफसीएम (Inj. FCM) की खुराक सुनिश्चित करें।",
                "दैनिक 2 आईएफए (IFA) गोलियों का सेवन एवं कृमि मुक्ति हेतु Albendazole 400mg (द्वितीय तिमाही के बाद) दें।",
                "आहार परामर्श: सहजन (Moringa), पालक, गुड़, चना, आंवला, नीम्बू और स्थानीय पोषक अनाजों का सेवन कराएं।",
                "प्रत्येक एएनसी विजिट पर हीमोग्लोबिन की जांच करें ताकि स्तर सामान्य (> 11.0 g/dL) तक पहुंच सके।"
            ]
        },
        pi: {
            title: "🟠 गर्भावस्था जनित उच्च रक्तचाप (PIH) प्रोटोकॉल (BP ≥ 140/90 mmHg)",
            points: [
                "चिकित्सा अधिकारी के मार्गदर्शन में तत्काल एंटीहाइपरटेंसिव थेरेपी (Tab. Labetalol 100mg BD) प्रारंभ करें।",
                "गंभीर चेतावनी संकेत: तेज सिरदर्द, धुंधला दिखाई देना, पेट के ऊपरी हिस्से में दर्द, चेहरे पर अचानक सूजन आने पर तुरंत अस्पताल पहुंचे।",
                "उपस्वास्थ्य केंद्र / प्राथमिक स्वास्थ्य केंद्र पर साप्ताहिक रक्तचाप (BP) की जांच कराएं।",
                "शिशु गहन चिकित्सा इकाई (NICU) सुविधा वाले एफआरयू / जिला अस्पताल में ही संस्थागत प्रसव की योजना बनाएं।"
            ]
        },
        gd: {
            title: "🔵 जेस्टेशनल डायबिटीज मेलिटस (GDM) प्रोटोकॉल",
            points: [
                "2-घंटे 75 ग्राम ओरल ग्लूकोज टॉलरेंस टेस्ट (OGTT) कराएं; यदि 2 घंटे बाद प्लाज्मा ग्लूकोज ≥ 140 mg/dL है तो GDM चिन्हित करें।",
                "मेडिकल न्यूट्रिशन थेरेपी (MNT) शुरू करें; यदि उपवास ग्लूकोज ≥ 95 mg/dL या 2-घंटे पोस्ट-मील ≥ 120 mg/dL हो तो मेटफॉर्मिन/इंसुलिन शुरू करें।",
                "28-32 सप्ताह पर नियमित भ्रूण विकास की निगरानी (Ultrasound Scan) सुनिश्चित करें।",
                "तृतीयक स्वास्थ्य केंद्र में 38-39 सप्ताह पर नियोजित संस्थागत प्रसव की योजना बनाएं।"
            ]
        },
        ls: {
            title: "🟢 पूर्व सिजेरियन प्रसव (Previous LSCS) प्रोटोकॉल",
            points: [
                "पूर्व गर्भाशय चीरे के प्रकार एवं दो गर्भावस्थाओं के बीच के समय अंतराल का विस्तृत विवरण दर्ज करें।",
                "गृह प्रसव सख्त वर्जित है; संभावित प्रसव तिथि (EDD) से कम से कम 2 सप्ताह पूर्व संदर्भित अस्पताल में पंजीकरण कराएं।",
                "प्रसव पीड़ा, झिल्ली फटने या पेट में चीरे के स्थान पर दर्द होने पर तत्काल अस्पताल पहुंचने की सलाह दें।",
                "प्रसव सुविधा केंद्र पर क्रॉस-मैचेड रक्त की उपलब्धता पूर्व से सुनिश्चित रखें।"
            ]
        },
        sc: {
            title: "🟣 सिकल सेल रोग प्रबंधन एवं पोषण प्रोटोकॉल (HbSS / HbS-Beta Thalassemia)",
            points: [
                "दैनिक फोलिक एसिड (5mg) का सेवन एवं पर्याप्त जलयोजन (प्रतिदिन 3-4 लीटर उबला पानी/तरल पदार्थ) सुनिश्चित करें ताकि सिकलिंग क्राइसिस से बचाव हो सके।",
                "पोषण संबंधी आवश्यकता (स्थानीय जनजातीय आहार): स्थानीय पोषक अनाज (ज्वार, मक्का, कोदो-कुटकी), दालें (चना, तुअर, कुल्थी, मूंग), गुड़-चना और मूंगफली का नियमित सेवन कराएं।",
                "पारंपरिक लौह एवं विटामिन युक्त हरी भाजियां व फल: स्थानीय रूप से उपलब्ध सहजन/मोरिंगा, चेंच भाजी, चौलाई, पालक, कचनार, आंवला, महुआ, अमरुद एवं सीताफल आहार में अनिवार्यतः शामिल करें।",
                "बुखार, छाती में दर्द या जोड़ों में गंभीर दर्द (Vaso-occlusive Crisis) होने पर तत्काल एफआरयू/अस्पताल में भर्ती कराएं एवं आईवी फ्लुइड्स शुरू करें।",
                "मासिक हीमोग्लोबिन जांच, सोनोग्राफी (USG Growth Scan) एवं विशेषज्ञ हेमेटोलॉजी/ब्लड बैंक सुविधा वाले केंद्र पर ही संस्थागत प्रसव कराएं।"
            ]
        },
        tp: {
            title: "🌸 किशोरी गर्भावस्था प्रोटोकॉल (आयु ≤ 17 वर्ष)",
            points: [
                "सीपीडी (CPD) और कम वजन के शिशु के जोखिम को रोकने के लिए विशेष पोषण संबंधी परामर्श एवं कैल्शियम अनुपूरक (1000mg/दिन) दें।",
                "प्री-एकलेम्पसिया, एनीमिया और अंतर्गर्भाशयी विकास प्रतिबंध (IUGR) के लिए नियमित जांच करें।",
                "सहानुभूतिपूर्ण मानसिक-सामाजिक सहायता प्रदान करें और प्रसवोत्तर परिवार नियोजन (PPFP) पर परामर्श दें।",
                "दक्ष प्रसव परिचारक (Skilled Birth Attendant) की देखरेख में अनिवार्य संस्थागत प्रसव कराएं।"
            ]
        },
        bh: {
            title: "⚠️ पूर्व गर्भावस्था में जटिलताएं (Bad Obstetric History)",
            points: [
                "पूर्व में हुए मृत जन्म (Stillbirth), बार-बार गर्भपात, या जन्मजात विकृतियों के इतिहास की समीक्षा करें।",
                "स्त्री रोग विशेषज्ञ (Obstetrician) द्वारा प्रारंभिक पंजीकरण और विशेष एएनसी निगरानी सुनिश्चित करें।",
                "18-22 सप्ताह पर एनोमली स्कैन (USG Anomaly Scan) और नियमित विकास स्कैन कराएं।",
                "प्रसव की पूर्व तैयारी (वाहन, आपातकालीन कोष, और रक्तदाता) सुनिश्चित करें।"
            ]
        },
        all: {
            title: "📊 समग्र अति उच्च जोखिम गर्भावस्था (UHRP) प्रोटोकॉल",
            points: [
                "सभी 12 एएनसी विजिट्स में उच्च जोखिम स्थिति को ट्रैक करें; चिकित्सा अधिकारी के साथ कम से कम 4 अनिवार्य एएनसी जांच सुनिश्चित करें।",
                "प्रत्येक माह की 9 तारीख को प्रधानमंत्री सुरक्षित मातृत्व अभियान (PMSMA) के तहत विशेषज्ञ जांच कराएं।",
                "प्रसव स्थल का चयन एवं 108 आपातकालीन एम्बुलेंस की अग्रिम बुकिंग सुनिश्चित करें।",
                "माता और नवजात शिशु की सुरक्षा हेतु प्रसव के बाद 48 घंटे तक अस्पताल में रुकना अनिवार्य है।"
            ]
        }
    };

    // Helper: Convert YYYY-MM-DD to DD-MM-YYYY
    function formatDateDDMMYYYY(dateStr) {
        if (!dateStr || dateStr === '-' || dateStr === 'N/A' || dateStr === 'NaT') return '-';
        const clean = dateStr.split(' ')[0].trim();
        const parts = clean.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return clean;
    }

    // Helper: Robustly parse date string (supports DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD)
    function parseDate(dateStr) {
        if (!dateStr || dateStr === '-' || dateStr === 'N/A' || dateStr === 'NaT' || dateStr === 'None' || dateStr === 'nan') return null;
        const clean = String(dateStr).split(' ')[0].trim();
        const parts = clean.split(/[-/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY-MM-DD
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                const dt = new Date(y, m, d);
                return isNaN(dt.getTime()) ? null : dt;
            } else if (parts[2].length === 4) {
                // DD-MM-YYYY
                const d = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const y = parseInt(parts[2], 10);
                const dt = new Date(y, m, d);
                return isNaN(dt.getTime()) ? null : dt;
            }
        }
        const fallback = new Date(clean);
        return isNaN(fallback.getTime()) ? null : fallback;
    }

    // Helper: Strip numerical census codes and asterisks from village name
    function cleanVillageName(v) {
        if (!v || v === 'Unknown' || v === 'N/A') return v || '-';
        return v.replace(/\s*\([\d\*]+\)\*?/g, '').replace(/\*$/g, '').trim();
    }

    // Main View Navigation Handler
    function setupMainViewSwitcher() {
        const btns = document.querySelectorAll('.main-view-btn');
        const viewLinelist = document.getElementById('view-linelist');
        const viewAnalytics = document.getElementById('view-analytics');
        const viewProtocols = document.getElementById('view-protocols');

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentMainView = btn.getAttribute('data-view');
                if (currentMainView === 'linelist') {
                    if (viewLinelist) viewLinelist.style.display = 'block';
                    if (viewAnalytics) viewAnalytics.style.display = 'none';
                    if (viewProtocols) viewProtocols.style.display = 'none';
                } else if (currentMainView === 'analytics') {
                    if (viewLinelist) viewLinelist.style.display = 'none';
                    if (viewAnalytics) viewAnalytics.style.display = 'block';
                    if (viewProtocols) viewProtocols.style.display = 'none';
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                } else if (currentMainView === 'protocols') {
                    if (viewLinelist) viewLinelist.style.display = 'none';
                    if (viewAnalytics) viewAnalytics.style.display = 'none';
                    if (viewProtocols) viewProtocols.style.display = 'block';
                }
            });
        });
    }

    // Smoothly focus/scroll to the line list on mobile after applying any filter
    function scrollToLinelistOnMobile() {
        if (window.innerWidth <= 768) {
            // Ensure Patient Line Lists view mode is active
            const linelistNavBtn = document.querySelector('.main-view-btn[data-view="linelist"]');
            if (linelistNavBtn && !linelistNavBtn.classList.contains('active')) {
                linelistNavBtn.click();
            }
            setTimeout(() => {
                const target = document.querySelector('.table-card') || document.getElementById('view-linelist');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 80);
        }
    }

    // Build Hierarchy Mappings
    function buildHierarchyMappings() {
        blockToPhcMap = {};
        phcToSubMap = {};
        blockToSubMap = {};

        const allRecords = [...(DASHBOARD_DATA.patients || []), ...(DASHBOARD_DATA.anc_patients || [])];

        allRecords.forEach(p => {
            const b = p.b ? p.b.trim() : 'Unknown';
            const phc = p.phc ? p.phc.trim() : 'Unknown';
            const sub = p.sub ? p.sub.trim() : 'Unknown';

            if (!blockToPhcMap[b]) blockToPhcMap[b] = new Set();
            if (phc !== 'Unknown' && phc !== 'N/A') blockToPhcMap[b].add(phc);

            if (!phcToSubMap[phc]) phcToSubMap[phc] = new Set();
            if (sub !== 'Unknown' && sub !== 'N/A') phcToSubMap[phc].add(sub);

            if (!blockToSubMap[b]) blockToSubMap[b] = new Set();
            if (sub !== 'Unknown' && sub !== 'N/A') blockToSubMap[b].add(sub);
        });
    }

    // Populate PHC Filter
    function updatePhcDropdown(selectedBlock) {
        const phcSelect = document.getElementById(elementIds.phc);
        const currentPhcVal = phcSelect.value;

        let phcs = new Set();
        if (selectedBlock === 'All') {
            Object.values(blockToPhcMap).forEach(set => set.forEach(p => phcs.add(p)));
        } else {
            phcs = blockToPhcMap[selectedBlock] || new Set();
        }

        const sortedPhcs = Array.from(phcs).sort();
        phcSelect.innerHTML = '<option value="All">All PHCs</option>' + 
            sortedPhcs.map(p => `<option value="${p}">${p}</option>`).join('');

        if (sortedPhcs.includes(currentPhcVal)) {
            phcSelect.value = currentPhcVal;
        } else {
            phcSelect.value = 'All';
        }
    }

    // Populate Subcenter Filter
    function updateSubcenterDropdown(selectedBlock, selectedPhc) {
        const subSelect = document.getElementById(elementIds.subcenter);
        const currentSubVal = subSelect.value;

        let subcenters = new Set();

        if (selectedPhc !== 'All') {
            subcenters = phcToSubMap[selectedPhc] || new Set();
        } else if (selectedBlock !== 'All') {
            subcenters = blockToSubMap[selectedBlock] || new Set();
        } else {
            Object.values(phcToSubMap).forEach(set => set.forEach(s => subcenters.add(s)));
        }

        const sortedSubs = Array.from(subcenters).sort();
        subSelect.innerHTML = '<option value="All">All Subcenters</option>' + 
            sortedSubs.map(s => `<option value="${s}">${s}</option>`).join('');

        if (sortedSubs.includes(currentSubVal)) {
            subSelect.value = currentSubVal;
        } else {
            subSelect.value = 'All';
        }
    }

    // Dynamically Populate Year Dropdown based on Available Data
    function updateYearDropdown() {
        const yearSelect = document.getElementById(elementIds.year);
        if (!yearSelect) return;

        const availableYears = new Set();
        if (DASHBOARD_DATA.patients) {
            DASHBOARD_DATA.patients.forEach(p => {
                if (p.y && p.y !== 'Unknown') availableYears.add(p.y);
            });
        }
        if (DASHBOARD_DATA.hrp_raw_counts) {
            Object.entries(DASHBOARD_DATA.hrp_raw_counts).forEach(([y, cnt]) => {
                if (y && y !== 'Unknown' && cnt > 0) availableYears.add(y);
            });
        }
        if (DASHBOARD_DATA.anc_counts) {
            Object.entries(DASHBOARD_DATA.anc_counts).forEach(([y, cnt]) => {
                if (y && y !== 'Unknown' && cnt > 0) availableYears.add(y);
            });
        }

        const sortedYears = Array.from(availableYears).sort();
        const currentVal = yearSelect.value;

        let optionsHtml = '';
        if (sortedYears.length > 1) {
            optionsHtml += '<option value="All">All Years</option>';
        }
        sortedYears.forEach(y => {
            optionsHtml += `<option value="${y}">${y}</option>`;
        });

        if (sortedYears.length === 0) {
            optionsHtml = '<option value="All">All Years</option>';
        }

        yearSelect.innerHTML = optionsHtml;

        if (sortedYears.includes(currentVal)) {
            yearSelect.value = currentVal;
        } else if (sortedYears.length === 1) {
            yearSelect.value = sortedYears[0];
        } else {
            yearSelect.value = 'All';
        }
    }

    // Setup Dropdowns
    function setupDropdowns() {
        updateYearDropdown();
        buildHierarchyMappings();
        updatePhcDropdown('All');
        updateSubcenterDropdown('All', 'All');
    }

    // One-Click Clear Filters
    function clearFilters() {
        const yearSelect = document.getElementById(elementIds.year);
        if (yearSelect) {
            const hasAll = Array.from(yearSelect.options).some(o => o.value === 'All');
            yearSelect.value = hasAll ? 'All' : (yearSelect.options[0]?.value || 'All');
        }
        document.getElementById(elementIds.block).value = 'All';
        document.getElementById(elementIds.delivery).value = '0';
        document.getElementById(elementIds.searchInput).value = '';
        const mgmtSelect = document.getElementById(elementIds.mgmtStatus);
        if (mgmtSelect) mgmtSelect.value = 'All';

        updatePhcDropdown('All');
        updateSubcenterDropdown('All', 'All');

        sortState = { col: null, dir: 'asc' };
        kpiFilter = null;
        trimesterFilter = null;
        visitFilter = null;
        currentPage = 1;
        updateSortIcons();

        initializedCharts = {};
        renderLineList();
        scrollToLinelistOnMobile();
    }

    // Get Filtered Patients Dataset
    function getFilteredPatients() {
        const yearVal = document.getElementById(elementIds.year).value;
        const blockVal = document.getElementById(elementIds.block).value;
        const phcVal = document.getElementById(elementIds.phc).value;
        const subVal = document.getElementById(elementIds.subcenter).value;
        const delVal = document.getElementById(elementIds.delivery).value;
        const searchVal = document.getElementById(elementIds.searchInput).value.toLowerCase().trim();

        return DASHBOARD_DATA.patients.filter(p => {
            if (yearVal !== 'All' && p.y !== yearVal) return false;
            if (blockVal !== 'All' && p.b.toLowerCase() !== blockVal.toLowerCase()) return false;
            if (phcVal !== 'All' && p.phc.toLowerCase() !== phcVal.toLowerCase()) return false;
            if (subVal !== 'All' && p.sub.toLowerCase() !== subVal.toLowerCase()) return false;
            if (delVal !== 'All') {
                if (delVal === 'abortion') {
                    if (p.del !== 2 && p.is_abortion !== 1) return false;
                } else {
                    if (String(p.del) !== delVal) return false;
                }
            }

            if (searchVal) {
                const cleanV = cleanVillageName(p.v);
                const matchStr = `${p.id} ${p.n} ${p.h} ${p.p} ${cleanV} ${p.b}`.toLowerCase();
                if (!matchStr.includes(searchVal)) return false;
            }

            return true;
        });
    }

    // Get Filtered ANC Patients Dataset (Requirement 1)
    function getFilteredAncPatients() {
        const ancList = DASHBOARD_DATA.anc_patients || [];
        const yearVal = document.getElementById(elementIds.year).value;
        const blockVal = document.getElementById(elementIds.block).value;
        const phcVal = document.getElementById(elementIds.phc).value;
        const subVal = document.getElementById(elementIds.subcenter).value;
        const delVal = document.getElementById(elementIds.delivery).value;
        const searchVal = document.getElementById(elementIds.searchInput).value.toLowerCase().trim();

        return ancList.filter(p => {
            if (yearVal !== 'All' && p.y !== yearVal) return false;
            if (blockVal !== 'All' && (p.b || '').toLowerCase() !== blockVal.toLowerCase()) return false;
            if (phcVal !== 'All' && (p.phc || '').toLowerCase() !== phcVal.toLowerCase()) return false;
            if (subVal !== 'All' && (p.sub || '').toLowerCase() !== subVal.toLowerCase()) return false;
            if (delVal !== 'All') {
                if (delVal === 'abortion') {
                    if (p.del !== 2 && p.is_abortion !== 1) return false;
                } else {
                    if (String(p.del) !== delVal) return false;
                }
            }

            if (searchVal) {
                const cleanV = cleanVillageName(p.v);
                const matchStr = `${p.id} ${p.n} ${p.h} ${p.p} ${cleanV} ${p.b}`.toLowerCase();
                if (!matchStr.includes(searchVal)) return false;
            }

            return true;
        });
    }

    // Update Top Risk Cards & NMR Pill Badges
    function updateRiskCards(filteredPatients) {
        const yearVal = document.getElementById(elementIds.year).value;
        const ancFiltered = getFilteredAncPatients();
        const totalAncCount = ancFiltered.length;

        const uhrpOnlyCount = filteredPatients.filter(p => p.uhrp === 1 || (p.sa || p.pi || p.gd || p.ls || p.sc || p.tp || p.bh)).length;
        const uhrpPct = totalAncCount > 0 ? ((uhrpOnlyCount / totalAncCount) * 100).toFixed(1) : '0.0';

        const totalAncCountEl = document.getElementById('total-anc-count');
        const totalAncUhrpPctEl = document.getElementById('total-anc-uhrp-pct');
        if (totalAncCountEl) totalAncCountEl.textContent = totalAncCount.toLocaleString();
        if (totalAncUhrpPctEl) totalAncUhrpPctEl.textContent = `${uhrpPct}% UHRP`;

        const counts = { sa: 0, ma: 0, pi: 0, gd: 0, ls: 0, sc: 0, tp: 0, bh: 0, all: uhrpOnlyCount };
        const deaths = { sa: 0, ma: 0, pi: 0, gd: 0, ls: 0, sc: 0, tp: 0, bh: 0, all: 0 };

        filteredPatients.forEach(p => {
            if (p.sa) counts.sa++;
            if (p.ma) counts.ma++;
            if (p.pi) counts.pi++;
            if (p.gd) counts.gd++;
            if (p.ls) counts.ls++;
            if (p.sc) counts.sc++;
            if (p.tp) counts.tp++;
            if (p.bh) counts.bh++;

            const isDead = p.nnd && p.nnd.startsWith('Yes');
            if (isDead) {
                deaths.all++;
                if (p.sa) deaths.sa++;
                if (p.ma) deaths.ma++;
                if (p.pi) deaths.pi++;
                if (p.gd) deaths.gd++;
                if (p.ls) deaths.ls++;
                if (p.sc) deaths.sc++;
                if (p.tp) deaths.tp++;
                if (p.bh) deaths.bh++;
            }
        });

        const tabKeys = ['sa', 'ma', 'pi', 'gd', 'ls', 'sc', 'tp', 'bh'];
        tabKeys.forEach(k => {
            const casesEl = document.getElementById(`risk-${k}-cases`);
            const nmrEl = document.getElementById(`risk-${k}-nmr`);
            if (casesEl) casesEl.textContent = counts[k].toLocaleString();
            if (nmrEl) {
                const rate = counts[k] > 0 ? ((deaths[k] / counts[k]) * 1000).toFixed(1) : '0.0';
                nmrEl.textContent = `NMR ${rate}`;
            }
        });

        const totalUhrpEl = document.getElementById('total-uhrp');
        const totalNndPill = document.getElementById('total-nnd-pill');
        if (totalUhrpEl) totalUhrpEl.textContent = counts.all.toLocaleString();
        if (totalNndPill) totalNndPill.textContent = `${deaths.all} NND`;
    }

    // Render Protocol Hindi Banner
    function renderCounsellingBanner(tabKey) {
        const banner = document.getElementById(elementIds.counsellingBanner);
        if (!banner) return; // element removed from linelist view — only exists in protocols view
        const data = COUNSELLING_POINTS[tabKey] || COUNSELLING_POINTS.sa || {};
        if (!data || !data.title) return;

        banner.innerHTML = `
            <div class="counselling-header">
                <h4>${data.title}</h4>
            </div>
            <ul class="counselling-points">
                ${(data.points || []).map(pt => `<li>${pt}</li>`).join('')}
            </ul>
        `;
    }

    // Helper: Compute Date Object for Patient's Last Attended ANC Visit
    function getPatientLastAncDateObject(p) {
        const hbArr = p.hb_v || [];
        const bpArr = p.bp_v || [];
        const dateArr = p.v_dates || [];

        // Loop backwards from latest visit (11 down to 0) to find the latest valid attended visit date
        for (let i = 11; i >= 0; i--) {
            const hasData = (hbArr[i] !== undefined && hbArr[i] !== null && !isNaN(hbArr[i])) ||
                            (bpArr[i] && typeof bpArr[i] === 'string' && bpArr[i].includes('/')) ||
                            (dateArr[i] && typeof dateArr[i] === 'string' && dateArr[i] !== '-' && dateArr[i] !== 'None' && dateArr[i] !== 'nan');
            if (hasData) {
                if (dateArr[i] && dateArr[i] !== '-' && dateArr[i] !== 'None' && dateArr[i] !== 'nan') {
                    const parsed = parseDate(dateArr[i]);
                    if (parsed && !isNaN(parsed.getTime())) return parsed;
                }
            }
        }

        // Fallback: If no visit date recorded with Hb/BP, try latest valid date in dateArr
        for (let i = 11; i >= 0; i--) {
            if (dateArr[i] && dateArr[i] !== '-' && dateArr[i] !== 'None' && dateArr[i] !== 'nan') {
                const parsed = parseDate(dateArr[i]);
                if (parsed && !isNaN(parsed.getTime())) return parsed;
            }
        }

        // Fallback to LMP date
        if (p.lmp && p.lmp !== '-' && p.lmp !== 'N/A') {
            const parsedLmp = parseDate(p.lmp);
            if (parsedLmp && !isNaN(parsedLmp.getTime())) return parsedLmp;
        }

        // Fallback to registration month
        if (p.m && p.m.includes('-')) {
            const parsedMonth = parseDate(`${p.m}-15`);
            if (parsedMonth && !isNaN(parsedMonth.getTime())) return parsedMonth;
        }

        return null;
    }

    // Detect 2+ Consecutive Missed ANC Visits / No ANC visit in last 70 days from reference date
    function checkConsecutiveMissedAnc(p) {
        const hbArr = p.hb_v || [];
        const bpArr = p.bp_v || [];
        const dateArr = p.v_dates || [];

        const visitStatus = [];
        for (let i = 0; i < 12; i++) {
            const hb = (hbArr[i] !== undefined && hbArr[i] !== null && !isNaN(hbArr[i])) ? hbArr[i] : null;
            const bp = (bpArr[i] && typeof bpArr[i] === 'string' && bpArr[i].includes('/')) ? bpArr[i] : null;
            const dt = (dateArr[i] && typeof dateArr[i] === 'string' && dateArr[i] !== '-' && dateArr[i] !== 'None' && dateArr[i] !== 'nan') ? dateArr[i] : null;
            visitStatus.push({ hb, bp, date: dt, attended: (hb !== null || bp !== null || dt !== null) });
        }

        let firstAttended = -1;
        let lastAttended = -1;
        for (let i = 0; i < 12; i++) {
            if (visitStatus[i].attended) {
                if (firstAttended === -1) firstAttended = i;
                lastAttended = i;
            }
        }

        let maxConsecutive = 0;
        let currentConsecutive = 0;
        if (firstAttended !== -1 && lastAttended !== -1) {
            for (let i = firstAttended; i <= lastAttended; i++) {
                if (!visitStatus[i].attended) {
                    currentConsecutive++;
                    if (currentConsecutive > maxConsecutive) {
                        maxConsecutive = currentConsecutive;
                    }
                } else {
                    currentConsecutive = 0;
                }
            }
        }

        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const isAbortion = (p.del === 2 || p.is_abortion === 1);

        // 70-Day Lookback Criteria: Strictly for currently pregnant mothers (del === 0)
        let noVisitInLast70Days = false;
        let daysSinceLastVisit = null;
        if (!isDelivered && !isAbortion) {
            const lastAncDate = getPatientLastAncDateObject(p);
            if (lastAncDate) {
                const refDate = parseDate(DASHBOARD_DATA.gen_date) || new Date();
                const diffMs = refDate.getTime() - lastAncDate.getTime();
                daysSinceLastVisit = Math.round(diffMs / (1000 * 60 * 60 * 24));
                if (daysSinceLastVisit > 70) { // Gap of > 70 days without ANC visit
                    noVisitInLast70Days = true;
                }
            }
        }

        const hasMissed = (!isDelivered && !isAbortion) && (maxConsecutive >= 2 || noVisitInLast70Days);

        return {
            hasMissed,
            maxConsecutive,
            noVisitInLast70Days,
            daysSinceLastVisit,
            visitStatus,
            firstAttended,
            lastAttended
        };
    }

    // Helper: Check if urine albumin is strictly >= +2 (e.g. +2, +3, +4, ++, +++, ++++)
    function isAlbumin2Plus(val) {
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        if (s.includes('+1') && !s.includes('+2') && !s.includes('+3') && !s.includes('+4')) return false;
        if (s.includes('trace') || s === 'present' || s === 'absent' || s === 'not done' || s === 'select' || s === '-' || s === 'nan' || s === 'none') return false;
        return s.includes('+2') || s.includes('+3') || s.includes('+4') || s === '++' || s === '+++' || s === '++++';
    }

    // Helper: Check if patient has high BP reading (Systolic >= 140 or Diastolic >= 90 or PIH diagnosis)
    function hasHighBpReading(p) {
        if (p.pi === 1) return true;
        const bpArr = p.bp_v || [];
        for (let i = 0; i < bpArr.length; i++) {
            const val = bpArr[i];
            if (val && typeof val === 'string' && val.includes('/')) {
                const parts = val.split('/');
                const sys = parseFloat(parts[0]);
                const dia = parseFloat(parts[1]);
                if (!isNaN(sys) && !isNaN(dia)) {
                    if (sys >= 140 || dia >= 90) return true;
                }
            }
        }
        return false;
    }

    // Detect Pre-eclampsia strictly as per NHM Guidelines:
    // Systolic BP >= 140 OR Diastolic BP >= 90 OR Both AND Urine Albumin >= +2
    function hasPreEclampsia(p) {
        if (p.pe !== undefined && p.pe !== null) {
            return p.pe === 1;
        }
        const hasAlb2 = (p.alb_v || []).some(a => isAlbumin2Plus(a));
        if (!hasAlb2) return false;
        return hasHighBpReading(p);
    }

    // Helper: Check if designation corresponds to Medical Officer / Specialist
    function isMoDesignation(val) {
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        return (s.includes('medical officer') || s.includes('gynecologist') || s.includes('doctor') || s.includes('mo (') || s.includes('lmo') || s.includes('pgmo'));
    }

    // Check if at least 1 ANC visit was conducted by a Medical Officer
    function hasMoVisit(p) {
        if (p.mo_done !== undefined && p.mo_done !== null) {
            return p.mo_done === 1;
        }
        const moArr = p.mo_v || [];
        return moArr.some(v => isMoDesignation(v));
    }

    // Check if Clinical Management has been done for a condition
    function isManagementDone(p, condition) {
        if (!condition) condition = currentTab;
        if (condition === 'sa' || condition === 'ma' || condition === 'sc') {
            const hasDoses = Array.isArray(p.is_doses) && p.is_doses.length > 0;
            const hasFcm = p.fcm === 'Yes';
            const hasBt = p.bt && p.bt !== 'No' && p.bt !== '-';
            return hasDoses || hasFcm || hasBt;
        } else if (condition === 'pi') {
            return !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-');
        } else if (condition === 'gd') {
            return (p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes' || p.gdm_mgmt_at === 'Yes');
        }
        return false;
    }

    // Classify Clinical Status for Patient
    function getPatientClinicalStatus(p, tabKey) {
        if (tabKey === 'sa' || tabKey === 'ma' || tabKey === 'sc' || tabKey === 'anc' || tabKey === 'all') {
            const validHb = (p.hb_v || []).filter(v => v !== null && !isNaN(v));
            if (validHb.length === 0) {
                if (p.sa === 1) return 'severe';
                if (p.ma === 1) return 'moderate';
                return 'no_data';
            }
            const latestHb = validHb[validHb.length - 1];
            if (latestHb >= 11.0) return 'resolved';
            if (latestHb >= 10.0 && latestHb <= 10.9) return 'mild';
            if (latestHb >= 7.0 && latestHb <= 9.9) return 'moderate';
            if (latestHb < 7.0) return 'severe';
            return 'no_data';
        } else if (tabKey === 'pi') {
            const bpArr = p.bp_v || [];
            let latestSys = null, latestDia = null;
            for (let i = bpArr.length - 1; i >= 0; i--) {
                const val = bpArr[i];
                if (val && typeof val === 'string' && val.includes('/')) {
                    const parts = val.split('/');
                    const sys = parseFloat(parts[0]);
                    const dia = parseFloat(parts[1]);
                    if (!isNaN(sys) && !isNaN(dia)) {
                        latestSys = sys; latestDia = dia; break;
                    }
                }
            }
            if (latestSys === null) return 'no_data';
            if (latestSys < 140 && latestDia < 90) return 'controlled';
            return 'uncontrolled';
        }
        return null;
    }

    // Render Clinical Resolution & Management KPI Metric Cards (Responsive: Mobile 4-cards, Desktop rich tab cards)
    function renderKpiCards(tabPatients) {
        const kpiContainer = document.getElementById(elementIds.kpiContainer);
        if (!kpiContainer) return;

        let missedAncCount = 0;
        let moPendingCount = 0;
        let preeclampsiaCount = 0;
        tabPatients.forEach(p => {
            const ancCheck = checkConsecutiveMissedAnc(p);
            if (ancCheck.hasMissed) missedAncCount++;
            if (!hasMoVisit(p)) moPendingCount++;
            if (hasPreEclampsia(p)) preeclampsiaCount++;
        });

        const activeKpiInfo = kpiFilter ? `
            <div class="active-filter-indicator">
                <span>Active Filter: <strong>${kpiFilter.replace('_', ' ').toUpperCase()}</strong></span>
                <span class="clear-kpi-filter-tag" id="btn-clear-active-kpi">Reset Filter ✖</span>
            </div>
        ` : '';

        // Mobile View (<= 768px): Render the 4 actionable clinical KPI cards
        if (window.innerWidth <= 768) {
            if (currentTab === 'anc') {
                let uhrpCount = 0;
                tabPatients.forEach(p => {
                    if (p.uhrp === 1 || p.hrp === 1) uhrpCount++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === 'all' || kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all registered cases in this risk cohort">
                            <span class="kpi-title">📋 Total Registered</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All Active Cases</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'uhrp' ? 'active-kpi-filter' : ''}" data-kpi="uhrp" title="Click to filter High Risk Pregnancy cases">
                            <span class="kpi-title">⚡ High Risk</span>
                            <span class="kpi-value">${uhrpCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${tabPatients.length > 0 ? ((uhrpCount / tabPatients.length) * 100).toFixed(1) : 0}% of ANC Cohort</span>
                        </div>
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
            } else {
                let pendingMgmtCount = 0;
                const canMgmt = ['sa', 'ma', 'pi', 'gd'].includes(currentTab);

                if (canMgmt) {
                    tabPatients.forEach(p => {
                        if (!isManagementDone(p, currentTab)) {
                            pendingMgmtCount++;
                        }
                    });
                }

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${!canMgmt ? 'kpi-card-span-2' : ''} ${kpiFilter === 'all' || kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all registered cases in this risk cohort">
                            <span class="kpi-title">📋 Total Registered</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All Active Cases</span>
                        </div>
                        ${canMgmt ? `
                        <div class="kpi-card clickable pending-mgmt-kpi ${kpiFilter === 'pending_mgmt' ? 'active-kpi-filter' : ''}" data-kpi="pending_mgmt" title="Click to filter cases where clinical management is pending (FCM / Iron Sucrose / BP meds / GDM therapy)">
                            <span class="kpi-title">⚠️ Management Pending</span>
                            <span class="kpi-value">${pendingMgmtCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Rx / Meds Needed</span>
                        </div>
                        ` : ''}
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
            }
        } else {
            // Desktop View (> 768px): Original Tab-Specific Clinical KPI Cards
            if (currentTab === 'sa') {
                let resolved = 0, mild = 0, moderate = 0, severe = 0;
                tabPatients.forEach(p => {
                    const status = getPatientClinicalStatus(p, 'sa');
                    if (status === 'resolved') resolved++;
                    else if (status === 'mild') mild++;
                    else if (status === 'moderate' || (p.ma === 1 && status !== 'severe' && status !== 'resolved' && status !== 'mild')) moderate++;
                    else if (status === 'severe' || (p.sa === 1 && status !== 'moderate' && status !== 'resolved' && status !== 'mild')) severe++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid kpi-grid-7">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all Severe Anemia patients">
                            <span class="kpi-title">Total Severe Anemia</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All registered cases</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Hb 7.0 - 9.9 g/dL</span>
                        </div>
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb resolved to normal (> 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (> 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Normal Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'severe' ? 'active-kpi-filter' : ''}" data-kpi="severe" title="Severe Anemia (< 7.0 g/dL)">
                            <span class="kpi-title">⚠️ Severe Anemia (< 7.0)</span>
                            <span class="kpi-value">${severe.toLocaleString()}</span>
                            <span class="kpi-subtext">Requires IV Iron / BT</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'ma') {
                let resolved = 0, mild = 0, moderate = 0, severe = 0;
                tabPatients.forEach(p => {
                    const status = getPatientClinicalStatus(p, 'ma');
                    if (status === 'resolved') resolved++;
                    else if (status === 'mild') mild++;
                    else if (status === 'moderate' || (status === 'no_data' && p.ma === 1)) moderate++;
                    else if (status === 'severe') severe++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid kpi-grid-7">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all Moderate Anemia patients">
                            <span class="kpi-title">Total Moderate Anemia</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All registered (Col AG)</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL / Col AG)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Hb 7.0 - 9.9 g/dL</span>
                        </div>
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb resolved to normal (> 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (> 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Normal Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'severe' ? 'active-kpi-filter' : ''}" data-kpi="severe" title="Deteriorated to Severe Anemia (< 7.0 g/dL)">
                            <span class="kpi-title">⚠️ Severe Anemia (< 7.0)</span>
                            <span class="kpi-value">${severe.toLocaleString()}</span>
                            <span class="kpi-subtext">Requires IV Iron / BT</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'anc') {
                let uhrpCount = 0;
                tabPatients.forEach(p => {
                    if (p.uhrp === 1 || p.hrp === 1) uhrpCount++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all ANC Registered mothers">
                            <span class="kpi-title">Total ANC Registered</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All registered mothers</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'uhrp' ? 'active-kpi-filter' : ''}" data-kpi="uhrp" title="High Risk Pregnancy Cases">
                            <span class="kpi-title">⚡ High Risk</span>
                            <span class="kpi-value">${uhrpCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${tabPatients.length > 0 ? ((uhrpCount / tabPatients.length) * 100).toFixed(1) : 0}% of ANC Cohort</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'pi') {
                let controlled = 0, uncontrolled = 0;
                tabPatients.forEach(p => {
                    const status = getPatientClinicalStatus(p, 'pi');
                    if (status === 'controlled') controlled++;
                    else if (status === 'uncontrolled') uncontrolled++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid kpi-grid-6">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all PIH patients">
                            <span class="kpi-title">Total PIH Cases</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All registered cases</span>
                        </div>
                        <div class="kpi-card clickable controlled ${kpiFilter === 'controlled' ? 'active-kpi-filter' : ''}" data-kpi="controlled" title="BP normalized (< 140/90 mmHg)">
                            <span class="kpi-title">✓ BP Controlled (< 140/90)</span>
                            <span class="kpi-value">${controlled.toLocaleString()}</span>
                            <span class="kpi-subtext">Normotensive on Rx</span>
                        </div>
                        <div class="kpi-card clickable uncontrolled ${kpiFilter === 'uncontrolled' ? 'active-kpi-filter' : ''}" data-kpi="uncontrolled" title="BP elevated (≥ 140/90 mmHg)">
                            <span class="kpi-title">⚠️ BP Uncontrolled (≥ 140/90)</span>
                            <span class="kpi-value">${uncontrolled.toLocaleString()}</span>
                            <span class="kpi-subtext">Hypertensive Crisis Risk</span>
                        </div>
                        <div class="kpi-card clickable preeclampsia ${kpiFilter === 'preeclampsia' ? 'active-kpi-filter' : ''}" data-kpi="preeclampsia" title="NHM Guidelines: Systolic BP ≥ 140 or Diastolic BP ≥ 90 and Urine Albumin ≥ +2">
                            <span class="kpi-title">⚠️ Pre-eclampsia (Alb ≥ +2)</span>
                            <span class="kpi-value">${preeclampsiaCount.toLocaleString()}</span>
                            <span class="kpi-subtext">BP ≥ 140/90 & Alb ≥ +2</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'sc') {
                let resolved = 0, mild = 0, moderate = 0, severe = 0;
                tabPatients.forEach(p => {
                    const status = getPatientClinicalStatus(p, 'sc');
                    if (status === 'resolved') resolved++;
                    else if (status === 'mild') mild++;
                    else if (status === 'moderate') moderate++;
                    else if (status === 'severe') severe++;
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid kpi-grid-7">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all Sickle Cell patients">
                            <span class="kpi-title">Total Sickle Cell</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All registered cases</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Moderate Anemia</span>
                        </div>
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb normal (> 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (> 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Stable Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'severe' ? 'active-kpi-filter' : ''}" data-kpi="severe" title="Severe Anemia (< 7.0 g/dL)">
                            <span class="kpi-title">⚠️ Severe Anemia (< 7.0)</span>
                            <span class="kpi-value">${severe.toLocaleString()}</span>
                            <span class="kpi-subtext">Crisis / BT Alert</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'gd') {
                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all GDM patients">
                            <span class="kpi-title">Total GDM Cases</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">Gestational Diabetes</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'ls') {
                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all Previous LSCS patients">
                            <span class="kpi-title">Total Previous LSCS</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">Previous C-Section</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else if (currentTab === 'all') {
                // Get total ANC count for percentage calculation
                const ancFiltered = getFilteredAncPatients();
                const totalAncForPct = ancFiltered.length;

                let saCount = 0, piCount = 0, gdCount = 0, lsCount = 0, scCount = 0, tpCount = 0, bhCount = 0;
                tabPatients.forEach(p => {
                    if (p.sa === 1) saCount++;
                    if (p.pi === 1) piCount++;
                    if (p.gd === 1) gdCount++;
                    if (p.ls === 1) lsCount++;
                    if (p.sc === 1) scCount++;
                    if (p.tp === 1) tpCount++;
                    if (p.bh === 1) bhCount++;
                });

                const pctOf = (val) => totalAncForPct > 0 ? ((val / totalAncForPct) * 100).toFixed(1) : '0.0';

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all UHRP patients">
                            <span class="kpi-title">Total UHRP Cohort</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(tabPatients.length)}% of ANC Registered</span>
                        </div>
                        <div class="kpi-card clickable persistent ${kpiFilter === 'sa' ? 'active-kpi-filter' : ''}" data-kpi="sa" title="Severe Anemia (Hb < 7.0 g/dL)">
                            <span class="kpi-title">🔴 Severe Anemia</span>
                            <span class="kpi-value">${saCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(saCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'pi' ? 'active-kpi-filter' : ''}" data-kpi="pi" title="PIH (Hypertension)">
                            <span class="kpi-title">🟠 PIH</span>
                            <span class="kpi-value">${piCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(piCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'gd' ? 'active-kpi-filter' : ''}" data-kpi="gd" title="GDM (Diabetes)">
                            <span class="kpi-title">🔵 GDM</span>
                            <span class="kpi-value">${gdCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(gdCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'ls' ? 'active-kpi-filter' : ''}" data-kpi="ls" title="Previous LSCS">
                            <span class="kpi-title">🟢 Previous LSCS</span>
                            <span class="kpi-value">${lsCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(lsCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'sc' ? 'active-kpi-filter' : ''}" data-kpi="sc" title="Sickle Cell Disease">
                            <span class="kpi-title">🟣 Sickle Cell</span>
                            <span class="kpi-value">${scCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(scCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'tp' ? 'active-kpi-filter' : ''}" data-kpi="tp" title="Teenage Pregnancy">
                            <span class="kpi-title">🌸 Teenage Pregnancy</span>
                            <span class="kpi-value">${tpCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(tpCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable ${kpiFilter === 'bh' ? 'active-kpi-filter' : ''}" data-kpi="bh" title="Complication in Last Pregnancy">
                            <span class="kpi-title">⚠️ Complication Last Preg</span>
                            <span class="kpi-value">${bhCount.toLocaleString()}</span>
                            <span class="kpi-subtext">${pctOf(bhCount)}% of ANC</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc" title="Missed 2+ consecutive ANC visits or no visit in last 70 days">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending" title="High risk case: No ANC visit conducted by Medical Officer yet — Schedule MO Exam">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            } else {
                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all">
                            <span class="kpi-title">Total ${TAB_NAMES[currentTab]}</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">Registered cases</span>
                        </div>
                        <div class="kpi-card clickable missed-anc ${kpiFilter === 'missed_anc' ? 'active-kpi-filter' : ''}" data-kpi="missed_anc">
                            <span class="kpi-title">⚠️ Missed 2+ ANC Visits</span>
                            <span class="kpi-value">${missedAncCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Follow-up Needed</span>
                        </div>
                        <div class="kpi-card clickable mo-pending ${kpiFilter === 'mo_pending' ? 'active-kpi-filter' : ''}" data-kpi="mo_pending">
                            <span class="kpi-title">🩺 Not Seen by MO</span>
                            <span class="kpi-value">${moPendingCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Pending MO Exam</span>
                        </div>
                    </div>
                `;
            }
        }

        const clearKpiBtn = document.getElementById('btn-clear-active-kpi');
        if (clearKpiBtn) {
            clearKpiBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kpiFilter = null;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        }

        document.querySelectorAll('.kpi-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const targetKpi = card.getAttribute('data-kpi');
                if (targetKpi === 'all' || kpiFilter === targetKpi) {
                    kpiFilter = null;
                } else {
                    kpiFilter = targetKpi;
                }
                renderLineList();
                scrollToLinelistOnMobile();
            });
        });
    }

    // Check if EDD is overdue
    function isEddOverdue(eddDateStr, delDateStr, isDelivered) {
        if (isDelivered === 1 || (delDateStr && delDateStr !== '-')) return false;
        if (!eddDateStr || eddDateStr === '-') return false;
        const edd = parseDate(eddDateStr);
        if (!edd || isNaN(edd.getTime())) return false;
        const today = parseDate(DASHBOARD_DATA.gen_date) || new Date();
        today.setHours(0, 0, 0, 0);
        return edd < today;
    }

    // Client-side Column Sorting Function
    function sortPatients(patients) {
        if (!sortState.col) return patients;
        const col = sortState.col;
        const dir = sortState.dir === 'asc' ? 1 : -1;

        return [...patients].sort((a, b) => {
            let valA = a[col] || '';
            let valB = b[col] || '';

            if (col === 'lmp' || col === 'edd' || col === 'del_date') {
                const dateA = parseDate(valA) || new Date(0);
                const dateB = parseDate(valB) || new Date(0);
                return (dateA - dateB) * dir;
            }
            if (col === 'ga') {
                const gaA = getPatientCurrentGaWeeks(a) ?? -1;
                const gaB = getPatientCurrentGaWeeks(b) ?? -1;
                return (gaA - gaB) * dir;
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * dir;
            }
            return String(valA).localeCompare(String(valB)) * dir;
        });
    }

    // Update Header Sort Icons
    function updateSortIcons() {
        document.querySelectorAll('#linelist-table th').forEach(th => {
            const col = th.getAttribute('data-sort');
            const iconSpan = th.querySelector('.sort-icon');
            th.classList.remove('sort-asc', 'sort-desc');

            if (col === sortState.col) {
                if (sortState.dir === 'asc') {
                    th.classList.add('sort-asc');
                    if (iconSpan) iconSpan.textContent = '▲';
                } else {
                    th.classList.add('sort-desc');
                    if (iconSpan) iconSpan.textContent = '▼';
                }
            } else {
                if (iconSpan) iconSpan.textContent = '↕';
            }
        });
    }

    // Labor Room Admission Hemoglobin (Col BK) Categorization
    function getLrAnemiaCategory(val) {
        if (val === null || val === undefined || isNaN(val)) return null;
        const hb = parseFloat(val);
        if (hb < 7.0) return 'severe';
        if (hb < 11.0) return 'moderate';
        return 'resolved';
    }

    // Render Delivery Place Distribution Chart
    function renderDeliveryPlaceChart(patients, toolbarConfig) {
        let delPatients = patients || currentAnalyticsPatients;
        const badgeEl = document.getElementById('chart-delivery-badge');
        if (badgeEl) {
            badgeEl.textContent = 'Facility vs Home';
            badgeEl.style.background = '';
            badgeEl.style.color = '';
        }

        const catOrder = ['DH', 'CHC', 'PHC', 'CH', 'Medical College', 'Private hospitals', 'Home', 'in transit', 'Not Delivered'];
        const delCounts = {};
        delPatients.forEach(p => {
            const cat = p.del_cat || (p.del === 1 ? 'Other Facility' : 'Not Delivered');
            delCounts[cat] = (delCounts[cat] || 0) + 1;
        });

        const presentCats = catOrder.filter(c => delCounts[c] > 0);
        Object.keys(delCounts).forEach(c => {
            if (!presentCats.includes(c) && delCounts[c] > 0) {
                presentCats.push(c);
            }
        });

        const delCategories = presentCats;
        const delSeries = delCategories.map(d => delCounts[d]);

        if (deliveryChartInstance) deliveryChartInstance.destroy();
        const delChartEl = document.getElementById('chart-delivery');
        if (!delChartEl) return;

        if (delSeries.length === 0) {
            delChartEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#64748b;font-size:13px;font-weight:600;">No delivery records for this selection</div>';
            return;
        }

        const colorMap = {
            'DH': '#10b981',
            'CHC': '#00b4d8',
            'PHC': '#7928ca',
            'CH': '#0284c7',
            'Medical College': '#2563eb',
            'Private hospitals': '#f77f00',
            'Home': '#ff2a6d',
            'in transit': '#db2777',
            'Not Delivered': '#94a3b8'
        };
        const chartColors = delCategories.map(c => colorMap[c] || '#64748b');

        delChartEl.innerHTML = '';
        const delOptions = {
            series: delSeries,
            labels: delCategories,
            chart: { type: 'donut', height: 280, toolbar: toolbarConfig || { show: true } },
            colors: chartColors,
            dataLabels: { enabled: true },
            legend: { position: 'bottom', fontSize: '11px' },
            tooltip: {
                y: {
                    formatter: function(val) {
                        const total = delSeries.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${val} (${pct}%)`;
                    }
                }
            }
        };

        deliveryChartInstance = new ApexCharts(delChartEl, delOptions);
        deliveryChartInstance.render();
    }

    // Section 2: Render Dynamic ApexCharts Visualizations
    function renderAnalyticsCharts(filteredTabPatients) {
        currentAnalyticsPatients = filteredTabPatients;
        const blockVal = document.getElementById(elementIds.block).value;
        const subtitleEl = document.getElementById(elementIds.analyticsSubtitle);
        if (subtitleEl) {
            const blockText = blockVal === 'All' ? 'All Blocks' : `${blockVal} Block`;
            subtitleEl.textContent = `Showing Charts for ${TAB_NAMES[currentTab]} (${blockText})`;
        }

        const toolbarConfig = {
            show: true,
            tools: {
                download: true,
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false
            }
        };

        const allBlocks = ['Barwaha', 'Bhagwanpura', 'Bhikangaon', 'Gogaon', 'Jhiranya', 'Kasrawad', 'Khargone', 'Maheshwar', 'Segaon'];

        // 0. Helpers for UHRP Clinical Management Status
        function isSevereAnemiaManaged(p) {
            return (p.is_doses && p.is_doses.length > 0) || (p.fcm === 'Yes') || (p.bt && p.bt !== 'No');
        }

        function isModerateAnemiaManaged(p) {
            // Requirement: Moderate anemia management is either FCM or Iron Sucrose doses, NOT blood transfusion
            return (p.is_doses && p.is_doses.length > 0) || (p.fcm === 'Yes');
        }

        function isPihManaged(p) {
            return !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt.toLowerCase() !== 'no');
        }

        // 0A. Risk Factor-wise Clinical Management Status (Horizontal Stacked Bar)
        const skipMgmtChartTabs = ['anc', 'sc', 'gd', 'ls', 'tp', 'bh'];
        const mgmtRiskEl = document.getElementById('chart-mgmt-risk');
        const mgmtBlockEl = document.getElementById('chart-mgmt-block');
        const mgmtRiskCard = mgmtRiskEl ? mgmtRiskEl.closest('.chart-card-modern') : null;
        const mgmtBlockCard = mgmtBlockEl ? mgmtBlockEl.closest('.chart-card-modern') : null;

        if (skipMgmtChartTabs.includes(currentTab)) {
            // Hide management charts for tabs without clinical management data
            if (mgmtRiskCard) mgmtRiskCard.style.display = 'none';
            if (mgmtBlockCard) mgmtBlockCard.style.display = 'none';
            if (mgmtRiskEl) mgmtRiskEl.innerHTML = '';
            if (mgmtRiskChartInstance) { mgmtRiskChartInstance.destroy(); mgmtRiskChartInstance = null; }
            if (mgmtBlockEl) mgmtBlockEl.innerHTML = '';
            if (mgmtBlockChartInstance) { mgmtBlockChartInstance.destroy(); mgmtBlockChartInstance = null; }
        } else {
            if (mgmtRiskCard) mgmtRiskCard.style.display = '';
            if (mgmtBlockCard) mgmtBlockCard.style.display = '';
        let mgmtConditions = [];
        if (currentTab === 'sa') {
            mgmtConditions = [{ name: 'Severe Anemia (IS / FCM / BT)', key: 'sa', check: isSevereAnemiaManaged }];
        } else if (currentTab === 'ma') {
            mgmtConditions = [{ name: 'Moderate Anemia (IS / FCM)', key: 'ma', check: isModerateAnemiaManaged }];
        } else if (currentTab === 'pi') {
            mgmtConditions = [{ name: 'PIH (Antihypertensive Regimen)', key: 'pi', check: isPihManaged }];
        } else {
            // Default (All UHRP): Severe Anemia, Moderate Anemia, and PIH
            mgmtConditions = [
                { name: 'Severe Anemia (IS / FCM / BT)', key: 'sa', check: isSevereAnemiaManaged },
                { name: 'Moderate Anemia (IS / FCM)', key: 'ma', check: isModerateAnemiaManaged },
                { name: 'PIH (Antihypertensive Regimen)', key: 'pi', check: isPihManaged }
            ];
        }

        const mgmtRiskCats = mgmtConditions.map(c => c.name);
        const mgmtRiskYes = [];
        const mgmtRiskNo = [];

        mgmtConditions.forEach(c => {
            const pool = (currentTab === 'all' || currentTab === c.key)
                ? filteredTabPatients.filter(p => p[c.key] === 1)
                : getFilteredPatients().filter(p => p[c.key] === 1);

            let yes = 0, no = 0;
            pool.forEach(p => {
                if (c.check(p)) yes++;
                else no++;
            });
            mgmtRiskYes.push(yes);
            mgmtRiskNo.push(no);
        });

        const mgmtRiskOptions = {
            series: [
                { name: 'On Management (Yes)', data: mgmtRiskYes },
                { name: 'Pending / Not on Management (No)', data: mgmtRiskNo }
            ],
            chart: { type: 'bar', height: 280, stacked: true, toolbar: toolbarConfig },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '50%',
                    borderRadius: 4
                }
            },
            colors: ['#10b981', '#ff2a6d'],
            dataLabels: {
                enabled: true,
                formatter: function (val, opt) {
                    if (!val || val === 0) return '';
                    const series = opt.w.config.series;
                    const idx = opt.dataPointIndex;
                    const total = (series[0].data[idx] || 0) + (series[1].data[idx] || 0);
                    if (total === 0) return val;
                    const pct = ((val / total) * 100).toFixed(1);
                    return `${val} (${pct}%)`;
                },
                style: { fontSize: '11px', fontWeight: 'bold' }
            },
            xaxis: {
                categories: mgmtRiskCats,
                labels: { style: { fontSize: '10px' } }
            },
            yaxis: {
                labels: { style: { fontSize: '11px', fontWeight: 600 } }
            },
            legend: { position: 'top', fontSize: '11px' },
            tooltip: {
                y: {
                    formatter: function (val, opt) {
                        const series = opt.w.config.series;
                        const idx = opt.dataPointIndex;
                        const total = (series[0].data[idx] || 0) + (series[1].data[idx] || 0);
                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${val} of ${total} cases (${pct}%)`;
                    }
                }
            }
        };

        if (mgmtRiskChartInstance) mgmtRiskChartInstance.destroy();
        const mgmtRiskEl = document.getElementById('chart-mgmt-risk');
        if (mgmtRiskEl) {
            mgmtRiskEl.innerHTML = '';
            mgmtRiskChartInstance = new ApexCharts(mgmtRiskEl, mgmtRiskOptions);
            mgmtRiskChartInstance.render();
        }

        // 0B. Block-wise Clinical Management Status (Horizontal Stacked Bar)
        const mgmtBlockYes = [];
        const mgmtBlockNo = [];
        const cohortToEval = (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'pi')
            ? filteredTabPatients
            : getFilteredPatients().filter(p => p.sa === 1 || p.ma === 1 || p.pi === 1);

        allBlocks.forEach(b => {
            const bPatients = cohortToEval.filter(p => (p.b || '').toLowerCase() === b.toLowerCase());
            let yes = 0, no = 0;
            bPatients.forEach(p => {
                if (currentTab === 'sa') {
                    if (isSevereAnemiaManaged(p)) yes++;
                    else no++;
                } else if (currentTab === 'ma') {
                    if (isModerateAnemiaManaged(p)) yes++;
                    else no++;
                } else if (currentTab === 'pi') {
                    if (isPihManaged(p)) yes++;
                    else no++;
                } else {
                    if (p.sa === 1) {
                        if (isSevereAnemiaManaged(p)) yes++;
                        else no++;
                    }
                    if (p.ma === 1) {
                        if (isModerateAnemiaManaged(p)) yes++;
                        else no++;
                    }
                    if (p.pi === 1) {
                        if (isPihManaged(p)) yes++;
                        else no++;
                    }
                }
            });
            mgmtBlockYes.push(yes);
            mgmtBlockNo.push(no);
        });

        const mgmtBlockOptions = {
            series: [
                { name: 'On Management (Yes)', data: mgmtBlockYes },
                { name: 'Pending / Not on Management (No)', data: mgmtBlockNo }
            ],
            chart: { type: 'bar', height: 280, stacked: true, toolbar: toolbarConfig },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '65%',
                    borderRadius: 4
                }
            },
            colors: ['#10b981', '#ff2a6d'],
            dataLabels: {
                enabled: true,
                formatter: function (val) {
                    return val > 0 ? val : '';
                },
                style: { fontSize: '10px', fontWeight: 'bold' }
            },
            xaxis: {
                categories: allBlocks,
                labels: { style: { fontSize: '10px' } }
            },
            yaxis: {
                labels: { style: { fontSize: '11px', fontWeight: 600 } }
            },
            legend: { position: 'top', fontSize: '11px' },
            tooltip: {
                y: {
                    formatter: function (val, opt) {
                        const series = opt.w.config.series;
                        const idx = opt.dataPointIndex;
                        const total = (series[0].data[idx] || 0) + (series[1].data[idx] || 0);
                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${val} of ${total} cases (${pct}%)`;
                    }
                }
            }
        };

        if (mgmtBlockChartInstance) mgmtBlockChartInstance.destroy();
        const mgmtBlockEl = document.getElementById('chart-mgmt-block');
        if (mgmtBlockEl) {
            mgmtBlockEl.innerHTML = '';
            mgmtBlockChartInstance = new ApexCharts(mgmtBlockEl, mgmtBlockOptions);
            mgmtBlockChartInstance.render();
        }
        } // end skipMgmtChartTabs else

        // 1. Block-wise Medical Officer Checkup Status (Horizontal Stacked Bar)
        const moDoneByBlock = [];
        const moPendingByBlock = [];

        allBlocks.forEach(b => {
            const bPatients = filteredTabPatients.filter(p => (p.b || '').toLowerCase() === b.toLowerCase());
            let done = 0, pending = 0;
            bPatients.forEach(p => {
                if (hasMoVisit(p)) done++;
                else pending++;
            });
            moDoneByBlock.push(done);
            moPendingByBlock.push(pending);
        });

        const moBlockOptions = {
            series: [
                { name: 'MO Checkup Completed', data: moDoneByBlock },
                { name: 'MO Checkup Pending', data: moPendingByBlock }
            ],
            chart: { type: 'bar', height: 320, stacked: true, toolbar: toolbarConfig },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '65%',
                    borderRadius: 4
                }
            },
            colors: ['#10b981', '#ff2a6d'],
            dataLabels: {
                enabled: true,
                style: { fontSize: '10px', fontWeight: 'bold' }
            },
            xaxis: {
                categories: allBlocks,
                labels: { style: { fontSize: '10px' } }
            },
            yaxis: {
                labels: { style: { fontSize: '11px', fontWeight: 600 } }
            },
            legend: { position: 'top', fontSize: '11px' }
        };

        if (moBlockChartInstance) moBlockChartInstance.destroy();
        const moBlockChartEl = document.getElementById('chart-mo-block');
        if (moBlockChartEl) {
            moBlockChartEl.innerHTML = '';
            moBlockChartInstance = new ApexCharts(moBlockChartEl, moBlockOptions);
            moBlockChartInstance.render();
        }

        // 2. Risk Factor-wise Medical Officer Checkup Status (Horizontal Stacked Bar)
        const riskDefList = [
            { name: 'Severe Anemia', key: 'sa' },
            { name: 'PIH', key: 'pi' },
            { name: 'GDM', key: 'gd' },
            { name: 'Previous LSCS', key: 'ls' },
            { name: 'Sickle Cell', key: 'sc' },
            { name: 'Teenage Preg.', key: 'tp' },
            { name: 'Complication Last Preg.', key: 'bh' }
        ];

        const rfCategories = riskDefList.map(r => r.name);
        const rfMoDone = [];
        const rfMoPending = [];

        riskDefList.forEach(r => {
            const rPatients = filteredTabPatients.filter(p => p[r.key] === 1);
            let done = 0, pending = 0;
            rPatients.forEach(p => {
                if (hasMoVisit(p)) done++;
                else pending++;
            });
            rfMoDone.push(done);
            rfMoPending.push(pending);
        });

        const moRiskOptions = {
            series: [
                { name: 'MO Checkup Completed', data: rfMoDone },
                { name: 'MO Checkup Pending', data: rfMoPending }
            ],
            chart: { type: 'bar', height: 280, stacked: true, toolbar: toolbarConfig },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '65%',
                    borderRadius: 4
                }
            },
            colors: ['#10b981', '#ff2a6d'],
            dataLabels: {
                enabled: true,
                style: { fontSize: '10px', fontWeight: 'bold' }
            },
            xaxis: {
                categories: rfCategories,
                labels: { style: { fontSize: '10px' } }
            },
            yaxis: {
                labels: { style: { fontSize: '11px', fontWeight: 600 } }
            },
            legend: { position: 'top', fontSize: '11px' }
        };

        if (moRiskChartInstance) moRiskChartInstance.destroy();
        const moRiskChartEl = document.getElementById('chart-mo-risk');
        if (moRiskChartEl) {
            moRiskChartEl.innerHTML = '';
            moRiskChartInstance = new ApexCharts(moRiskChartEl, moRiskOptions);
            moRiskChartInstance.render();
        }

        // 3. Block-wise Distribution (Horizontal Sidebar)
        const blockCounts = {};
        filteredTabPatients.forEach(p => {
            const b = p.b || 'Unknown';
            blockCounts[b] = (blockCounts[b] || 0) + 1;
        });

        const blockCategories = Object.keys(blockCounts).sort();
        const blockData = blockCategories.map(b => blockCounts[b]);

        const blockOptions = {
            series: [{ name: 'UHRP Cases', data: blockData }],
            chart: { type: 'bar', height: 280, toolbar: toolbarConfig },
            plotOptions: { bar: { borderRadius: 6, horizontal: true, distributed: true } },
            colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#1e40af', '#0284c7', '#0369a1', '#0f766e'],
            dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 'bold' } },
            xaxis: { categories: blockCategories },
            legend: { show: false }
        };

        if (blockChartInstance) blockChartInstance.destroy();
        const blockChartEl = document.getElementById('chart-block');
        if (blockChartEl) {
            blockChartEl.innerHTML = '';
            blockChartInstance = new ApexCharts(blockChartEl, blockOptions);
            blockChartInstance.render();
        }

        // 4. Delivery Place Distribution
        renderDeliveryPlaceChart(filteredTabPatients, toolbarConfig);
    }

    // Update Line List Pagination UI
    function updatePaginationUI(totalCount, totalPages, startIdx, endIdx) {
        const infoEl = document.getElementById('pagination-info');
        const pageEl = document.getElementById('pagination-current-page');
        const btnFirst = document.getElementById('btn-page-first');
        const btnPrev = document.getElementById('btn-page-prev');
        const btnNext = document.getElementById('btn-page-next');
        const btnLast = document.getElementById('btn-page-last');

        if (infoEl) {
            if (totalCount === 0) {
                infoEl.textContent = 'Showing 0 of 0 patients';
            } else {
                infoEl.textContent = `Showing ${(startIdx + 1).toLocaleString()}–${endIdx.toLocaleString()} of ${totalCount.toLocaleString()} patients`;
            }
        }

        if (pageEl) {
            pageEl.textContent = `Page ${currentPage} of ${totalPages || 1}`;
        }

        if (btnFirst) btnFirst.disabled = (currentPage <= 1);
        if (btnPrev) btnPrev.disabled = (currentPage <= 1);
        if (btnNext) btnNext.disabled = (currentPage >= totalPages || totalPages === 0);
        if (btnLast) btnLast.disabled = (currentPage >= totalPages || totalPages === 0);
    }

    // Render Table Line List
    function renderLineList() {
        const filtered = getFilteredPatients();
        updateRiskCards(filtered);

        let tabPatients = [];
        if (currentTab === 'anc') {
            tabPatients = getFilteredAncPatients();
        } else if (currentTab === 'all') {
            tabPatients = filtered.filter(p => p.uhrp === 1 || (p.sa === 1 || p.pi === 1 || p.gd === 1 || p.ls === 1 || p.sc === 1 || p.tp === 1 || p.bh === 1));
        } else if (currentTab === 'ma') {
            tabPatients = filtered.filter(p => p.ma === 1);
        } else {
            tabPatients = filtered.filter(p => p[currentTab] === 1);
        }

        // Management Status Filter (SA, MA, PI, GD)
        const mgmtWrapper = document.getElementById('mgmt-filter-wrapper');
        const mgmtSelect = document.getElementById(elementIds.mgmtStatus);
        const canFilterMgmt = ['sa', 'ma', 'pi', 'gd'].includes(currentTab);

        if (mgmtWrapper) {
            mgmtWrapper.style.display = canFilterMgmt ? 'inline-flex' : 'none';
        }

        let mgmtFilteredPatients = tabPatients;
        if (canFilterMgmt && mgmtSelect && mgmtSelect.value !== 'All') {
            const mgmtVal = mgmtSelect.value;
            if (mgmtVal === 'done') {
                mgmtFilteredPatients = tabPatients.filter(p => isManagementDone(p, currentTab));
            } else if (mgmtVal === 'pending') {
                mgmtFilteredPatients = tabPatients.filter(p => !isManagementDone(p, currentTab));
            }
        }

        renderKpiCards(mgmtFilteredPatients);

        let kpiFilteredPatients = mgmtFilteredPatients;
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
            } else if (currentTab === 'all' && ['sa', 'pi', 'gd', 'ls', 'sc', 'tp', 'bh'].includes(kpiFilter)) {
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
        }

        renderTrimesterKpiCards(kpiFilteredPatients);

        let trimesterFilteredPatients = kpiFilteredPatients;
        if (trimesterFilter) {
            trimesterFilteredPatients = kpiFilteredPatients.filter(p => getPatientTrimester(p) === trimesterFilter);
        }

        renderAncVisitKpiCards(trimesterFilteredPatients);
        if (currentMainView === 'analytics') {
            renderAnalyticsCharts(trimesterFilteredPatients);
        }

        let finalPatients = trimesterFilteredPatients;

        if (visitFilter !== null) {
            const vIdx = visitFilter - 1;
            finalPatients = finalPatients.filter(p => {
                const vd = (p.v_dates || [])[vIdx];
                return vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan';
            });
        }

        const countBadge = document.getElementById(elementIds.patientCountBadge);
        if (countBadge) countBadge.textContent = `${finalPatients.length.toLocaleString()} Patients`;

        const sortedTabPatients = sortPatients(finalPatients);

        const totalCount = sortedTabPatients.length;
        const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalCount / pageSize);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        if (currentPage < 1) currentPage = 1;

        const startIdx = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize;
        const endIdx = pageSize === 'all' ? totalCount : Math.min(startIdx + (typeof pageSize === 'number' ? pageSize : totalCount), totalCount);
        const pagePatients = sortedTabPatients.slice(startIdx, endIdx);

        updatePaginationUI(totalCount, totalPages, startIdx, endIdx);

        const tbody = document.getElementById(elementIds.tbody);
        if (!tbody) return;

        if (pagePatients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:2rem; color:#64748b;">No high-risk patient records found for the selected filters.</td></tr>`;
            return;
        }

        const isExpandableTab = true;

        tbody.innerHTML = pagePatients.map(p => {
            const ancCheck = checkConsecutiveMissedAnc(p);
            const missedBadgeHtml = ancCheck.hasMissed 
                ? `<br><span class="badge-missed-anc" title="${ancCheck.daysSinceLastVisit ? `No ANC visit in last ${ancCheck.daysSinceLastVisit} days (Threshold: > 70 days)` : '2+ Consecutive ANC Visits Missed'}">⚠️ 2+ ANC Missed</span>`
                : '';

            const isMoSeen = hasMoVisit(p);
            const moBadgeHtml = isMoSeen
                ? `<span class="badge-mo-status badge-mo-done" title="Examined by Medical Officer / Doctor">✓ MO Done</span>`
                : `<span class="badge-mo-status badge-mo-pending" title="Mandatory MO examination pending under NHM guidelines">⚠️ MO Pending</span>`;

            const isPe = hasPreEclampsia(p);
            const peBadgeHtml = isPe
                ? `<span class="badge-preeclampsia-flag" title="Pre-eclampsia: BP ≥ 140/90 and Urine Albumin ≥ +2">⚠️ Pre-eclampsia (Alb ≥ +2)</span>`
                : '';

            const cleanV = p.v ? p.v.replace(/\s*\(\d+\)\*?|\s*\(\*\)/, '').trim() : '-';
            const isDelivered = p.del === 1 || (p.del_date && p.del_date !== '-');
            const isOverdue = isEddOverdue(p.edd, p.del_date, p.del);

            let delStatusBadge = '';
            if (p.del === 2 || p.is_abortion === 1) {
                delStatusBadge = `<span class="badge-abortion" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:12px; display:inline-block;">⚠️ ${p.d || 'Abortion'}</span>`;
            } else if (isDelivered) {
                delStatusBadge = `<span class="badge-delivered">Delivered (${p.d || 'Facility'})</span>`;
            } else if (isOverdue) {
                delStatusBadge = `<span class="badge-overdue">⚠️ Delivery Overdue</span>`;
            } else {
                delStatusBadge = `<span class="badge-undelivered">Pregnant</span>`;
            }

            const delDateDisplay = (p.del_date && p.del_date !== '-') ? formatDateDDMMYYYY(p.del_date) : '-';
            const delCellClass = (p.del_date && p.del_date !== '-') ? 'delivery-date-highlight' : '';
            const rowClass = 'patient-row expandable-row';
            const clickHint = `title="Click row to view 12 ANC Visit Trend Chart & Attendance Timeline"`;

            let mainRowHtml = `
                <tr class="${rowClass}" data-mpid="${p.id}" ${clickHint}>
                    <td class="col-village" style="font-size:0.78rem; line-height:1.35;">
                        <span style="font-weight:700; color:#0f172a; font-size:0.78rem; display:block;">${cleanV}</span>
                        <span style="font-size:0.78rem; color:#0284c7; font-weight:600; display:block;">${p.sub || ''}</span>
                        <span style="font-size:0.78rem; color:#64748b; font-weight:500; display:block;">${p.b}</span>
                    </td>
                    <td class="col-mpid"><span class="mpid-badge">${p.id}</span></td>
                    <td class="col-name">
                        <span style="font-weight:700; color:#0f172a; font-size:0.85rem; display:block;">${p.n}</span>
                        <span style="font-size:0.78rem; color:#64748b; font-weight:500; display:block;">${p.h && p.h !== 'N/A' ? p.h : ''}</span>
                        ${missedBadgeHtml}
                    </td>
                    <td class="col-age">${p.a}</td>
                    <td class="col-mobile">${p.p}</td>
                    <td class="col-lmp">${formatDateDDMMYYYY(p.lmp)}</td>
                    <td class="col-edd"><strong>${formatDateDDMMYYYY(p.edd)}</strong></td>
                    <td class="col-ga">${getPatientGaDisplay(p)}</td>
                    <td class="col-deldate ${delCellClass}">${delDateDisplay}</td>
                    <td class="col-delplace">${delStatusBadge}</td>
                    <td class="col-complication">
                        <span style="font-size:0.75rem; font-weight:600; color:#334155;">${p.f || '-'}</span>
                        <div class="row-tags-wrapper">
                            ${moBadgeHtml}
                            ${peBadgeHtml}
                        </div>
                    </td>
                </tr>
            `;

            const hasAnemiaMgmtGiven = (p.is_doses && p.is_doses.length > 0) || (p.fcm === 'Yes') || (p.bt && p.bt !== 'No');
            const showAnemiaMgmt = (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc' || p.sa === 1 || p.ma === 1 || p.sc === 1) || hasAnemiaMgmtGiven;
            const showPihMgmt = (currentTab === 'pi' || p.pi === 1);
            const showGdmMgmt = (currentTab === 'gd' || p.gd === 1);

            if (isExpandableTab) {
                mainRowHtml += `
                    <tr class="drawer-row" id="drawer-${p.id}" style="display: none;">
                        <td colspan="11">
                            <div class="drawer-container">
                                <!-- Mobile Patient Profile Details (Visible on Mobile/Tablet) -->
                                <div class="drawer-mobile-profile mobile-only-block">
                                    <div class="drawer-profile-grid">
                                        <div class="dprofile-item"><span class="dprofile-label">MP ID</span><span class="dprofile-val">${p.id}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">Age</span><span class="dprofile-val">${p.a}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">LMP</span><span class="dprofile-val">${formatDateDDMMYYYY(p.lmp)}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">Gestational Age</span><span class="dprofile-val">${getPatientGaDisplay(p)}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">Delivery Status</span><span class="dprofile-val">${delStatusBadge}</span></div>
                                        ${(p.del_date && p.del_date !== '-') ? `<div class="dprofile-item"><span class="dprofile-label">Del Date</span><span class="dprofile-val">${delDateDisplay}</span></div>` : ''}
                                        <div class="dprofile-item"><span class="dprofile-label">LR Admission Hb</span><span class="dprofile-val" style="font-weight:700; color:#dc2626;">${p.lr_hb ? p.lr_hb + ' g/dL' : 'Not Recorded'}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">BP at Admission</span><span class="dprofile-val" style="font-weight:700; color:#0369a1;">${p.bp_adm ? p.bp_adm + ' mmHg' : 'Not Recorded'}</span></div>
                                        <div class="dprofile-item full-span"><span class="dprofile-label">Complications / Risk</span><span class="dprofile-val" style="color:#b91c1c; font-weight:700;">${p.f || '-'}</span></div>
                                    </div>
                                </div>

                                <div class="drawer-location-bar">
                                    📍 <strong>Facility Hierarchy:</strong> Block: <strong>${p.b}</strong> | PHC: <strong>${p.phc}</strong> | Subcenter: <strong>${p.sub}</strong> | Village: <strong>${cleanV}</strong>
                                    ${isDelivered ? ` | 🏥 <strong>Delivery Facility:</strong> <strong style="color:#059669;">${p.d || '-'}</strong> (${p.del_cat || 'Facility'}) ${p.del_date && p.del_date !== '-' ? `on <strong>${delDateDisplay}</strong>` : ''}` : ''}
                                    ${p.lr_hb ? ` | 🩸 <strong>Hb on LR Admission:</strong> <strong style="color:#dc2626;">${p.lr_hb} g/dL</strong>` : ''}
                                    ${p.bp_adm ? ` | 🩺 <strong>BP at Admission:</strong> <strong style="color:#0369a1;">${p.bp_adm} mmHg</strong>` : ''}
                                </div>
                                ${showAnemiaMgmt ? `
                                <div class="drawer-management-bar" style="margin-bottom: 0.6rem;">
                                    <span class="d-mgt-heading">💊 Anemia Clinical Management:</span>
                                    <div class="d-mgt-grid">
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Inj. FCM:</span>
                                            <span class="d-mgt-badge ${p.fcm === 'Yes' ? 'mgt-yes' : 'mgt-no'}">
                                                ${p.fcm === 'Yes' ? `✓ Given ${p.fcm_fac ? `(${p.fcm_fac})` : ''}` : '✕ Not Given'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Blood Transfusion (BT):</span>
                                            <span class="d-mgt-badge ${(p.bt && p.bt !== 'No') ? 'mgt-yes' : 'mgt-no'}">
                                                ${(p.bt && p.bt !== 'No') ? `✓ Given (${p.bt})` : '✕ Not Given'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Inj. Iron Sucrose:</span>
                                            <span class="d-mgt-badge ${(p.is_doses && p.is_doses.length > 0) ? 'mgt-yes' : 'mgt-no'}">
                                                ${(p.is_doses && p.is_doses.length > 0) ? `✓ ${p.is_doses.length} / 5 Doses (${p.is_doses.join(', ')})` : '✕ Not Given'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                ${showPihMgmt ? `
                                <div class="drawer-management-bar drawer-pih-bar" style="background:#fff7ed; border: 1px solid #fed7aa; border-left:4px solid #f77f00; margin-bottom: 0.6rem;">
                                    <span class="d-mgt-heading" style="color:#c2410c;">💊 PIH Clinical Management (Hypertension Regimen):</span>
                                    <div class="d-mgt-grid">
                                        <div class="d-mgt-item" style="grid-column: 1 / -1;">
                                            <span class="d-mgt-label">Antihypertensive Therapy:</span>
                                            <span class="d-mgt-badge ${p.pih_mgmt ? 'mgt-yes' : 'mgt-no'}" style="font-size: 0.75rem; font-weight: 700;">
                                                ${p.pih_mgmt ? `✓ ${p.pih_mgmt}` : '✕ Not Recorded / Not Prescribed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                ${showGdmMgmt ? `
                                <div class="drawer-management-bar drawer-gdm-bar" style="background:#f0f9ff; border: 1px solid #bae6fd; border-left:4px solid #00b4d8; margin-bottom: 0.6rem;">
                                    <span class="d-mgt-heading" style="color:#0369a1;">💊 GDM Clinical Management (Diabetes Regimen):</span>
                                    <div class="d-mgt-grid">
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Medical Nutrition Therapy (MNT):</span>
                                            <span class="d-mgt-badge ${p.gdm_mnt === 'Yes' ? 'mgt-yes' : 'mgt-no'}" style="font-size: 0.75rem; font-weight: 700;">
                                                ${p.gdm_mnt === 'Yes' ? '✓ On MNT' : '✕ No'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Tab. Metformin:</span>
                                            <span class="d-mgt-badge ${p.gdm_met === 'Yes' ? 'mgt-yes' : 'mgt-no'}" style="font-size: 0.75rem; font-weight: 700;">
                                                ${p.gdm_met === 'Yes' ? '✓ Prescribed' : '✕ None'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Inj. Insulin:</span>
                                            <span class="d-mgt-badge ${p.gdm_ins === 'Yes' ? 'mgt-yes' : 'mgt-no'}" style="font-size: 0.75rem; font-weight: 700;">
                                                ${p.gdm_ins === 'Yes' ? '✓ Prescribed' : '✕ None'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                ${currentTab !== 'anc' ? `<div class="drawer-header" id="drawer-header-${p.id}">
                                    <span class="drawer-title">📈 12-ANC Visit Clinical Trend Chart & Attendance Timeline — ${p.n} (MP ID: ${p.id})</span>
                                    <div id="drawer-status-${p.id}"></div>
                                </div>` : ''}
                                <div class="anc-timeline-container">
                                    <div class="anc-timeline-title">📋 12 ANC Visit Attendance Timeline Tracker</div>
                                    <div class="anc-timeline-grid" id="timeline-${p.id}"></div>
                                </div>
                                ${currentTab !== 'anc' ? `<div class="chart-wrapper" id="chart-${p.id}">
                                    <div style="text-align:center; padding:1.5rem; color:#64748b;">Click to render ANC visit graph...</div>
                                </div>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }

            return mainRowHtml;
        }).join('');

        if (isExpandableTab) {
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
                        riskTagsHtml += `<span style="background:#fef3c7; color:#b45309; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;" title="${ancCheck.daysSinceLastVisit ? `No visit in last ${ancCheck.daysSinceLastVisit} days` : '2+ Consecutive ANC Visits Missed'}">⚠️ 2+ Missed</span>`;
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
    }

    // Accordion Toggle & Chart Renderer for Patients
    function toggleRowDrawer(mpid) {
        const drawer = document.getElementById(`drawer-${mpid}`);
        if (!drawer) return;

        const isVisible = drawer.style.display !== 'none';
        drawer.style.display = isVisible ? 'none' : 'table-row';

        const mainRow = document.querySelector(`tr.expandable-row[data-mpid="${mpid}"]`);
        if (mainRow) {
            if (isVisible) {
                mainRow.classList.remove('expanded-row-active');
            } else {
                mainRow.classList.add('expanded-row-active');
            }
        }

        if (!isVisible) {
            let p = (DASHBOARD_DATA.patients || []).find(item => item.id === mpid || String(item.id) === String(mpid));
            if (!p) {
                p = (DASHBOARD_DATA.anc_patients || []).find(item => item.id === mpid || String(item.id) === String(mpid));
            }
            if (p) {
                renderAncTimelineGrid(mpid, p);
                if (currentTab !== 'anc') {
                    setTimeout(() => {
                        if (currentTab === 'pi') {
                            renderBpSparkline(mpid, p);
                        } else {
                            renderHbSparkline(mpid, p);
                        }
                    }, 50);
                }
            }
        }
    }

    // Helper: Calculate gestational age in completed weeks based on LMP and reference event date
    function getPatientCurrentGaWeeks(p) {
        if (!p.lmp || p.lmp === '-' || p.lmp === 'N/A') return null;
        const lmpDate = parseDate(p.lmp);
        if (!lmpDate) return null;

        // Reference date:
        // 1. If delivered -> Delivery Date (or EDD as fallback)
        // 2. If abortion -> event occurred early (cap at 20 wks or use edd/gen_date)
        // 3. If undelivered -> Date of Dashboard Generation Date (DASHBOARD_DATA.gen_date)
        let refDate = parseDate(DASHBOARD_DATA.gen_date) || new Date();

        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const isAbortion = (p.del === 2 || p.is_abortion === 1);

        if (isDelivered) {
            const parsedDel = parseDate(p.del_date);
            if (parsedDel) {
                refDate = parsedDel;
            } else {
                const parsedEdd = parseDate(p.edd);
                if (parsedEdd) refDate = parsedEdd;
            }
        } else if (isAbortion) {
            // For abortion cases without an exact date, pregnancy terminated earlier
            // If LMP difference to gen_date is > 20 weeks, cap at 20 weeks (or 1st/2nd trimester)
            const diffDays = Math.round((refDate.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
            const calculatedWeeks = Math.floor(diffDays / 7);
            if (calculatedWeeks > 20) {
                return 16; // Categorized into 2nd trimester as standard for abortion if later
            }
            return calculatedWeeks >= 0 ? calculatedWeeks : null;
        }

        const diffMs = refDate.getTime() - lmpDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return null;
        return Math.floor(diffDays / 7);
    }

    // Helper: Categorize patient into 3 Trimesters
    function getPatientTrimester(p) {
        const weeks = getPatientCurrentGaWeeks(p);
        if (weeks === null) return 'unknown';
        if (weeks <= 12) return 'T1';
        if (weeks <= 28) return 'T2';
        return 'T3';
    }

    // Helper: Format Gestational Age for Line List Table cell
    function getPatientGaDisplay(p) {
        const weeks = getPatientCurrentGaWeeks(p);
        if (weeks === null) return '—';
        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const isAbortion = (p.del === 2 || p.is_abortion === 1);

        if (isAbortion) {
            return `<span class="badge-ga" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca;" title="Abortion (~${weeks} Wks GA)">${weeks} Wks</span>`;
        }
        if (isDelivered) {
            return `<span class="badge-ga delivered" title="Delivered (~${weeks} Wks GA)">${weeks} Wks</span>`;
        }
        let tClass = 't1';
        if (weeks > 28) tClass = 't3';
        else if (weeks > 12) tClass = 't2';
        return `<span class="badge-ga ${tClass}" title="${weeks} Weeks Gestational Age (Trimester ${tClass.toUpperCase()})">${weeks} Wks</span>`;
    }

    // Helper: Determine Trimester when Risk Factor was Diagnosed (Severe Anemia & PIH only)
    function getPatientDiagnosedTrimester(p, tabKey) {
        if (!p.lmp || p.lmp === '-' || p.lmp === 'N/A') return null;
        const lmpDate = parseDate(p.lmp);
        if (!lmpDate) return null;

        const vDates = p.v_dates || [];
        let diagDate = null;

        if (tabKey === 'sa') {
            const hbArr = p.hb_v || [];
            for (let i = 0; i < 12; i++) {
                const hb = hbArr[i];
                const dtStr = vDates[i];
                if (hb !== undefined && hb !== null && !isNaN(hb) && hb < 7.0 && dtStr && dtStr !== '-') {
                    const d = parseDate(dtStr);
                    if (d) {
                        diagDate = d;
                        break;
                    }
                }
            }
        } else if (tabKey === 'ma') {
            const hbArr = p.hb_v || [];
            for (let i = 0; i < 12; i++) {
                const hb = hbArr[i];
                const dtStr = vDates[i];
                if (hb !== undefined && hb !== null && !isNaN(hb) && hb < 10.0 && dtStr && dtStr !== '-') {
                    const d = parseDate(dtStr);
                    if (d) {
                        diagDate = d;
                        break;
                    }
                }
            }
        } else if (tabKey === 'pi') {
            const bpArr = p.bp_v || [];
            for (let i = 0; i < 12; i++) {
                const bp = bpArr[i];
                const dtStr = vDates[i];
                if (bp && typeof bp === 'string' && bp.includes('/') && dtStr && dtStr !== '-') {
                    const parts = bp.split('/');
                    const sys = parseFloat(parts[0]);
                    const dia = parseFloat(parts[1]);
                    if ((sys >= 140 || dia >= 90)) {
                        const d = parseDate(dtStr);
                        if (d) {
                            diagDate = d;
                            break;
                        }
                    }
                }
            }
        }

        // Fallback to earliest attended ANC visit date
        if (!diagDate) {
            for (let i = 0; i < 12; i++) {
                const dtStr = vDates[i];
                if (dtStr && dtStr !== '-') {
                    const d = parseDate(dtStr);
                    if (d) {
                        diagDate = d;
                        break;
                    }
                }
            }
        }
        // Fallback to PW registration date
        if (!diagDate && p.reg && p.reg !== '-') {
            const d = parseDate(p.reg);
            if (d) diagDate = d;
        }

        if (!diagDate) return null;
        const diffMs = diagDate.getTime() - lmpDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'T1';
        const weeks = Math.floor(diffDays / 7);
        if (weeks <= 12) return 'T1';
        if (weeks <= 28) return 'T2';
        return 'T3';
    }

    // Render 3 Trimester KPI Cards (Clickable Filters)
    function renderTrimesterKpiCards(tabPatients) {
        const container = document.getElementById(elementIds.trimesterContainer);
        if (!container) return;

        let countT1 = 0, countT2 = 0, countT3 = 0;
        let diagT1 = 0, diagT2 = 0, diagT3 = 0;
        const showDiag = (currentTab === 'sa' || currentTab === 'pi' || currentTab === 'ma');

        tabPatients.forEach(p => {
            const t = getPatientTrimester(p);
            if (t === 'T1') countT1++;
            else if (t === 'T2') countT2++;
            else if (t === 'T3') countT3++;

            if (showDiag) {
                const dt = getPatientDiagnosedTrimester(p, currentTab);
                if (dt === 'T1') diagT1++;
                else if (dt === 'T2') diagT2++;
                else if (dt === 'T3') diagT3++;
            }
        });

        const activeTLabel = trimesterFilter !== null ? ` (Filtering for ${trimesterFilter === 'T1' ? '1st' : trimesterFilter === 'T2' ? '2nd' : '3rd'} Trimester)` : '';
        const riskLabel = currentTab === 'sa' ? 'Severe Anemia' : currentTab === 'ma' ? 'Moderate Anemia' : 'PIH';

        container.innerHTML = `
            <div class="trimester-kpi-header">
                <span>🗓️ Gestational Age by Trimester (Based on LMP)${activeTLabel}</span>
                ${trimesterFilter !== null ? `<span style="color:#0284c7; font-weight:800; cursor:pointer;" id="clear-trimester-filter-btn">Clear Trimester Filter ✖</span>` : ''}
            </div>
            <div class="trimester-kpi-grid">
                <div class="trimester-kpi-card card-t1 ${trimesterFilter === 'T1' ? 'active-trimester-filter' : ''}" data-trimester="T1" title="Click to filter 1st Trimester patients (≤ 12 Weeks GA)">
                    <div class="trimester-title-row">
                        <span class="trimester-title">🐣 1st Trimester</span>
                        <span class="trimester-weeks-badge">≤ 12 Wks</span>
                    </div>
                    <div class="trimester-val-row">
                        <div class="trimester-stat-col">
                            <span class="trimester-stat-label">Total Cases</span>
                            <span class="trimester-value">${countT1}</span>
                        </div>
                        ${showDiag ? `
                        <div class="trimester-stat-col diag-col" title="${diagT1} mothers diagnosed with ${riskLabel} in 1st Trimester">
                            <span class="trimester-stat-label diag-label">Diagnosed in T1</span>
                            <span class="trimester-value diag-value">${diagT1}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div class="trimester-kpi-card card-t2 ${trimesterFilter === 'T2' ? 'active-trimester-filter' : ''}" data-trimester="T2" title="Click to filter 2nd Trimester patients (13–28 Weeks GA)">
                    <div class="trimester-title-row">
                        <span class="trimester-title">🤰 2nd Trimester</span>
                        <span class="trimester-weeks-badge">13–28 Wks</span>
                    </div>
                    <div class="trimester-val-row">
                        <div class="trimester-stat-col">
                            <span class="trimester-stat-label">Total Cases</span>
                            <span class="trimester-value">${countT2}</span>
                        </div>
                        ${showDiag ? `
                        <div class="trimester-stat-col diag-col" title="${diagT2} mothers diagnosed with ${riskLabel} in 2nd Trimester">
                            <span class="trimester-stat-label diag-label">Diagnosed in T2</span>
                            <span class="trimester-value diag-value">${diagT2}</span>
                        </div>` : ''}
                    </div>
                </div>

                <div class="trimester-kpi-card card-t3 ${trimesterFilter === 'T3' ? 'active-trimester-filter' : ''}" data-trimester="T3" title="Click to filter 3rd Trimester patients (> 28 Weeks GA)">
                    <div class="trimester-title-row">
                        <span class="trimester-title">👶 3rd Trimester</span>
                        <span class="trimester-weeks-badge">> 28 Wks</span>
                    </div>
                    <div class="trimester-val-row">
                        <div class="trimester-stat-col">
                            <span class="trimester-stat-label">Total Cases</span>
                            <span class="trimester-value">${countT3}</span>
                        </div>
                        ${showDiag ? `
                        <div class="trimester-stat-col diag-col" title="${diagT3} mothers diagnosed with ${riskLabel} in 3rd Trimester">
                            <span class="trimester-stat-label diag-label">Diagnosed in T3</span>
                            <span class="trimester-value diag-value">${diagT3}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;

        const clearBtn = document.getElementById('clear-trimester-filter-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                trimesterFilter = null;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        }

        container.querySelectorAll('.trimester-kpi-card').forEach(card => {
            card.addEventListener('click', () => {
                const t = card.getAttribute('data-trimester');
                if (trimesterFilter === t) {
                    trimesterFilter = null;
                } else {
                    trimesterFilter = t;
                }
                renderLineList();
                scrollToLinelistOnMobile();
            });
        });
    }

    // Render 12 ANC Visit Summary KPI Bar (Clickable Filters)
    function renderAncVisitKpiCards(tabPatients) {
        const container = document.getElementById('anc-visit-kpi-container');
        if (!container) return;

        const visitCounts = Array(12).fill(0);

        tabPatients.forEach(p => {
            const vDates = p.v_dates || [];
            for (let i = 0; i < 12; i++) {
                // A visit is attended if v_dates[i] is a non-null, non-'-' date string
                const vd = vDates[i];
                if (vd && vd !== '-' && vd !== null) {
                    visitCounts[i]++;
                }
            }
        });

        let activeKpiLabel = '';
        if (kpiFilter) {
            if (kpiFilter === 'missed_anc') activeKpiLabel = ' • Missed 2+ ANC Cohort';
            else if (kpiFilter === 'preeclampsia') activeKpiLabel = ' • Pre-eclampsia Cohort';
            else if (kpiFilter === 'mo_pending') activeKpiLabel = ' • Not Seen by MO Cohort';
            else if (kpiFilter === 'resolved') activeKpiLabel = ' • Resolved (> 11.0 g/dL) Cohort';
            else if (kpiFilter === 'mild') activeKpiLabel = ' • Mild Anemia (10.0–10.9 g/dL) Cohort';
            else if (kpiFilter === 'moderate') activeKpiLabel = ' • Moderate Anemia (7.0–9.9 g/dL) Cohort';
            else if (kpiFilter === 'severe') activeKpiLabel = ' • Severe Anemia (< 7.0 g/dL) Cohort';
            else if (kpiFilter === 'controlled') activeKpiLabel = ' • BP Controlled Cohort';
            else if (kpiFilter === 'uncontrolled') activeKpiLabel = ' • BP Uncontrolled Cohort';
        }
        if (trimesterFilter) {
            activeKpiLabel += ` • ${trimesterFilter === 'T1' ? '1st' : trimesterFilter === 'T2' ? '2nd' : '3rd'} Trimester`;
        }

        const activeVisitLabel = visitFilter !== null ? ` (Filtering for Visit ${visitFilter})` : '';

        container.innerHTML = `
            <div class="anc-visit-kpi-header">
                <span>📋 12 ANC visit summary${activeKpiLabel}${activeVisitLabel}</span>
                ${visitFilter !== null ? `<span style="color:#0284c7; font-weight:800; cursor:pointer;" id="clear-visit-filter-btn">Clear Visit Filter (V${visitFilter}) ✖</span>` : ''}
            </div>
            <div class="anc-visit-kpi-grid">
                ${visitCounts.map((cnt, i) => {
                    const vNum = i + 1;
                    const isActive = visitFilter === vNum;
                    return `
                        <div class="anc-visit-kpi-card ${isActive ? 'active-visit-filter' : ''}" data-vnum="${vNum}" title="Click to filter line list for patients who completed ANC Visit ${vNum}">
                            <span class="anc-vkpi-title">Visit ${vNum}</span>
                            <span class="anc-vkpi-value">${cnt}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        const clearBtn = document.getElementById('clear-visit-filter-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                visitFilter = null;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        }

        document.querySelectorAll('.anc-visit-kpi-card').forEach(card => {
            card.addEventListener('click', () => {
                const vNum = parseInt(card.getAttribute('data-vnum'));
                if (visitFilter === vNum) {
                    visitFilter = null;
                } else {
                    visitFilter = vNum;
                }
                renderLineList();
                scrollToLinelistOnMobile();
            });
        });
    }




    function calculateAncVisitDate(p, visitIndex, isAttended) {
        if (!isAttended) return '-';
        const vDates = p.v_dates || [];
        const rawDate = vDates[visitIndex];
        if (rawDate && rawDate !== '-' && rawDate !== 'None' && rawDate !== 'nan') {
            return formatDateDDMMYYYY(rawDate);
        }
        return '-';
    }

    // Helper: Calculate Gestational Age (GA) in completed weeks from LMP and authentic Date of ANC visit
    function calculateGestationalAge(p, visitIndex, isAttended) {
        if (!isAttended) return '-';
        if (!p.lmp || p.lmp === '-' || p.lmp === 'N/A') return '-';

        const vDates = p.v_dates || [];
        const rawVisitDate = vDates[visitIndex];
        if (!rawVisitDate || rawVisitDate === '-' || rawVisitDate === 'None' || rawVisitDate === 'nan') {
            return '-';
        }

        const lmpDate = parseDate(p.lmp);
        const visitDate = parseDate(rawVisitDate);
        if (!lmpDate || !visitDate || isNaN(lmpDate.getTime()) || isNaN(visitDate.getTime())) return '-';

        const diffMs = visitDate.getTime() - lmpDate.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return '-';

        const weeks = Math.floor(diffDays / 7);
        return `${weeks} Wks`;
    }

    // Render 12-Visit Attendance Timeline Grid
    function renderAncTimelineGrid(mpid, patient) {
        const timelineEl = document.getElementById(`timeline-${mpid}`);
        if (!timelineEl) return;

        const ancCheck = checkConsecutiveMissedAnc(patient);
        const visitStatus = ancCheck.visitStatus;

        timelineEl.innerHTML = visitStatus.map((v, i) => {
            const visitNum = i + 1;
            const visitDate = calculateAncVisitDate(patient, i, v.attended);
            let chipClass = 'pending';
            let chipValDisplay = 'Pending';

            if (v.attended) {
                chipClass = 'attended';
                const hbVal = v.hb;
                const bpVal = v.bp;
                let hbLine = '';
                let bpLine = '';
                if (hbVal !== undefined && hbVal !== null && !isNaN(hbVal)) {
                    const hbNum = parseFloat(hbVal);
                    const hbColor = hbNum < 7 ? '#dc2626' : hbNum < 11 ? '#f59e0b' : '#10b981';
                    hbLine = `<span style="color:${hbColor}; font-weight:600;">Hb: ${hbVal} g/dL</span>`;
                }
                if (bpVal && bpVal !== '-' && bpVal !== 'None' && bpVal !== 'nan') {
                    bpLine = `<span style="color:#6366f1; font-weight:600;">BP: ${bpVal}</span>`;
                }
                if (hbLine && bpLine) {
                    chipValDisplay = `${hbLine}<br>${bpLine}`;
                } else if (hbLine) {
                    chipValDisplay = hbLine;
                } else if (bpLine) {
                    chipValDisplay = bpLine;
                } else {
                    chipValDisplay = 'Attended';
                }
            } else if (ancCheck.firstAttended !== -1 && i >= ancCheck.firstAttended && i <= ancCheck.lastAttended) {
                chipClass = 'missed';
                chipValDisplay = 'Missed ⚠️';
            }

            const moArr = patient.mo_v || [];
            const albArr = patient.alb_v || [];
            const moRaw = moArr[i];
            const albRaw = albArr[i];

            let providerHtml = '';
            if (v.attended && moRaw && moRaw !== '-' && moRaw !== 'None') {
                const isDoc = isMoDesignation(moRaw);
                const pClass = isDoc ? 'chip-prov-mo' : 'chip-prov-flw';
                const pIcon = isDoc ? '🩺' : '👩‍⚕️';
                const cleanDesig = moRaw.replace(/\s*\(.*?\)/, '').trim();
                providerHtml = `<div class="chip-provider-badge ${pClass}" title="Conducted by: ${moRaw}">${pIcon} ${cleanDesig}</div>`;
            }

            let albHtml = '';
            if (v.attended && albRaw && albRaw !== '-' && albRaw !== 'None' && albRaw !== 'Select' && albRaw !== 'Not Done' && albRaw !== 'Absent') {
                const isHighAlb = isAlbumin2Plus(albRaw);
                const albClass = isHighAlb ? 'chip-alb-high' : 'chip-alb-normal';
                albHtml = `<div class="chip-alb-badge ${albClass}" title="Urine Albumin: ${albRaw}">Alb: ${albRaw}${isHighAlb ? ' ⚠️' : ''}</div>`;
            }

            const dateHtml = (v.attended && visitDate !== '-') ? `<span class="chip-date">${visitDate}</span>` : '';
            const gaWeeks = calculateGestationalAge(patient, i, v.attended);
            const gaDisplay = gaWeeks !== '-' ? `GA: ${gaWeeks}` : '—';
            const gaTitle = gaWeeks !== '-' 
                ? `Gestational Age: ${gaWeeks} (calculated from LMP & Visit Date)` 
                : 'Gestational Age not recorded';

            return `
                <div class="anc-chip ${chipClass}">
                    ${dateHtml}
                    <span class="chip-label">Visit ${visitNum}</span>
                    <span class="chip-val">${chipValDisplay}</span>
                    ${providerHtml}
                    ${albHtml}
                    <div class="chip-ga-box" title="${gaTitle}">${gaDisplay}</div>
                </div>
            `;
        }).join('');
    }

    // Render Hb 12-visit chart with Gaps (connectNulls: false)
    function renderHbSparkline(mpid, patient) {
        const hbArr = patient.hb_v || [];
        
        // Build 12 category series with visit numbers (dates removed from X-axis as requested)
        const categories = Array.from({ length: 12 }, (_, i) => `Visit ${i + 1}`);
        const seriesData = categories.map((cat, i) => {
            const val = hbArr[i];
            return (val !== undefined && val !== null && !isNaN(val)) ? val : null;
        });

        const validHb = seriesData.filter(v => v !== null);
        const statusEl = document.getElementById(`drawer-status-${mpid}`);
        const chartEl = document.getElementById(`chart-${mpid}`);

        if (validHb.length === 0) {
            if (statusEl) statusEl.innerHTML = `<span class="status-badge" style="background:#f1f5f9; color:#475569;">No ANC Hb Data Recorded</span>`;
            if (chartEl) chartEl.innerHTML = `<div style="text-align:center; padding:1.25rem; color:#94a3b8; font-size:12px;">No 12-visit Hemoglobin records found in ANC database for this patient.</div>`;
            return;
        }

        const latestHb = validHb[validHb.length - 1];

        let badgeHtml = '';
        if (latestHb >= 11.0) {
            badgeHtml = `<span class="status-badge badge-resolved">✓ Severe Anemia Resolved (Latest Hb: ${latestHb} g/dL)</span>`;
        } else if (latestHb >= 7.0) {
            badgeHtml = `<span class="status-badge badge-improving">Moderate Anemia (Latest Hb: ${latestHb} g/dL)</span>`;
        } else {
            badgeHtml = `<span class="status-badge badge-persistent">⚠️ Severe Anemia (Latest Hb: ${latestHb} g/dL)</span>`;
        }
        if (statusEl) statusEl.innerHTML = badgeHtml;
        if (!chartEl) return;

        let isSubtitle = '💉 Inj. Iron Sucrose: Not Recorded / Not Given';
        const pointAnnotations = [];
        if (patient.is_doses && patient.is_doses.length > 0) {
            isSubtitle = `💉 Inj. Iron Sucrose: ${patient.is_doses.length} / 5 Dose(s) Administered [marked with ✕ crosses]`;

            const vDates = patient.v_dates || [];
            const validVisits = [];
            for (let i = 0; i < 12; i++) {
                const vdStr = vDates[i];
                if (vdStr && vdStr !== '-' && vdStr !== 'None' && vdStr !== 'nan') {
                    const parsed = parseDate(vdStr);
                    if (parsed && !isNaN(parsed.getTime())) {
                        validVisits.push({ index: i, time: parsed.getTime() });
                    }
                }
            }

            const dosesPerVisit = {};
            const doseMappings = patient.is_doses.map(doseStr => {
                const parsedDose = parseDate(doseStr);
                const doseTime = parsedDose ? parsedDose.getTime() : 0;
                let bestIdx = 0;
                let minDiff = Infinity;
                if (validVisits.length > 0) {
                    validVisits.forEach(v => {
                        const diff = Math.abs(doseTime - v.time);
                        if (diff < minDiff) {
                            minDiff = diff;
                            bestIdx = v.index;
                        }
                    });
                }
                dosesPerVisit[bestIdx] = (dosesPerVisit[bestIdx] || 0) + 1;
                return { doseStr, bestIdx };
            });

            const visitDoseCounter = {};
            doseMappings.forEach(mapping => {
                const idx = mapping.bestIdx;
                const occurrence = visitDoseCounter[idx] || 0;
                visitDoseCounter[idx] = occurrence + 1;
                const totalAtThisVisit = dosesPerVisit[idx];

                const baseHb = seriesData[idx] !== null ? seriesData[idx] : 7.0;
                const yOffset = totalAtThisVisit > 1 ? (occurrence - (totalAtThisVisit + 1) / 2) * 0.45 : 0;
                const ptY = Math.round((baseHb + yOffset) * 100) / 100;

                pointAnnotations.push({
                    x: `Visit ${idx + 1}`,
                    y: ptY,
                    marker: {
                        size: 7,
                        shape: 'cross',
                        fillColor: '#7928ca',
                        strokeColor: '#7928ca',
                        strokeWidth: 3,
                        radius: 2
                    },
                    label: {
                        text: '',
                        borderWidth: 0,
                        style: {
                            color: 'transparent',
                            background: 'transparent'
                        }
                    }
                });
            });
        }

        const chartHeight = window.innerWidth <= 768 ? 150 : 170;
        const options = {
            series: [{ name: 'Hemoglobin (g/dL)', data: seriesData }],
            chart: { type: 'line', height: chartHeight, toolbar: { show: false } },
            subtitle: {
                text: isSubtitle,
                align: 'left',
                style: {
                    fontSize: '11px',
                    color: (patient.is_doses && patient.is_doses.length > 0) ? '#ff2a6d' : '#64748b',
                    fontWeight: 600
                }
            },
            colors: ['#ff2a6d'],
            stroke: { curve: 'smooth', width: 3, connectNulls: false },
            markers: { size: 5, colors: ['#ff2a6d'] },
            xaxis: { categories, labels: { style: { fontSize: '10px' } } },
            yaxis: { min: 4, max: 16, title: { text: 'Hb (g/dL)' } },
            annotations: {
                yaxis: [{
                    y: 11.0,
                    borderColor: '#10b981',
                    label: { borderColor: '#10b981', style: { color: '#fff', background: '#10b981' }, text: 'Normal Cutoff (11.0 g/dL)' }
                }, {
                    y: 7.0,
                    borderColor: '#ff2a6d',
                    label: { borderColor: '#ff2a6d', style: { color: '#fff', background: '#ff2a6d' }, text: 'Severe Cutoff (7.0 g/dL)' }
                }],
                points: pointAnnotations
            }
        };

        chartEl.innerHTML = '';
        const chart = new ApexCharts(chartEl, options);
        chart.render();
    }

    // Render BP 12-visit chart with Gaps (connectNulls: false)
    function renderBpSparkline(mpid, patient) {
        const bpArr = patient.bp_v || [];

        // Build 12 category series with visit numbers (dates removed from X-axis as requested)
        const categories = Array.from({ length: 12 }, (_, i) => `Visit ${i + 1}`);
        const sysData = [];
        const diaData = [];

        for (let i = 0; i < 12; i++) {
            const val = bpArr[i];
            if (val && typeof val === 'string' && val.includes('/')) {
                const parts = val.split('/');
                const sys = parseFloat(parts[0]);
                const dia = parseFloat(parts[1]);
                sysData.push(isNaN(sys) ? null : sys);
                diaData.push(isNaN(dia) ? null : dia);
            } else {
                sysData.push(null);
                diaData.push(null);
            }
        }

        const statusEl = document.getElementById(`drawer-status-${mpid}`);
        const chartEl = document.getElementById(`chart-${mpid}`);

        const validSys = sysData.filter(d => d !== null);
        const validDia = diaData.filter(d => d !== null);

        if (validSys.length === 0) {
            if (statusEl) statusEl.innerHTML = `<span class="status-badge" style="background:#f1f5f9; color:#475569;">No ANC BP Data Recorded</span>`;
            if (chartEl) chartEl.innerHTML = `<div style="text-align:center; padding:1.25rem; color:#94a3b8; font-size:12px;">No 12-visit Blood Pressure records found in ANC database for this patient.</div>`;
            return;
        }

        const latestSys = validSys[validSys.length - 1];
        const latestDia = validDia[validDia.length - 1];

        let badgeHtml = '';
        if (latestSys < 140 && latestDia < 90) {
            badgeHtml = `<span class="status-badge badge-controlled">✓ BP Under Control (${latestSys}/${latestDia} mmHg)</span>`;
        } else {
            badgeHtml = `<span class="status-badge badge-uncontrolled">⚠️ BP Uncontrolled (${latestSys}/${latestDia} mmHg)</span>`;
        }
        if (statusEl) statusEl.innerHTML = badgeHtml;
        if (!chartEl) return;

        const chartHeight = window.innerWidth <= 768 ? 150 : 170;
        const options = {
            series: [
                { name: 'Systolic BP (mmHg)', data: sysData },
                { name: 'Diastolic BP (mmHg)', data: diaData }
            ],
            chart: { type: 'line', height: chartHeight, toolbar: { show: false } },
            colors: ['#ea580c', '#d97706'],
            stroke: { curve: 'smooth', width: 3, connectNulls: false },
            markers: { size: 5 },
            xaxis: { categories },
            yaxis: { min: 50, max: 200, title: { text: 'BP (mmHg)' } },
            annotations: {
                yaxis: [{
                    y: 140,
                    borderColor: '#ea580c',
                    label: { borderColor: '#ea580c', style: { color: '#fff', background: '#ea580c' }, text: 'Systolic Cutoff (140 mmHg)' }
                }, {
                    y: 90,
                    borderColor: '#d97706',
                    label: { borderColor: '#d97706', style: { color: '#fff', background: '#d97706' }, text: 'Diastolic Cutoff (90 mmHg)' }
                }]
            }
        };

        chartEl.innerHTML = '';
        const chart = new ApexCharts(chartEl, options);
        chart.render();
    }

    // Tab Switching Handling
    function setupTabs() {
        const tabCards = document.querySelectorAll('.risk-tab-card');
        const tabTitleEl = document.getElementById(elementIds.tabTitle);

        tabCards.forEach(card => {
            card.addEventListener('click', () => {
                tabCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentTab = card.getAttribute('data-tab');
                const riskSelect = document.getElementById(elementIds.riskFactor);
                if (riskSelect && riskSelect.value !== currentTab) {
                    riskSelect.value = currentTab;
                }
                initializedCharts = {};
                sortState = { col: null, dir: 'asc' };
                kpiFilter = null;
                trimesterFilter = null;
                visitFilter = null;
                currentPage = 1;
                updateSortIcons();

                if (tabTitleEl) tabTitleEl.textContent = `${TAB_NAMES[currentTab]} Line List`;
                renderCounsellingBanner(currentTab);
                renderLineList();
                scrollToLinelistOnMobile();
            });
        });
    }

    // Attach Table Header Sort Event Listeners
    function setupSorting() {
        document.querySelectorAll('#linelist-table th').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-sort');
                if (!col) return;

                if (sortState.col === col) {
                    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortState.col = col;
                    sortState.dir = 'asc';
                }

                updateSortIcons();
                renderLineList();
            });
        });
    }

    // Download Tab / Cohort Excel
    function exportToExcel(tabKey) {
        const key = tabKey || currentTab;
        let exportData = [];

        if (key === 'anc') {
            exportData = getFilteredAncPatients();
        } else if (key === 'all') {
            exportData = getFilteredPatients();
        } else if (key === 'ma') {
            exportData = getFilteredPatients().filter(p => p.ma === 1);
        } else {
            exportData = getFilteredPatients().filter(p => p[key] === 1);
        }

        if (kpiFilter) {
            if (kpiFilter === 'missed_anc') {
                exportData = exportData.filter(p => checkConsecutiveMissedAnc(p).hasMissed);
            } else if (kpiFilter === 'preeclampsia') {
                exportData = exportData.filter(p => hasPreEclampsia(p));
            } else if (kpiFilter === 'mo_pending') {
                exportData = exportData.filter(p => !hasMoVisit(p));
            } else if (kpiFilter === 'uhrp') {
                exportData = exportData.filter(p => p.uhrp === 1 || p.hrp === 1);
            } else if (['sa', 'ma', 'sc', 'anc', 'all'].includes(key)) {
                if (kpiFilter === 'moderate') {
                    exportData = exportData.filter(p => {
                        const status = getPatientClinicalStatus(p, key);
                        return status === 'moderate' || (p.ma === 1 && status !== 'severe' && status !== 'resolved' && status !== 'mild');
                    });
                } else if (kpiFilter === 'severe') {
                    exportData = exportData.filter(p => {
                        const status = getPatientClinicalStatus(p, key);
                        return status === 'severe' || (p.sa === 1 && status !== 'moderate' && status !== 'resolved' && status !== 'mild');
                    });
                } else {
                    exportData = exportData.filter(p => getPatientClinicalStatus(p, key) === kpiFilter);
                }
            } else if (key === 'pi') {
                exportData = exportData.filter(p => getPatientClinicalStatus(p, key) === kpiFilter);
            }
        }

        if (trimesterFilter) {
            exportData = exportData.filter(p => getPatientTrimester(p) === trimesterFilter);
        }

        if (visitFilter !== null) {
            const vIdx = visitFilter - 1;
            exportData = exportData.filter(p => {
                const vd = (p.v_dates || [])[vIdx];
                return vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan';
            });
        }

        const mgmtSelect = document.getElementById(elementIds.mgmtStatus);
        const canFilterMgmt = ['sa', 'ma', 'pi', 'gd'].includes(key);
        if (canFilterMgmt && mgmtSelect && mgmtSelect.value !== 'All') {
            const mgmtVal = mgmtSelect.value;
            if (mgmtVal === 'done') {
                exportData = exportData.filter(p => isManagementDone(p, key));
            } else if (mgmtVal === 'pending') {
                exportData = exportData.filter(p => !isManagementDone(p, key));
            }
        }

        if (exportData.length === 0) {
            alert('No patient records available to export for the selected filters.');
            return;
        }

        const sortedExportData = sortPatients(exportData);

        const rows = sortedExportData.map(p => ({
            'Block': p.b,
            'PHC Facility': p.phc || '',
            'Subcenter': p.sub || '',
            'Village': cleanVillageName(p.v),
            'MP ID': p.id,
            'ANC Name': p.n,
            'Husband Name': p.h,
            'Age': p.a,
            'Mobile Number': p.p,
            'LMP Date': formatDateDDMMYYYY(p.lmp),
            'EDD Date': formatDateDDMMYYYY(p.edd),
            'Date of Delivery': formatDateDDMMYYYY(p.del_date),
            'Place of Delivery': p.d,
            'Delivery Status': p.del === 2 || p.is_abortion === 1 ? 'Abortion' : p.del === 1 ? 'Delivered' : 'Pregnant',
            'Abortion Details': (p.abort_type || p.abort_place) ? `${p.abort_type || ''} ${p.abort_place ? '(' + p.abort_place + ')' : ''}`.trim() : (p.is_abortion === 1 ? 'Yes' : 'No'),
            'Risk Factor': p.f,
            'Hb on LR Admission': (p.lr_hb !== null && p.lr_hb !== undefined) ? p.lr_hb : ((p.hb_lr !== null && p.hb_lr !== undefined) ? p.hb_lr : '-'),
            'BP at Admission': p.bp_adm || '-',
            'MO Checkup Done': hasMoVisit(p) ? 'Yes' : 'No (Pending)',
            'Inj FCM': p.fcm || 'No',
            'FCM Facility': p.fcm_fac || '-',
            'Blood Transfusion': p.bt || 'No',
            'Iron Sucrose Doses': (p.is_doses && p.is_doses.length > 0) ? p.is_doses.join(', ') : 'None',
            'Maternal Death': p.mat || 'No',
            'Neonatal Death': p.nnd || 'No'
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'UHRP Line List');

        const fileName = `UHRP_${key.toUpperCase()}_LineList_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    }

    // Attach Event Listeners
    function setupEventListeners() {
        setupMainViewSwitcher();

        const blockSelect = document.getElementById(elementIds.block);
        if (blockSelect) {
            blockSelect.addEventListener('change', (e) => {
                const blockVal = e.target.value;
                updatePhcDropdown(blockVal);
                const phcVal = document.getElementById(elementIds.phc).value;
                updateSubcenterDropdown(blockVal, phcVal);

                initializedCharts = {};
                currentPage = 1;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        }

        const phcSelect = document.getElementById(elementIds.phc);
        if (phcSelect) {
            phcSelect.addEventListener('change', (e) => {
                const blockVal = document.getElementById(elementIds.block).value;
                const phcVal = e.target.value;
                updateSubcenterDropdown(blockVal, phcVal);

                initializedCharts = {};
                currentPage = 1;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        }

        const riskFactorSelect = document.getElementById(elementIds.riskFactor);
        if (riskFactorSelect) {
            riskFactorSelect.addEventListener('change', (e) => {
                const newTab = e.target.value;
                const tabCard = document.querySelector(`.risk-tab-card[data-tab="${newTab}"]`);
                if (tabCard) {
                    tabCard.click();
                } else {
                    currentTab = newTab;
                    kpiFilter = null;
                    trimesterFilter = null;
                    visitFilter = null;
                    currentPage = 1;
                    const tabTitleEl = document.getElementById(elementIds.tabTitle);
                    if (tabTitleEl) tabTitleEl.textContent = `${TAB_NAMES[currentTab]} Line List`;
                    renderLineList();
                }
                scrollToLinelistOnMobile();
            });
        }

        ['year', 'subcenter', 'delivery', 'mgmtStatus'].forEach(id => {
            const el = document.getElementById(elementIds[id]);
            if (el) el.addEventListener('change', () => {
                initializedCharts = {};
                currentPage = 1;
                renderLineList();
                scrollToLinelistOnMobile();
            });
        });

        const clearBtn = document.getElementById(elementIds.clearFiltersBtn);
        if (clearBtn) {
            clearBtn.addEventListener('click', clearFilters);
        }

        const searchInput = document.getElementById(elementIds.searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                initializedCharts = {};
                currentPage = 1;
                renderLineList();
            });
        }

        // Pagination Controls
        const btnFirst = document.getElementById('btn-page-first');
        const btnPrev = document.getElementById('btn-page-prev');
        const btnNext = document.getElementById('btn-page-next');
        const btnLast = document.getElementById('btn-page-last');
        const pageSizeSelect = document.getElementById('page-size-select');

        if (btnFirst) {
            btnFirst.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage = 1;
                    renderLineList();
                    document.querySelector('.table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderLineList();
                    document.querySelector('.table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                currentPage++;
                renderLineList();
                document.querySelector('.table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (btnLast) {
            btnLast.addEventListener('click', () => {
                currentPage = 999999;
                renderLineList();
                document.querySelector('.table-responsive')?.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                pageSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                currentPage = 1;
                renderLineList();
            });
        }

        const exportSelect = document.getElementById(elementIds.exportSelect);
        if (exportSelect) {
            exportSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    exportToExcel(e.target.value);
                    e.target.selectedIndex = 0;
                }
            });
        }

        const exportTabBtn = document.getElementById(elementIds.exportTabBtn);
        if (exportTabBtn) {
            exportTabBtn.addEventListener('click', () => exportToExcel(currentTab));
        }
    }

    // Deep Link URL Hash Handler (e.g. #analytics, #tab-pi, #open-20202797448)
    function handleInitialHash() {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash === '#analytics') {
            const analyticsBtn = Array.from(document.querySelectorAll('.main-view-btn')).find(b => b.getAttribute('data-view') === 'analytics');
            if (analyticsBtn) analyticsBtn.click();
        } else if (hash.startsWith('#tab-')) {
            let cleanHash = hash.replace('#tab-', '');
            let isCharts = false;
            if (cleanHash.endsWith('-charts')) {
                cleanHash = cleanHash.replace('-charts', '');
                isCharts = true;
            }
            const parts = cleanHash.split('-open-');
            const tabKey = parts[0];
            const mpid = parts[1];
            const tabCard = document.querySelector(`.risk-tab-card[data-tab="${tabKey}"]`);
            if (tabCard) tabCard.click();
            if (isCharts) {
                const analyticsBtn = Array.from(document.querySelectorAll('.main-view-btn')).find(b => b.getAttribute('data-view') === 'analytics');
                if (analyticsBtn) analyticsBtn.click();
            }
            if (mpid) {
                setTimeout(() => {
                    toggleRowDrawer(mpid);
                    const row = document.querySelector(`tr[data-mpid="${mpid}"]`);
                    if (row) row.scrollIntoView();
                }, 300);
            }
        } else if (hash.startsWith('#open-')) {
            const mpid = hash.replace('#open-', '');
            setTimeout(() => {
                toggleRowDrawer(mpid);
                const row = document.querySelector(`tr[data-mpid="${mpid}"]`);
                if (row) row.scrollIntoView();
            }, 300);
        }
    }

    // Initialize App
    const updateBadge = document.getElementById('last-update-badge');
    if (updateBadge && DASHBOARD_DATA.gen_date) {
        updateBadge.textContent = `Last update on ${DASHBOARD_DATA.gen_date}`;
    }

    // Global Modal Handlers for Mobile 3-Button Card Actions
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
                        ${ancCheck.hasMissed ? `⚠️ Missed 2+ ANC Visits${ancCheck.daysSinceLastVisit ? ` (${ancCheck.daysSinceLastVisit}d since last visit)` : ''}` : '✓ Regular Follow-up'}
                    </span>
                </div>
            </div>

            <div id="drawer-status-modal-${p.id}" style="margin-bottom:0.5rem;"></div>

            <div class="anc-timeline-container" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem;">
                <div class="anc-timeline-title" style="font-size:0.78rem; font-weight:800; margin-bottom:0.5rem;">📋 12 ANC Visit Attendance Timeline Tracker</div>
                <div class="anc-timeline-grid" id="timeline-modal-${p.id}"></div>
            </div>

            <div class="chart-wrapper" id="chart-modal-${p.id}" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem; min-height:180px;">
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
        }, 100);
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

        // Management Status Calculation
        const hasAnemiaRisk = (p.sa === 1 || p.ma === 1 || p.sc === 1);
        const hasPihRisk = (p.pi === 1 || !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-'));
        const hasGdmRisk = (p.gd === 1 || p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes');

        const isAnemiaDone = (p.fcm === 'Yes' || (p.bt && p.bt !== 'No' && p.bt !== '-') || (Array.isArray(p.is_doses) && p.is_doses.length > 0));
        const isPihDone = !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-');
        const isGdmDone = (p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes' || p.gdm_mgmt_at === 'Yes');

        const hasAnyMgmt = isAnemiaDone || isPihDone || isGdmDone;
        const needsMgmt = hasAnemiaRisk || hasPihRisk || hasGdmRisk;
        const isMgmtPending = needsMgmt && !hasAnyMgmt;

        bodyEl.innerHTML = `
            <!-- Overall Clinical Management Status Highlight (Green for Done, Red for Pending) -->
            <div style="border-radius:10px; padding:0.65rem 0.85rem; margin-bottom:0.6rem; display:flex; align-items:center; justify-content:space-between; ${hasAnyMgmt ? 'background:#ecfdf5; border:1.5px solid #10b981;' : (isMgmtPending ? 'background:#fef2f2; border:1.5px solid #ef4444;' : 'background:#f8fafc; border:1px solid #cbd5e1;')}">
                <div style="display:flex; align-items:center; gap:0.55rem;">
                    <span style="font-size:1.15rem;">${hasAnyMgmt ? '🟢' : (isMgmtPending ? '🔴' : 'ℹ️')}</span>
                    <div>
                        <div style="font-size:0.82rem; font-weight:800; color:${hasAnyMgmt ? '#047857' : (isMgmtPending ? '#b91c1c' : '#334155')};">
                            ${hasAnyMgmt ? 'Clinical Management: Done / Prescribed' : (isMgmtPending ? 'Clinical Management: Action Pending' : 'Routine Clinical Monitoring')}
                        </div>
                        <div style="font-size:0.72rem; color:${hasAnyMgmt ? '#065f46' : (isMgmtPending ? '#991b1b' : '#64748b')};">
                            ${hasAnyMgmt ? 'Medication / Therapy recorded for identified risk factor' : (isMgmtPending ? 'Pending IV Iron/FCM, Antihypertensive or GDM therapy' : 'No specialized medical therapy indicated')}
                        </div>
                    </div>
                </div>
                <span style="font-size:0.75rem; font-weight:800; padding:0.25rem 0.6rem; border-radius:6px; ${hasAnyMgmt ? 'background:#10b981; color:#ffffff;' : (isMgmtPending ? 'background:#ef4444; color:#ffffff;' : 'background:#94a3b8; color:#ffffff;')}">
                    ${hasAnyMgmt ? '✓ DONE' : (isMgmtPending ? '⚠️ PENDING' : 'ROUTINE')}
                </span>
            </div>

            <!-- Admission Vitals (Visible strictly for Delivered cases only) -->
            ${isDelivered ? `
            <div class="modal-vitals-bar" style="margin-bottom:0.6rem;">
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
            ` : ''}

            <!-- Facility Hierarchy & Delivery Details -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.75rem; font-size:0.8rem; line-height:1.5; margin-bottom:0.6rem;">
                📍 <strong>Hierarchy:</strong> Block: <strong>${p.b}</strong> | PHC: <strong>${p.phc || 'Unknown'}</strong> | SC: <strong>${p.sub || 'Unknown'}</strong> | Village: <strong>${cleanV}</strong><br>
                ${isDelivered ? `🏥 <strong>Delivery Facility:</strong> <strong style="color:#059669;">${p.d || '-'}</strong> (${p.del_cat || 'Facility'}) ${p.del_date && p.del_date !== '-' ? `on <strong>${formatDateDDMMYYYY(p.del_date)}</strong>` : ''}` : `🤰 <strong>Delivery Status:</strong> <span style="color:#0284c7; font-weight:700;">Pregnant (Antenatal Care)</span>`}
            </div>

            <!-- Risk Factor Banner -->
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:0.6rem 0.8rem; font-size:0.8rem; margin-bottom:0.6rem;">
                <strong style="color:#991b1b;">⚠️ Identified Risk Factor(s):</strong> <span style="font-weight:700; color:#b91c1c;">${p.f || 'High Risk Pregnancy'}</span>
            </div>

            <!-- Anemia Management Details (Green highlight if done, Red if pending) -->
            ${hasAnemiaRisk ? `
                <div style="background:${isAnemiaDone ? '#ecfdf5' : '#fef2f2'}; border:1.5px solid ${isAnemiaDone ? '#10b981' : '#ef4444'}; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:${isAnemiaDone ? '#047857' : '#b91c1c'}; text-transform:uppercase;">💉 Anemia Clinical Management</div>
                        <span style="background:${isAnemiaDone ? '#10b981' : '#ef4444'}; color:#ffffff; font-size:0.7rem; font-weight:800; padding:0.15rem 0.45rem; border-radius:5px;">
                            ${isAnemiaDone ? '✓ Management Done' : '⚠️ Management Pending'}
                        </span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem; color:${isAnemiaDone ? '#065f46' : '#7f1d1d'};">
                        <div>Inj. FCM: <strong>${p.fcm === 'Yes' ? `✓ Given ${p.fcm_fac ? `(${p.fcm_fac})` : ''}` : '✕ Not Given'}</strong></div>
                        <div>Blood Transfusion: <strong>${p.bt || 'No'}</strong></div>
                        <div style="grid-column:1/-1;">Iron Sucrose Doses: <strong>${(p.is_doses && p.is_doses.length > 0) ? p.is_doses.join(', ') : 'None'}</strong></div>
                    </div>
                </div>
            ` : `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="font-size:0.8rem; font-weight:800; color:#0f172a; margin-bottom:0.5rem; text-transform:uppercase;">💉 Anemia Clinical Management</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.8rem;">
                        <div>Inj. FCM: <strong>${p.fcm === 'Yes' ? `✓ Given ${p.fcm_fac ? `(${p.fcm_fac})` : ''}` : '✕ Not Given'}</strong></div>
                        <div>Blood Transfusion: <strong>${p.bt || 'No'}</strong></div>
                        <div style="grid-column:1/-1;">Iron Sucrose Doses: <strong>${(p.is_doses && p.is_doses.length > 0) ? p.is_doses.join(', ') : 'None'}</strong></div>
                    </div>
                </div>
            `}

            <!-- PIH Medications (Green highlight if prescribed, Red if pending) -->
            ${hasPihRisk ? `
                <div style="background:${isPihDone ? '#ecfdf5' : '#fef2f2'}; border:1.5px solid ${isPihDone ? '#10b981' : '#ef4444'}; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.4rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:${isPihDone ? '#047857' : '#b91c1c'};">🟠 PIH Hypertension Treatment:</div>
                        <span style="background:${isPihDone ? '#10b981' : '#ef4444'}; color:#ffffff; font-size:0.7rem; font-weight:800; padding:0.15rem 0.45rem; border-radius:5px;">
                            ${isPihDone ? '✓ Prescribed' : '⚠️ Treatment Pending'}
                        </span>
                    </div>
                    <div style="font-size:0.825rem; font-weight:700; color:${isPihDone ? '#065f46' : '#991b1b'};">
                        ${isPihDone ? `✓ ${p.pih_mgmt}` : '✕ Anti-hypertensive treatment not recorded / Schedule Doctor Exam'}
                    </div>
                </div>
            ` : (p.pih_mgmt ? `
                <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="font-size:0.8rem; font-weight:800; color:#047857; margin-bottom:0.4rem;">🟠 PIH Hypertension Treatment:</div>
                    <div style="font-size:0.825rem; font-weight:700; color:#065f46;">✓ ${p.pih_mgmt}</div>
                </div>` : '')}

            <!-- GDM Management (Green highlight if prescribed, Red if pending) -->
            ${hasGdmRisk ? `
                <div style="background:${isGdmDone ? '#ecfdf5' : '#fef2f2'}; border:1.5px solid ${isGdmDone ? '#10b981' : '#ef4444'}; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.4rem;">
                        <div style="font-size:0.8rem; font-weight:800; color:${isGdmDone ? '#047857' : '#b91c1c'};">🔵 GDM Diabetes Management:</div>
                        <span style="background:${isGdmDone ? '#10b981' : '#ef4444'}; color:#ffffff; font-size:0.7rem; font-weight:800; padding:0.15rem 0.45rem; border-radius:5px;">
                            ${isGdmDone ? '✓ Active Therapy' : '⚠️ Therapy Pending'}
                        </span>
                    </div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem; font-size:0.78rem; color:${isGdmDone ? '#065f46' : '#7f1d1d'};">
                        <div>MNT: <strong>${p.gdm_mnt === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                        <div>Metformin: <strong>${p.gdm_met === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                        <div>Insulin: <strong>${p.gdm_ins === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    </div>
                </div>
            ` : ((p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes') ? `
                <div style="background:#f0f9ff; border:1px solid #e0f2fe; border-radius:12px; padding:0.85rem; margin-bottom:0.6rem;">
                    <div style="font-size:0.8rem; font-weight:800; color:#0369a1; margin-bottom:0.4rem;">🔵 GDM Diabetes Management:</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem; font-size:0.78rem;">
                        <div>MNT: <strong>${p.gdm_mnt === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                        <div>Metformin: <strong>${p.gdm_met === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                        <div>Insulin: <strong>${p.gdm_ins === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    </div>
                </div>` : '')}
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
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            renderLineList();
        }, 200);
    });

    setupDropdowns();
    setupTabs();
    setupSorting();
    setupEventListeners();
    renderLineList();
    handleInitialHash();
});
