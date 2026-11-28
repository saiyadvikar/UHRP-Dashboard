/* Ultra High Risk Pregnancy Care Dashboard JavaScript */

// Safety fallback to ensure loader never blocks user interface if an unexpected error occurs
setTimeout(() => {
    const loader = document.getElementById('uhrp-app-loader');
    if (loader && !loader.classList.contains('loader-hidden')) {
        loader.classList.add('loader-hidden');
        setTimeout(() => { loader.style.display = 'none'; }, 460);
    }
}, 10000);

document.addEventListener('DOMContentLoaded', () => {
    if (typeof DASHBOARD_DATA === 'undefined') {
        console.error('DASHBOARD_DATA is missing!');
        const statusEl = document.getElementById('uhrp-loader-status');
        if (statusEl) statusEl.textContent = '⚠️ Dataset loading delayed or unavailable. Please refresh.';
        setTimeout(() => {
            const loader = document.getElementById('uhrp-app-loader');
            if (loader) loader.classList.add('loader-hidden');
        }, 2500);
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

    // Chart Instances for Section 2 (Charts View)
    let monthlyTrendChartInstance = null;
    let deliveryChart2026Instance = null;
    let deliveryChart2025Instance = null;
    let deliveryTypeChart2025Instance = null;
    let deliveryTypeChart2026Instance = null;
    let currentDeliveryGaFilter = 'all'; // 'all', 'preterm', 'lateterm'

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
            title: "📋 संपूर्ण प्रसव पूर्व देखभाल (Comprehensive Good ANC Care) दिशानिर्देश",
            points: [
                "💊 औषधियां एवं सप्लीमेंट्स: 14 सप्ताह से 180 दिन प्रतिदिन 1 IFA गोली, प्रतिदिन 2 कैल्शियम गोलियां (1000mg) प्रसव उपरांत 6 माह तक, द्वितीय तिमाही में Albendazole 400mg व Td-1/Td-2 टीकाकरण।",
                "🔬 अनिवार्य जांचें: प्रत्येक विजिट पर Hb, BP, वजन, मूत्र एल्बुमिन/शुगर; प्रथम तिमाही में Blood Group, HIV, VDRL, HBsAg, 24-28 सप्ताह में OGTT 75g तथा 11-14 सप्ताह व 18-20 सप्ताह में अनिवार्य USG सोनोग्राफी।",
                "🥗 संतुलित पोषण: अतिरिक्त 350-400 kcal ऊर्जा व प्रोटीन (दालें, अंडे, दूध, पनीर, अंकुरित अनाज, मोटे अनाज), सहजन, पालक, गुड़, चना, आंवला/नींबू; प्रतिदिन 8-10 गिलास पानी पिएं।",
                "🗣️ प्रसव पूर्व तैयारी व खतरे के संकेत: न्यूनतम 4 ANC जांच, बर्थ प्लानिंग (अस्पताल चयन, 108 एम्बुलेंस, 2 रक्तदाता), बाईं करवट विश्राम; रक्तस्राव/तेज सिरदर्द/सूजन पर तत्काल 108 से अस्पताल जाएं।"
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

    // Helper: Strip numerical census / postal codes from Urban Area PHC facilities (e.g. -250910)
    function cleanPhcName(name) {
        if (!name) return '';
        return name.replace(/\s*-\s*\d+$/g, '').replace(/\s*\(\d+\)$/g, '').trim();
    }

    // Helper: Debounce function execution
    function debounce(fn, delay = 250) {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    // Main View Navigation Handler
    function switchMainView(viewName, skipSave) {
        const btns = document.querySelectorAll('.main-view-btn');
        const viewLinelist = document.getElementById('view-linelist');
        const viewAnalytics = document.getElementById('view-analytics');
        const viewProtocols = document.getElementById('view-protocols');
        const viewDpmu = document.getElementById('view-dpmu');
        const viewSankalp = document.getElementById('view-sankalp');

        btns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-view') === viewName);
        });

        currentMainView = viewName;
        if (currentMainView === 'linelist') {
            if (viewLinelist) viewLinelist.style.display = 'block';
            if (viewAnalytics) viewAnalytics.style.display = 'none';
            if (viewProtocols) viewProtocols.style.display = 'none';
            if (viewDpmu) viewDpmu.style.display = 'none';
            if (viewSankalp) viewSankalp.style.display = 'none';
        } else if (currentMainView === 'analytics') {
            if (viewLinelist) viewLinelist.style.display = 'none';
            if (viewAnalytics) viewAnalytics.style.display = 'block';
            if (viewProtocols) viewProtocols.style.display = 'none';
            if (viewDpmu) viewDpmu.style.display = 'none';
            if (viewSankalp) viewSankalp.style.display = 'none';
            const filtered = getFilteredPatients();
            let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
            setTimeout(() => renderAnalyticsCharts(tabPatients), 30);
        } else if (currentMainView === 'protocols') {
            if (viewLinelist) viewLinelist.style.display = 'none';
            if (viewAnalytics) viewAnalytics.style.display = 'none';
            if (viewProtocols) viewProtocols.style.display = 'block';
            if (viewDpmu) viewDpmu.style.display = 'none';
            if (viewSankalp) viewSankalp.style.display = 'none';
            filterProtocolCards(currentTab);
        } else if (currentMainView === 'dpmu') {
            if (viewLinelist) viewLinelist.style.display = 'none';
            if (viewAnalytics) viewAnalytics.style.display = 'none';
            if (viewProtocols) viewProtocols.style.display = 'none';
            if (viewDpmu) viewDpmu.style.display = 'block';
            if (viewSankalp) viewSankalp.style.display = 'none';
            setTimeout(() => renderDpmuOfficialTables(), 30);
        } else if (currentMainView === 'sankalp') {
            if (viewLinelist) viewLinelist.style.display = 'none';
            if (viewAnalytics) viewAnalytics.style.display = 'none';
            if (viewProtocols) viewProtocols.style.display = 'none';
            if (viewDpmu) viewDpmu.style.display = 'none';
            if (viewSankalp) viewSankalp.style.display = 'block';
            setTimeout(() => renderSankalpTable(), 30);
        }
        if (!skipSave) saveDashboardState();
    }

    function setupMainViewSwitcher() {
        const btns = document.querySelectorAll('.main-view-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-view');
                switchMainView(targetView);
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
    function updatePhcDropdown(selectedBlock, targetPhc) {
        const phcSelect = document.getElementById(elementIds.phc);
        if (!phcSelect) return;
        const currentPhcVal = targetPhc !== undefined ? targetPhc : phcSelect.value;

        let phcs = new Set();
        if (selectedBlock === 'All') {
            Object.values(blockToPhcMap).forEach(set => set.forEach(p => phcs.add(p)));
        } else {
            phcs = blockToPhcMap[selectedBlock] || new Set();
        }

        const sortedPhcs = Array.from(phcs).sort();
        phcSelect.innerHTML = '<option value="All">All PHCs</option>' + 
            sortedPhcs.map(p => `<option value="${p}">${cleanPhcName(p)}</option>`).join('');

        if (sortedPhcs.includes(currentPhcVal)) {
            phcSelect.value = currentPhcVal;
        } else {
            phcSelect.value = 'All';
        }
    }

    // Populate Subcenter Filter
    function updateSubcenterDropdown(selectedBlock, selectedPhc, targetSub) {
        const subSelect = document.getElementById(elementIds.subcenter);
        if (!subSelect) return;
        const currentSubVal = targetSub !== undefined ? targetSub : subSelect.value;

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
        const blockSelect = document.getElementById(elementIds.block);
        if (blockSelect) blockSelect.value = 'All';

        const delSelect = document.getElementById(elementIds.delivery);
        if (delSelect) delSelect.value = '0'; // Default to Pregnant

        const searchInput = document.getElementById(elementIds.searchInput);
        if (searchInput) searchInput.value = '';

        const mgmtSelect = document.getElementById(elementIds.mgmtStatus);
        if (mgmtSelect) mgmtSelect.value = 'All';

        // Rebuild cascading hierarchy options and reset them to 'All'
        updatePhcDropdown('All');
        const phcSelect = document.getElementById(elementIds.phc);
        if (phcSelect) phcSelect.value = 'All';

        updateSubcenterDropdown('All', 'All');
        const subSelect = document.getElementById(elementIds.subcenter);
        if (subSelect) subSelect.value = 'All';

        // Clear active KPI, Trimester, Visit and Sort states
        sortState = { col: null, dir: 'asc' };
        kpiFilter = null;
        trimesterFilter = null;
        visitFilter = null;
        currentPage = 1;
        updateSortIcons();

        // Reset Delivery Place GA Filter
        currentDeliveryGaFilter = 'all';
        const gaBtns = document.querySelectorAll('.delivery-ga-btn');
        gaBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-ga') === 'all');
        });

        initializedCharts = {};
        try {
            sessionStorage.removeItem(DASHBOARD_STATE_KEY);
            localStorage.removeItem('uhrp_dashboard_state');
            localStorage.removeItem(DASHBOARD_STATE_KEY);
            if (window.location.hash && window.location.hash.includes('=')) {
                history.replaceState(null, '', window.location.pathname);
            }
        } catch (e) {}
        saveDashboardState();
        renderLineList();
        renderDpmuOfficialTables();
        if (typeof renderSankalpTable === 'function') renderSankalpTable();
        scrollToLinelistOnMobile();
    }

    // Global Maternal Death Determination
    function isMaternalDeath(p) {
        if (!p) return false;
        return (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);
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
            if (blockVal !== 'All' && (p.b || '').toLowerCase() !== blockVal.toLowerCase()) return false;
            if (phcVal !== 'All' && (p.phc || '').toLowerCase() !== phcVal.toLowerCase()) return false;
            if (subVal !== 'All' && (p.sub || '').toLowerCase() !== subVal.toLowerCase()) return false;
            if (delVal !== 'All') {
                const isDead = isMaternalDeath(p);
                if (delVal === 'death') {
                    if (!isDead) return false;
                } else if (isDead) {
                    // Maternal death cases must NEVER appear in pregnant, delivered, or abortion filters
                    return false;
                } else if (delVal === 'abortion') {
                    if (p.del !== 2 && p.is_abortion !== 1) return false;
                } else if (delVal === '0') {
                    // Pregnant strictly requires p.del === 0 AND not abortion AND alive
                    if (p.del !== 0 || p.del === 2 || p.is_abortion === 1) return false;
                } else if (delVal === '1') {
                    // Delivered strictly requires p.del === 1 AND alive
                    if (p.del !== 1) return false;
                } else {
                    if (String(p.del) !== delVal) return false;
                }
            }

            if (searchVal) {
                const cleanV = cleanVillageName(p.v);
                const matchStr = `${p.id} ${p.n} ${p.h} ${p.p} ${cleanV} ${p.b} ${p.anm_n || ''} ${p.anm_p || ''} ${p.cho_n || ''} ${p.cho_p || ''}`.toLowerCase();
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
                const isDead = isMaternalDeath(p);
                if (delVal === 'death') {
                    if (!isDead) return false;
                } else if (isDead) {
                    // Maternal death cases must NEVER appear in pregnant, delivered, or abortion filters
                    return false;
                } else if (delVal === 'abortion') {
                    if (p.del !== 2 && p.is_abortion !== 1) return false;
                } else if (delVal === '0') {
                    // Pregnant strictly requires p.del === 0 AND not abortion AND alive
                    if (p.del !== 0 || p.del === 2 || p.is_abortion === 1) return false;
                } else if (delVal === '1') {
                    // Delivered strictly requires p.del === 1 AND alive
                    if (p.del !== 1) return false;
                } else {
                    if (String(p.del) !== delVal) return false;
                }
            }

            if (searchVal) {
                const cleanV = cleanVillageName(p.v);
                const matchStr = `${p.id} ${p.n} ${p.h} ${p.p} ${cleanV} ${p.b} ${p.anm_n || ''} ${p.anm_p || ''} ${p.cho_n || ''} ${p.cho_p || ''}`.toLowerCase();
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
        if (totalAncCountEl) totalAncCountEl.textContent = totalAncCount.toLocaleString();

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
        if (totalUhrpEl) totalUhrpEl.textContent = counts.all.toLocaleString();
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

    // Filter Protocol & Counseling Cards to show only the selected Main KPI risk factor
    function filterProtocolCards(tabKey) {
        const cards = document.querySelectorAll('#view-protocols .protocol-card');
        const subtitle = document.getElementById('protocols-subtitle');
        if (!cards.length) return;

        const key = (tabKey || currentTab || 'all').toLowerCase();
        if (key === 'anc') {
            cards.forEach(c => {
                c.style.display = c.classList.contains('anc-border') ? '' : 'none';
            });
            if (subtitle) {
                subtitle.textContent = 'Active Clinical Protocol & Counseling: Comprehensive Good ANC Care (All Registered Pregnancies)';
            }
        } else if (key === 'all') {
            cards.forEach(c => c.style.display = '');
            if (subtitle) {
                subtitle.textContent = 'Active Protocols & Counseling: All High Risk Factors & Comprehensive Care';
            }
        } else {
            cards.forEach(c => {
                if (c.classList.contains(`${key}-border`)) {
                    c.style.display = '';
                } else {
                    c.style.display = 'none';
                }
            });
            const tabName = TAB_NAMES[key] || key.toUpperCase();
            if (subtitle) {
                subtitle.textContent = `Active Clinical Protocol & Counseling: ${tabName}`;
            }
        }
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
        if (s === 'mo' || s === 'lmo' || s === 'pgmo' || s === 'doctor' || s === 'gynecologist') return true;
        return (s.includes('medical officer') || s.includes('gynecologist') || s.includes('doctor') || s.startsWith('mo') || s.includes('lmo') || s.includes('pgmo') || s.includes('specialist') || s.includes('mbbs'));
    }

    // Check if at least 1 ANC visit was conducted by a Medical Officer / Gynecologist / LMO
    function hasMoVisit(p) {
        if (!p) return false;
        if (p.mo_done === 1) return true;
        const moArr = p.mo_v || [];
        return moArr.some(v => isMoDesignation(v));
    }

    // Check if Clinical Management has been done for a condition (Canonical Module)
    function isManagementDone(p, condition) {
        if (!condition) condition = currentTab;
        if (condition === 'all') {
            const hasClinicalCondition = (p.sa === 1 || p.ma === 1 || p.pi === 1 || p.gd === 1 || p.sc === 1);
            if (!hasClinicalCondition) return true; // not pending clinical management if no treatable condition
            if (p.sa === 1 && !isManagementDone(p, 'sa')) return false;
            if (p.ma === 1 && !isManagementDone(p, 'ma')) return false;
            if (p.pi === 1 && !isManagementDone(p, 'pi')) return false;
            if (p.gd === 1 && !isManagementDone(p, 'gd')) return false;
            if (p.sc === 1 && !isManagementDone(p, 'sc')) return false;
            return true;
        }
        if (condition === 'sa' || condition === 'sc' || condition === 'ma') {
            const hasDoses = Array.isArray(p.is_doses) && p.is_doses.length >= 3;
            const hasFcm = p.fcm === 'Yes';
            const hasBt = p.bt && p.bt !== 'No' && p.bt !== '-';
            return hasDoses || hasFcm || hasBt;
        } else if (condition === 'pi') {
            const m = String(p.pih_mgmt || '').trim().toLowerCase();
            return !!(m && m !== 'no' && m !== 'none' && m !== '-' && m !== 'nan');
        } else if (condition === 'gd') {
            return (p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes' || p.gdm_mgmt_at === 'Yes');
        }
        return false;
    }

    const isSaManaged = (p) => isManagementDone(p, 'sa');
    const isMaManaged = (p) => isManagementDone(p, 'ma');
    const isPiManaged = (p) => isManagementDone(p, 'pi');

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

        // Mobile View (<= 768px): Render customized actionable clinical sub-KPI cards according to Main KPI filter
        if (window.innerWidth <= 768) {
            let overdueCount = 0;
            tabPatients.forEach(p => {
                if (isEddOverdue(p)) overdueCount++;
            });

            if (currentTab === 'anc') {
                // 1. ANC Tab: Total Registered, High Risk, Delivery Overdue, Missed 2+ ANC, Not Seen by MO (5 cards)
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
                        <div class="kpi-card clickable overdue-kpi ${kpiFilter === 'overdue' ? 'active-kpi-filter' : ''}" data-kpi="overdue" title="Click to filter mothers whose EDD has passed but delivery is not recorded">
                            <span class="kpi-title">⏳ Delivery Overdue</span>
                            <span class="kpi-value">${overdueCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Past EDD • Del Pending</span>
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
            } else if (currentTab === 'all') {
                // 2. Total UHRP Cohort: Total UHRP Cohort, Management Pending, Missed 2+ ANC, Not Seen by MO (4 cards)
                let pendingMgmtCount = 0;
                tabPatients.forEach(p => {
                    if (!isManagementDone(p, 'all')) {
                        pendingMgmtCount++;
                    }
                });

                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === 'all' || kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all UHRP cohort cases">
                            <span class="kpi-title">📋 Total UHRP Cohort</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All High Risk Cases</span>
                        </div>
                        <div class="kpi-card clickable pending-mgmt-kpi ${kpiFilter === 'pending_mgmt' ? 'active-kpi-filter' : ''}" data-kpi="pending_mgmt" title="Click to filter cases where clinical management is pending">
                            <span class="kpi-title">⚠️ Management Pending</span>
                            <span class="kpi-value">${pendingMgmtCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Rx / Meds Needed</span>
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
            } else if (['sa', 'ma', 'pi', 'gd'].includes(currentTab)) {
                // 3. Clinical Management Tabs (sa, ma, pi, gd): Total Registered, Management Pending, Missed 2+ ANC, Not Seen by MO (4 cards)
                let pendingMgmtCount = 0;
                tabPatients.forEach(p => {
                    if (!isManagementDone(p, currentTab)) {
                        pendingMgmtCount++;
                    }
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
                        <div class="kpi-card clickable pending-mgmt-kpi ${kpiFilter === 'pending_mgmt' ? 'active-kpi-filter' : ''}" data-kpi="pending_mgmt" title="Click to filter cases where clinical management is pending (FCM / Iron Sucrose / BP meds / GDM therapy)">
                            <span class="kpi-title">⚠️ Management Pending</span>
                            <span class="kpi-value">${pendingMgmtCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Rx / Meds Needed</span>
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
                // 4. Other Risk Tabs (ls, sc, tp, bh): Total Registered, Delivery Overdue, Missed 2+ ANC, Not Seen by MO (4 cards)
                kpiContainer.style.display = 'block';
                kpiContainer.innerHTML = `
                    ${activeKpiInfo}
                    <div class="kpi-cards-grid">
                        <div class="kpi-card clickable ${kpiFilter === 'all' || kpiFilter === null ? 'active-kpi-filter' : ''}" data-kpi="all" title="View all registered cases in this risk cohort">
                            <span class="kpi-title">📋 Total Registered</span>
                            <span class="kpi-value">${tabPatients.length.toLocaleString()}</span>
                            <span class="kpi-subtext">All Active Cases</span>
                        </div>
                        <div class="kpi-card clickable overdue-kpi ${kpiFilter === 'overdue' ? 'active-kpi-filter' : ''}" data-kpi="overdue" title="Click to filter mothers whose EDD has passed but delivery is not recorded">
                            <span class="kpi-title">⏳ Delivery Overdue</span>
                            <span class="kpi-value">${overdueCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Past EDD • Del Pending</span>
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
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb resolved to normal (≥ 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (≥ 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Normal Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Hb 7.0 - 9.9 g/dL</span>
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
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb resolved to normal (≥ 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (≥ 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Normal Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL / Col AG)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Hb 7.0 - 9.9 g/dL</span>
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
                let overdueCount = 0;
                tabPatients.forEach(p => {
                    if (p.uhrp === 1 || p.hrp === 1) uhrpCount++;
                    if (isEddOverdue(p)) overdueCount++;
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
                        <div class="kpi-card clickable overdue ${kpiFilter === 'overdue' ? 'active-kpi-filter' : ''}" data-kpi="overdue" title="Delivery Overdue: EDD has passed but delivery is not recorded">
                            <span class="kpi-title">⏳ Delivery Overdue</span>
                            <span class="kpi-value">${overdueCount.toLocaleString()}</span>
                            <span class="kpi-subtext">Past EDD • Del Pending</span>
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
                        <div class="kpi-card clickable resolved ${kpiFilter === 'resolved' ? 'active-kpi-filter' : ''}" data-kpi="resolved" title="Hb normal (≥ 11.0 g/dL)">
                            <span class="kpi-title">✓ Resolved (≥ 11.0)</span>
                            <span class="kpi-value">${resolved.toLocaleString()}</span>
                            <span class="kpi-subtext">Stable Hemoglobin</span>
                        </div>
                        <div class="kpi-card clickable mild ${kpiFilter === 'mild' ? 'active-kpi-filter' : ''}" data-kpi="mild" title="Mild Anemia (Hb 10.0 - 10.9 g/dL)">
                            <span class="kpi-title">Mild (10.0 - 10.9)</span>
                            <span class="kpi-value">${mild.toLocaleString()}</span>
                            <span class="kpi-subtext">Mild Anemia</span>
                        </div>
                        <div class="kpi-card clickable improving ${kpiFilter === 'moderate' ? 'active-kpi-filter' : ''}" data-kpi="moderate" title="Moderate Anemia (Hb 7.0 - 9.9 g/dL)">
                            <span class="kpi-title">Moderate (7.0 - 9.9)</span>
                            <span class="kpi-value">${moderate.toLocaleString()}</span>
                            <span class="kpi-subtext">Moderate Anemia</span>
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
            });
        }

        document.querySelectorAll('.kpi-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const targetKpi = card.getAttribute('data-kpi');
                if (targetKpi === 'all' || kpiFilter === targetKpi) {
                    kpiFilter = null;
                    facilitySortCol = 'totalReg';
                    facilitySortAsc = false;
                } else {
                    kpiFilter = targetKpi;
                    if (targetKpi === 'missed_anc') {
                        facilitySortCol = 'missedAnc';
                    } else if (targetKpi === 'overdue') {
                        facilitySortCol = 'deliveryOverdue';
                    } else if (targetKpi === 'pending_mgmt' || targetKpi === 'mo_pending') {
                        facilitySortCol = 'mgmtPending';
                    } else {
                        facilitySortCol = 'totalReg';
                    }
                    facilitySortAsc = false;
                }
                renderLineList();
                renderDpmuOfficialTables();
                if (currentMainView === 'analytics') {
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                }
            });
        });
    }

    // Check if EDD is overdue (Strictly excludes delivered, maternal deaths, and abortions)
    function isEddOverdue(pOrEdd, delDateStr, isDelivered, pObj) {
        let p = pObj;
        let eddDateStr = pOrEdd;
        if (typeof pOrEdd === 'object' && pOrEdd !== null) {
            p = pOrEdd;
            eddDateStr = p.edd;
            delDateStr = p.del_date;
            isDelivered = p.del;
        }

        // Exclude delivered cases
        if (isDelivered === 1 || (delDateStr && delDateStr !== '-')) return false;

        // Exclude maternal death and abortion cases
        if (p) {
            const isMaternalDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);
            const isAbortion = (p.del === 2 || p.is_abortion === 1);
            if (isMaternalDeath || isAbortion) return false;
        }

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

    // Categorize delivery facility name into standard tiers
    function categorizeDeliveryName(facName) {
        if (!facName) return 'Other Facility';
        const s = String(facName).toLowerCase().trim();
        if (s.includes('home')) return 'Home';
        if (s.includes('transit') || s.includes('way')) return 'in transit';
        if (s.includes('private') || s.includes('pvt')) return 'Private hospitals';
        if (s.includes('medical college') || s.includes('my hospital') || s.startsWith('my ')) return 'Medical College';
        if (s.includes('district hospital') || s.includes('dh ') || s.startsWith('dh') || s.includes(' dh')) return 'DH';
        if (s.includes('civil hospital') || s.includes('ch ') || s.startsWith('ch ') || s.includes(' ch')) return 'CH';
        if (s.includes('community health') || s.includes('chc') || s.startsWith('chc')) return 'CHC';
        if (s.includes('primary health') || s.includes('phc') || s.startsWith('phc') || s.includes('shc') || s.includes('urban')) return 'PHC';
        return 'Other Facility';
    }

    const deliveryColorMap = {
        'DH': '#10b981',
        'CHC': '#00b4d8',
        'PHC': '#7928ca',
        'CH': '#0284c7',
        'Medical College': '#2563eb',
        'Private hospitals': '#f77f00',
        'Home': '#ff2a6d',
        'in transit': '#db2777',
        'Other Facility': '#64748b'
    };

    // Render a single financial year's delivery place donut chart
    function renderSingleDeliveryDonut(fy, cases, toolbarConfig) {
        const chartElId = `chart-delivery-${fy}`;
        const chartEl = document.getElementById(chartElId);
        if (!chartEl) return;

        if (fy === '2026-27' && deliveryChart2026Instance) {
            deliveryChart2026Instance.destroy();
            deliveryChart2026Instance = null;
        } else if (fy === '2025-26' && deliveryChart2025Instance) {
            deliveryChart2025Instance.destroy();
            deliveryChart2025Instance = null;
        }

        chartEl.innerHTML = '';

        if (!cases || cases.length === 0) {
            chartEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:280px;color:#64748b;font-size:12.5px;font-weight:600;">No delivery records for this selection (0 deliveries)</div>`;
            return;
        }

        const catOrder = ['DH', 'CHC', 'PHC', 'CH', 'Medical College', 'Private hospitals', 'Home', 'in transit', 'Other Facility'];
        const delCounts = {};

        cases.forEach(p => {
            let cat = p.del_cat;
            if (!cat || cat === 'Public Facility' || cat === 'Facility') {
                cat = categorizeDeliveryName(p.d);
            }
            delCounts[cat] = (delCounts[cat] || 0) + 1;
        });

        const presentCats = catOrder.filter(c => (delCounts[c] || 0) > 0);
        Object.keys(delCounts).forEach(c => {
            if (!presentCats.includes(c) && delCounts[c] > 0) {
                presentCats.push(c);
            }
        });

        const delCategories = presentCats;
        const delSeries = delCategories.map(d => delCounts[d]);
        const chartColors = delCategories.map(c => deliveryColorMap[c] || '#64748b');

        const options = {
            series: delSeries,
            labels: delCategories,
            chart: {
                type: 'donut',
                height: 290,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                toolbar: toolbarConfig || { show: true },
                background: 'transparent',
                animations: { enabled: true, easing: 'easeinout', speed: 400 }
            },
            theme: { mode: 'light' },
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            name: { fontSize: '12px', fontWeight: 600, color: '#64748b' },
                            value: { fontSize: '17px', fontWeight: 800, color: '#0f172a' },
                            total: {
                                show: true,
                                label: 'Total',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#64748b',
                                formatter: function(w) {
                                    return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
                                }
                            }
                        }
                    }
                }
            },
            colors: chartColors,
            dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 'bold' } },
            legend: {
                position: 'bottom',
                fontSize: '11px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                labels: { colors: '#334155' },
                markers: { radius: 12, width: 8, height: 8 },
                onItemHover: { highlightDataSeries: true }
            },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: function(val) {
                        const total = delSeries.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                        return `${val.toLocaleString()} (${pct}%)`;
                    }
                }
            }
        };

        const chartInstance = new ApexCharts(chartEl, options);
        chartInstance.render();

        if (fy === '2026-27') deliveryChart2026Instance = chartInstance;
        else deliveryChart2025Instance = chartInstance;
    }

    // Render Delivery Place Distribution Charts (Side-by-Side YoY)
    function renderDeliveryPlaceChart(patients, toolbarConfig) {
        const blockVal = document.getElementById(elementIds.block)?.value || 'All';
        const phcVal = document.getElementById(elementIds.phc)?.value || 'All';
        const subVal = document.getElementById(elementIds.subcenter)?.value || 'All';

        const rawPool = currentTab === 'anc' ? (DASHBOARD_DATA.anc_patients || []) : (DASHBOARD_DATA.patients || []);

        function getDeliveredCasesForFY(fy) {
            let cases = rawPool.filter(p => {
                if (p.del !== 1) return false;
                if (p.y !== fy) return false;
                if (blockVal !== 'All' && (p.b || '').toLowerCase() !== blockVal.toLowerCase()) return false;
                if (phcVal !== 'All' && (p.phc || '').toLowerCase() !== phcVal.toLowerCase()) return false;
                if (subVal !== 'All' && (p.sub || '').toLowerCase() !== subVal.toLowerCase()) return false;
                if (currentTab !== 'anc' && currentTab !== 'all') {
                    if (p[currentTab] !== 1) return false;
                }
                return true;
            });

            // Filter by selected Gestational Age cohort
            if (currentDeliveryGaFilter === 'preterm') {
                cases = cases.filter(p => {
                    const ga = getPatientCurrentGaWeeks(p);
                    return ga !== null && ga < 34;
                });
            } else if (currentDeliveryGaFilter === 'lateterm') {
                cases = cases.filter(p => {
                    const ga = getPatientCurrentGaWeeks(p);
                    return ga !== null && ga > 42;
                });
            }
            return cases;
        }

        const cases26 = getDeliveredCasesForFY('2026-27');
        const cases25 = getDeliveredCasesForFY('2025-26');

        // Update overall badge and title
        const badgeEl = document.getElementById('chart-delivery-badge');
        let gaLabel = 'All Deliveries';
        if (currentDeliveryGaFilter === 'preterm') gaLabel = 'Pre-term (<34 Weeks)';
        else if (currentDeliveryGaFilter === 'lateterm') gaLabel = 'Late Term (>42 Weeks)';

        if (badgeEl) {
            badgeEl.textContent = `${gaLabel}: ${(cases25.length + cases26.length).toLocaleString()} Total (25-26: ${cases25.length.toLocaleString()} | 26-27: ${cases26.length.toLocaleString()})`;
            badgeEl.style.background = '#e0f2fe';
            badgeEl.style.color = '#0369a1';
        }

        const badge25El = document.getElementById('badge-delivery-2025-26');
        if (badge25El) {
            badge25El.textContent = `${cases25.length.toLocaleString()} Deliveries`;
        }
        const badge26El = document.getElementById('badge-delivery-2026-27');
        if (badge26El) {
            badge26El.textContent = `${cases26.length.toLocaleString()} Deliveries`;
        }

        const effectiveToolbar = toolbarConfig || { show: true, tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false } };

        renderSingleDeliveryDonut('2025-26', cases25, effectiveToolbar);
        renderSingleDeliveryDonut('2026-27', cases26, effectiveToolbar);
    }

    // Download any chart directly as SVG file
    function downloadChartAsSvg(containerId, filename) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('SVG Download: Container not found:', containerId);
            return;
        }
        const svgEl = container.querySelector('svg.apexcharts-svg') || container.querySelector('svg');
        if (!svgEl) {
            alert('Chart is still rendering. Please try again in a few seconds.');
            return;
        }

        const clone = svgEl.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // Insert white background rectangle for crisp export in image viewers
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', '#ffffff');
        clone.insertBefore(bgRect, clone.firstChild);

        const svgData = new XMLSerializer().serializeToString(clone);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (filename || containerId) + '.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Attach click handlers to all SVG download buttons
    function setupSvgDownloadButtons() {
        document.querySelectorAll('.btn-download-svg').forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const targetId = this.getAttribute('data-target');
                const filename = this.getAttribute('data-filename') || targetId;
                downloadChartAsSvg(targetId, filename);
            };
        });
    }

    // ==========================================================================
    // Section 4: Official Anmol 2.0 Indicator & Review Tables (Colour Conditional Formatting)
    // ==========================================================================
    // SECTION 4: DPMU OFFICIAL ANMOL 2.0 TABLES & FACILITY REVIEW
    // ==========================================================================
    let dpmuSelectedYear = '2026-27';
    let dpmuSelectedCohort = 'matured'; // 'matured' (Anmol 2.0 standard), 'del', or 'all'
    let dpmuYoyPeriod = 'same'; // 'same' (Apr–Nov like-for-like) or 'full' (cumulative vs full year)
    let dpmuExcludeAbortions = true; // Exclude abortion cases from cohort
    let dpmuExcludePreterm = true; // Exclude pre-term (<35 weeks) deliveries from cohort
    let dpmuExcludeT1ModAnemia = true; // Exclude 1st trimester pregnant women with Moderate Anemia from parenteral iron management
    let dpmuEventsBound = false;

    // Helper: Check if registration is Early ANC Registration (within 1st Trimester / <=12 Weeks / 84 days of LMP)
    function isEarlyAncRegistration(p) {
        if (!p || !p.reg || !p.lmp || p.reg === '-' || p.lmp === '-') return false;
        const dReg = parseDate(p.reg);
        const dLmp = parseDate(p.lmp);
        if (!dReg || !dLmp) return false;
        const diffDays = Math.round((dReg.getTime() - dLmp.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 84;
    }

    // Facility Performance Table Sorting State
    let facilitySortCol = 'totalReg';
    let facilitySortAsc = false;
    let facilityMgmtScope = 'sync'; // 'sync' (follows currentTab), 'all', 'ma', 'sa', 'pi'

    // Canonical Date Parser Reference (Unified with parseDate)
    const parseDateDDMMYYYY = parseDate;

    // Dynamic Location Hierarchy: Block -> PHCs of Block -> Subcenters of PHC
    function getLocationHierarchyUnits() {
        const blockSelect = document.getElementById(elementIds.block);
        const phcSelect = document.getElementById(elementIds.phc);

        const blockVal = blockSelect ? blockSelect.value : 'All';
        const phcVal = phcSelect ? phcSelect.value : 'All';

        const dData = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : (window.DASHBOARD_DATA || {});
        const allPatients = dData.patients || [];
        const allAncPatients = dData.anc_patients || [];

        if (blockVal === 'All') {
            const units = ['Barwaha', 'Bhagwanpura', 'Bhikangaon', 'Gogaon', 'Jhiranya', 'Kasrawad', 'Khargone', 'Maheshwar', 'Segaon'];
            return {
                level: 'block',
                headerLabel: 'BLOCK NAME',
                scopeLabel: 'District Scope: All 9 Blocks (Khargone)',
                units: units,
                filterFn: (p, unit) => (p.b || '').toLowerCase() === unit.toLowerCase()
            };
        } else if (phcVal === 'All') {
            const phcSet = blockToPhcMap[blockVal] || new Set();
            let units = Array.from(phcSet).filter(p => p && p !== 'Unknown' && p !== 'N/A').sort();
            if (units.length === 0) {
                const found = new Set();
                [...allPatients, ...allAncPatients].forEach(p => {
                    if ((p.b || '').toLowerCase() === blockVal.toLowerCase() && p.phc && p.phc !== 'Unknown' && p.phc !== 'N/A') {
                        found.add(p.phc);
                    }
                });
                units = Array.from(found).sort();
            }
            return {
                level: 'phc',
                headerLabel: 'PHC FACILITY',
                scopeLabel: `Block Scope: ${blockVal} (${units.length} PHCs)`,
                units: units.length > 0 ? units : ['General Block Facility'],
                filterFn: (p, unit) => (p.b || '').toLowerCase() === blockVal.toLowerCase() && (p.phc || '').toLowerCase() === unit.toLowerCase()
            };
        } else {
            const subSet = phcToSubMap[phcVal] || new Set();
            let units = Array.from(subSet).filter(s => s && s !== 'Unknown' && s !== 'N/A').sort();
            if (units.length === 0) {
                const found = new Set();
                [...allPatients, ...allAncPatients].forEach(p => {
                    if ((p.phc || '').toLowerCase() === phcVal.toLowerCase() && p.sub && p.sub !== 'Unknown' && p.sub !== 'N/A') {
                        found.add(p.sub);
                    }
                });
                units = Array.from(found).sort();
            }
            return {
                level: 'subcenter',
                headerLabel: 'SUBCENTER / HWC',
                scopeLabel: `Block: ${blockVal} ➔ PHC: ${phcVal} (${units.length} Subcenters)`,
                units: units.length > 0 ? units : ['General Subcenter'],
                filterFn: (p, unit) => (p.phc || '').toLowerCase() === phcVal.toLowerCase() && (p.sub || '').toLowerCase() === unit.toLowerCase()
            };
        }
    }

    // Helper: Identify abortion and pre-term (<35 weeks) delivered cases for exclusion
    function isAbortionOrPreterm(p) {
        if (p.is_abortion === 1 || p.del === 2) return { isExcluded: true, type: 'abortion' };
        const dCat = String(p.del_cat || '').toLowerCase();
        const dPlc = String(p.d || '').toLowerCase();
        if (dCat.includes('abortion') || dPlc.includes('abortion')) return { isExcluded: true, type: 'abortion' };

        if (p.del === 1) {
            const lmpDate = parseDateDDMMYYYY(p.lmp);
            if (lmpDate) {
                const delDate = parseDateDDMMYYYY(p.del_date);
                if (delDate) {
                    const gaDel = (delDate - lmpDate) / (1000 * 60 * 60 * 24 * 7.0);
                    // Pre-term defined as <35 weeks because 4th ANC eligibility window starts at 35 weeks
                    if (gaDel > 0 && gaDel < 35.0) return { isExcluded: true, type: 'preterm' };
                } else {
                    const eddDate = parseDateDDMMYYYY(p.edd);
                    if (eddDate) {
                        const vDates = (p.v_dates || []).map(parseDateDDMMYYYY).filter(Boolean);
                        const lastVisit = vDates.length > 0 ? vDates[vDates.length - 1] : null;
                        if (lastVisit) {
                            const gaLast = (lastVisit - lmpDate) / (1000 * 60 * 60 * 24 * 7.0);
                            const daysToEdd = (eddDate - lastVisit) / (1000 * 60 * 60 * 24);
                            if (daysToEdd > 35 && gaLast < 35.0) {
                                return { isExcluded: true, type: 'preterm' };
                            }
                        }
                    }
                }
            }
        }
        return { isExcluded: false, type: null };
    }

    // Check if patient is an active pregnant woman with Moderate Anemia currently in 1st Trimester (<=12 weeks from LMP)
    function isT1PregnantModAnemia(p, refDate) {
        if (!p || p.ma !== 1) return false;
        if (p.del !== 0 || isMaternalDeath(p) || p.del === 2 || p.is_abortion === 1) return false;
        if (!p.lmp || p.lmp === '-' || p.lmp === 'N/A' || p.lmp === 'None') return false;
        const lmpDate = parseDateDDMMYYYY(p.lmp);
        if (!lmpDate || isNaN(lmpDate.getTime())) return false;
        const rDate = refDate || (typeof DASHBOARD_DATA !== 'undefined' && DASHBOARD_DATA.gen_date ? parseDate(DASHBOARD_DATA.gen_date) : new Date());
        const diffDays = Math.round((rDate.getTime() - lmpDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && (diffDays / 7.0) <= 12.0;
    }

    // Calculate 4 ANC by Gestational Age (GA) from LMP across all 12 ANC checkup visits (Canonical Helper)
    // 1st ANC Checkup (0–12 Wks), 2nd (13–26 Wks), 3rd (27–34 Wks), 4th (35–Delivery)
    function check4AncByGestationalAge(p) {
        const lmpDate = parseDateDDMMYYYY(p.lmp);
        if (!lmpDate) return { c1: 0, c2: 0, c3: 0, c4: 0, all4: 0 };
        const vDates = (p.v_dates || []).map(parseDateDDMMYYYY).filter(Boolean);
        let c1 = 0, c2 = 0, c3 = 0, c4 = 0;
        vDates.forEach(vd => {
            const diffDays = (vd - lmpDate) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0) {
                const gaWeeks = diffDays / 7.0;
                if (gaWeeks <= 12.0) c1 = 1;
                else if (gaWeeks > 12.0 && gaWeeks <= 26.0) c2 = 1;
                else if (gaWeeks > 26.0 && gaWeeks <= 34.0) c3 = 1;
                else if (gaWeeks > 34.0) c4 = 1;
            }
        });
        return { c1, c2, c3, c4, all4: (c1 && c2 && c3 && c4) ? 1 : 0 };
    }

    function renderDpmuOfficialTables() {
        const topYearSelect = document.getElementById(elementIds.year);
        if (topYearSelect && topYearSelect.value && topYearSelect.value !== 'All') {
            dpmuSelectedYear = topYearSelect.value;
        } else {
            dpmuSelectedYear = '2026-27';
        }

        const refDate = (typeof DASHBOARD_DATA !== 'undefined' && DASHBOARD_DATA.gen_date) ? parseDate(DASHBOARD_DATA.gen_date) : new Date();
        const locInfo = getLocationHierarchyUnits();

        // Update Location Breadcrumb Banner
        const bcTextEl = document.getElementById('dpmu-breadcrumb-text');
        if (bcTextEl) bcTextEl.textContent = locInfo.scopeLabel;

        // Update Table Location Column Header Labels
        const uhrpLocTh = document.getElementById('th-uhrp-loc-label');
        if (uhrpLocTh) uhrpLocTh.textContent = locInfo.headerLabel;
        const anc4Th = document.getElementById('th-4anc-loc-label');
        if (anc4Th) anc4Th.textContent = locInfo.headerLabel;
        const ancYoyTh = document.getElementById('th-anc-yoy-loc-label');
        if (ancYoyTh) ancYoyTh.textContent = locInfo.headerLabel;
        const facNameTh = document.getElementById('th-facility-name-col');
        if (facNameTh) facNameTh.textContent = locInfo.headerLabel;

        const dData = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : (window.DASHBOARD_DATA || {});
        const patients = dData.patients || [];
        const ancPatients = dData.anc_patients || [];

        const yrPatients = patients.filter(p => p.y === dpmuSelectedYear);
        const yrAncPatients = ancPatients.filter(p => p.y === dpmuSelectedYear);

        // Canonical verification helpers inherited from module scope (isSaManaged, isMaManaged, isPiManaged, check4AncByGestationalAge)

        // Clean colour conditional formatting scale matching Anmol 2.0 reference Excel reports (Green - Lime - Yellow - Peach - Red)
        function getExcelScaleClass(val, minVal, maxVal) {
            if (minVal === maxVal || isNaN(val)) return 'cond-yellow';
            const norm = (val - minVal) / (maxVal - minVal);
            if (norm >= 0.80) return 'cond-green';
            if (norm >= 0.55) return 'cond-lime';
            if (norm >= 0.35) return 'cond-yellow';
            if (norm >= 0.15) return 'cond-peach';
            return 'cond-red';
        }

        // =========================================================================
        // 1. POPULATE TABLE 1: Block/PHC-wise % ANC Registration Compare to Previous Year
        // =========================================================================
        const tbodyAncYoY = document.getElementById('tbody-anmol-anc-yoy');
        const tfootAncYoY = document.getElementById('tfoot-anmol-anc-yoy');
        const prevLabelEl = document.getElementById('th-anc-yoy-prev-label');
        const currTotEl = document.getElementById('anc-yoy-curr-total');
        const prevTotEl = document.getElementById('anc-yoy-prev-total');
        const diffTotEl = document.getElementById('anc-yoy-district-change');

        if (tbodyAncYoY && tfootAncYoY) {
            const currAnc = ancPatients.filter(p => p.y === '2026-27');
            const prevAnc = ancPatients.filter(p => p.y === '2025-26');

            // Helper to parse date string (DD-MM-YYYY or YYYY-MM-DD)
            const parseDMY = (dStr) => {
                if (!dStr) return null;
                const s = String(dStr).trim();
                const mDD = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
                if (mDD) return { day: parseInt(mDD[1], 10), month: parseInt(mDD[2], 10), year: parseInt(mDD[3], 10) };
                const mYY = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                if (mYY) return { day: parseInt(mYY[3], 10), month: parseInt(mYY[2], 10), year: parseInt(mYY[1], 10) };
                return null;
            };

            // Fiscal month rank: Apr(4)=0, May(5)=1, ..., Nov(11)=7, Dec(12)=8, Jan(1)=9, Mar(3)=11
            const getFyRank = (m) => (m >= 4 ? m - 4 : m + 8);

            // Determine latest registration date cutoff in current FY (e.g. 17 Nov)
            let maxCutRank = 7; // default Nov (rank 7)
            let maxCutDay = 17; // default 17th
            let maxCutFound = false;

            currAnc.forEach(p => {
                const pd = parseDMY(p.reg || p.lmp);
                if (pd) {
                    const r = getFyRank(pd.month);
                    if (!maxCutFound || r > maxCutRank || (r === maxCutRank && pd.day > maxCutDay)) {
                        maxCutRank = r;
                        maxCutDay = pd.day;
                        maxCutFound = true;
                    }
                }
            });

            if (prevLabelEl) {
                const monthNames = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                const cutMonthName = monthNames[maxCutRank] || 'Nov';
                prevLabelEl.textContent = dpmuYoyPeriod === 'same' ? `Last Year Same Period (Apr 1–${cutMonthName} ${maxCutDay})` : 'Last Year Full FY (2025-26)';
            }

            const isWithinSamePeriod = (p) => {
                const pd = parseDMY(p.reg || p.lmp);
                if (!pd) return false;
                const r = getFyRank(pd.month);
                return r < maxCutRank || (r === maxCutRank && pd.day <= maxCutDay);
            };

            const yoyUnitData = locInfo.units.map((unitName, idx) => {
                const uCurr = currAnc.filter(p => locInfo.filterFn(p, unitName));
                const uPrev = prevAnc.filter(p => {
                    if (!locInfo.filterFn(p, unitName)) return false;
                    if (dpmuYoyPeriod === 'same') {
                        return isWithinSamePeriod(p);
                    }
                    return true;
                });

                const cCount = uCurr.length;
                const pCount = uPrev.length;
                const diff = cCount - pCount;
                const pctChange = pCount > 0 ? ((cCount - pCount) / pCount * 100) : 0;

                let earlyCount = 0;
                uCurr.forEach(p => {
                    if (isEarlyAncRegistration(p)) earlyCount++;
                });
                const earlyPct = cCount > 0 ? (earlyCount / cCount * 100) : 0;

                return { idx, unitName, cCount, pCount, diff, pctChange, earlyCount, earlyPct };
            });

            const pctVals = yoyUnitData.map(d => d.pctChange);
            const minPct = Math.min(...pctVals);
            const maxPct = Math.max(...pctVals);

            const earlyVals = yoyUnitData.map(d => d.earlyPct);
            const minEarly = Math.min(...earlyVals);
            const maxEarly = Math.max(...earlyVals);

            let sumPrev = 0;
            let sumCurr = 0;
            let sumEarly = 0;

            const yoyRowsHtml = yoyUnitData.map(d => {
                sumCurr += d.cCount;
                sumPrev += d.pCount;
                sumEarly += d.earlyCount;
                const sign = d.diff > 0 ? '+' : '';

                return `<tr>
                    <td>${d.idx + 1}</td>
                    <td class="col-block">${cleanPhcName(d.unitName)}</td>
                    <td><strong>${d.pCount.toLocaleString()}</strong></td>
                    <td><strong>${d.cCount.toLocaleString()}</strong></td>
                    <td style="font-weight:700; color:${d.diff >= 0 ? '#059669' : '#dc2626'};">${sign}${d.diff.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.pctChange, minPct, maxPct)}">${sign}${d.pctChange.toFixed(2)}%</td>
                    <td style="font-weight:700; color:#0284c7;">${d.earlyCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.earlyPct, minEarly, maxEarly)}">${d.earlyPct.toFixed(2)}%</td>
                </tr>`;
            }).join('');

            tbodyAncYoY.innerHTML = yoyRowsHtml;

            const totDiff = sumCurr - sumPrev;
            const totPctChange = sumPrev > 0 ? ((sumCurr - sumPrev) / sumPrev * 100) : 0;
            const totEarlyPct = sumCurr > 0 ? (sumEarly / sumCurr * 100) : 0;
            const totSign = totDiff > 0 ? '+' : '';

            tfootAncYoY.innerHTML = `<tr class="anmol-total-row">
                <td colspan="2" style="text-align:center; font-weight:800;">Grand Total</td>
                <td>${sumPrev.toLocaleString()}</td>
                <td>${sumCurr.toLocaleString()}</td>
                <td style="font-weight:800; color:${totDiff >= 0 ? '#059669' : '#dc2626'};">${totSign}${totDiff.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totPctChange, minPct, maxPct)}">${totSign}${totPctChange.toFixed(2)}%</td>
                <td style="font-weight:800; color:#0284c7;">${sumEarly.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totEarlyPct, minEarly, maxEarly)}">${totEarlyPct.toFixed(2)}%</td>
            </tr>`;

            if (currTotEl) currTotEl.textContent = sumCurr.toLocaleString();
            if (prevTotEl) prevTotEl.textContent = sumPrev.toLocaleString();
            if (diffTotEl) {
                diffTotEl.textContent = `${totSign}${totPctChange.toFixed(1)}%`;
                diffTotEl.style.color = totDiff >= 0 ? '#059669' : '#dc2626';
            }
        }

        // =========================================================================
        // 2. POPULATE TABLE 2: Status of 4 ANC Checkup (with Abortion / Preterm Exclusions)
        // =========================================================================
        const tbody4Anc = document.getElementById('tbody-anmol-4anc');
        const tfoot4Anc = document.getElementById('tfoot-anmol-4anc');
        const avgEl = document.getElementById('anmol-4anc-district-avg');
        const pwLabelEl = document.getElementById('th-4anc-pw-label');
        const chipAbortions = document.getElementById('chip-4anc-abortions');
        const chipPreterm = document.getElementById('chip-4anc-preterm');
        const chipContAbortions = document.getElementById('chip-container-abortions');
        const chipContPreterm = document.getElementById('chip-container-preterm');
        const btnToggleAbort = document.getElementById('btn-toggle-exclude-abortions');
        const btnTogglePreterm = document.getElementById('btn-toggle-exclude-preterm');

        if (tbody4Anc && tfoot4Anc) {
            const isAnyExcluded = dpmuExcludeAbortions || dpmuExcludePreterm;
            if (pwLabelEl) {
                if (dpmuSelectedCohort === 'matured') {
                    pwLabelEl.textContent = isAnyExcluded ? 'Eligible Matured PW' : 'Matured PW (EDD / Delivered)';
                } else if (dpmuSelectedCohort === 'del') {
                    pwLabelEl.textContent = isAnyExcluded ? 'Eligible Delivered PW' : 'Delivered PW';
                } else {
                    pwLabelEl.textContent = isAnyExcluded ? 'Eligible PW' : 'Total PW';
                }
            }

            let grandTotalReg = 0;
            let grandAbortions = 0;
            let grandPreterm = 0;
            let grandEligible = 0;
            let grand4Anc = 0;

            const ancUnitData = locInfo.units.map((unitName, idx) => {
                const uAll = yrAncPatients.filter(p => locInfo.filterFn(p, unitName));
                let uBase;
                if (dpmuSelectedCohort === 'matured') {
                    uBase = uAll.filter(p => {
                        if (p.del === 1 || p.del === 2 || p.is_abortion === 1) return true;
                        if (p.edd && p.edd !== '-' && p.edd !== 'None') {
                            const dEdd = parseDate(p.edd);
                            if (dEdd && dEdd <= refDate) return true;
                        }
                        return false;
                    });
                } else if (dpmuSelectedCohort === 'del') {
                    uBase = uAll.filter(p => p.del === 1);
                } else {
                    uBase = uAll;
                }

                const totalReg = uBase.length;
                let unitAbortions = 0;
                let unitPreterm = 0;

                uBase.forEach(p => {
                    const ex = isAbortionOrPreterm(p);
                    if (ex.isExcluded) {
                        if (ex.type === 'abortion') unitAbortions++;
                        else if (ex.type === 'preterm') unitPreterm++;
                    }
                });

                function shouldExcludeCase(p) {
                    const ex = isAbortionOrPreterm(p);
                    if (!ex.isExcluded) return false;
                    if (dpmuExcludeAbortions && ex.type === 'abortion') return true;
                    if (dpmuExcludePreterm && ex.type === 'preterm') return true;
                    return false;
                }

                const eligibleList = uBase.filter(p => !shouldExcludeCase(p));

                let fourAncCount = 0;
                eligibleList.forEach(p => {
                    const isAll4 = p.all4 === 1 || (p.c1 === 1 && p.c2 === 1 && p.c3 === 1 && p.c4 === 1) || (check4AncByGestationalAge(p).all4 === 1);
                    if (isAll4) fourAncCount++;
                });

                const eligibleCount = eligibleList.length;
                const covPct = eligibleCount > 0 ? (fourAncCount / eligibleCount * 100) : 0;

                grandTotalReg += totalReg;
                grandAbortions += unitAbortions;
                grandPreterm += unitPreterm;
                grandEligible += eligibleCount;
                grand4Anc += fourAncCount;

                return { idx, unitName, totalReg, unitAbortions, unitPreterm, eligibleCount, fourAncCount, covPct };
            });

            // Update Summary KPI Chips: Separate Abortions & Pre-term (<35 Wks)
            if (chipAbortions) chipAbortions.textContent = grandAbortions.toLocaleString();
            if (chipPreterm) chipPreterm.textContent = grandPreterm.toLocaleString();
            if (chipContAbortions) chipContAbortions.style.opacity = dpmuExcludeAbortions ? '1' : '0.45';
            if (chipContPreterm) chipContPreterm.style.opacity = dpmuExcludePreterm ? '1' : '0.45';
            if (btnToggleAbort) btnToggleAbort.classList.toggle('active', dpmuExcludeAbortions);
            if (btnTogglePreterm) btnTogglePreterm.classList.toggle('active', dpmuExcludePreterm);
            const grandCovPct = grandEligible > 0 ? (grand4Anc / grandEligible * 100) : 0;

            const covVals = ancUnitData.map(d => d.covPct);
            const minCov = Math.min(...covVals);
            const maxCov = Math.max(...covVals);

            const ancRowsHtml = ancUnitData.map(d => {
                return `<tr>
                    <td>${d.idx + 1}</td>
                    <td class="col-block">${cleanPhcName(d.unitName)}</td>
                    <td><strong>${d.eligibleCount.toLocaleString()}</strong></td>
                    <td><strong>${d.fourAncCount.toLocaleString()}</strong></td>
                    <td class="${getExcelScaleClass(d.covPct, minCov, maxCov)}">${d.covPct.toFixed(2)}</td>
                </tr>`;
            }).join('');

            tbody4Anc.innerHTML = ancRowsHtml;

            tfoot4Anc.innerHTML = `<tr class="anmol-total-row">
                <td colspan="2" style="text-align:center; font-weight:800;">Grand Total</td>
                <td>${grandEligible.toLocaleString()}</td>
                <td>${grand4Anc.toLocaleString()}</td>
                <td class="${getExcelScaleClass(grandCovPct, minCov, maxCov)}">${grandCovPct.toFixed(2)}</td>
            </tr>`;

            if (avgEl) {
                avgEl.textContent = `${grandCovPct.toFixed(2)}%`;
            }
        }

        // =========================================================================
        // 3. POPULATE TABLE 3: Status of HRP identification and Management
        // =========================================================================
        const tbodyUhrp = document.getElementById('tbody-anmol-uhrp');
        const tfootUhrp = document.getElementById('tfoot-anmol-uhrp');

        if (tbodyUhrp && tfootUhrp) {
            let totRegPw = 0;
            let totHrpw = 0;
            let totMod = 0, totModMgmt = 0;
            let totSev = 0, totSevMgmt = 0;
            let totPih = 0, totPihMgmt = 0;
            let totT1MaExcluded = 0;

            const blockRowsData = locInfo.units.map((unitName, idx) => {
                const bAnc = yrAncPatients.filter(p => locInfo.filterFn(p, unitName));
                const bHrp = yrPatients.filter(p => locInfo.filterFn(p, unitName));

                const regCount = bAnc.length;
                const hrpCount = bHrp.length;

                let modCount = 0, modMgmtCount = 0;
                let sevCount = 0, sevMgmtCount = 0;
                let pihCount = 0, pihMgmtCount = 0;

                bHrp.forEach(p => {
                    if (p.ma === 1) {
                        const isT1Ma = isT1PregnantModAnemia(p, refDate);
                        if (isT1Ma) {
                            totT1MaExcluded++;
                        }
                        if (dpmuExcludeT1ModAnemia && isT1Ma) {
                            // Exclude 1st trimester pregnant women from Moderate Anemia denominator
                            return;
                        }
                        modCount++;
                        if (isMaManaged(p)) modMgmtCount++;
                    }
                    if (p.sa === 1) {
                        sevCount++;
                        if (isSaManaged(p)) sevMgmtCount++;
                    }
                    if (p.pi === 1) {
                        pihCount++;
                        if (isPiManaged(p)) pihMgmtCount++;
                    }
                });

                const modIdPct = regCount > 0 ? (modCount / regCount * 100) : 0;
                const modMgmtPct = modCount > 0 ? (modMgmtCount / modCount * 100) : 0;
                const sevIdPct = regCount > 0 ? (sevCount / regCount * 100) : 0;
                const sevMgmtPct = sevCount > 0 ? (sevMgmtCount / sevCount * 100) : 0;
                const pihIdPct = regCount > 0 ? (pihCount / regCount * 100) : 0;
                const pihMgmtPct = pihCount > 0 ? (pihMgmtCount / pihCount * 100) : 0;

                return {
                    idx, unitName, regCount, hrpCount,
                    modCount, modIdPct, modMgmtCount, modMgmtPct,
                    sevCount, sevIdPct, sevMgmtCount, sevMgmtPct,
                    pihCount, pihIdPct, pihMgmtCount, pihMgmtPct
                };
            });

            const minMax = (key) => {
                const vals = blockRowsData.map(d => d[key]);
                return { min: Math.min(...vals), max: Math.max(...vals) };
            };
            const mmModId = minMax('modIdPct');
            const mmModMgmt = minMax('modMgmtPct');
            const mmSevId = minMax('sevIdPct');
            const mmSevMgmt = minMax('sevMgmtPct');
            const mmPihId = minMax('pihIdPct');
            const mmPihMgmt = minMax('pihMgmtPct');

            const rowsHtml = blockRowsData.map(d => {
                totRegPw += d.regCount;
                totHrpw += d.hrpCount;
                totMod += d.modCount;
                totModMgmt += d.modMgmtCount;
                totSev += d.sevCount;
                totSevMgmt += d.sevMgmtCount;
                totPih += d.pihCount;
                totPihMgmt += d.pihMgmtCount;

                return `<tr>
                    <td>${d.idx + 1}</td>
                    <td class="col-block">${cleanPhcName(d.unitName)}</td>
                    <td><strong>${d.regCount.toLocaleString()}</strong></td>
                    <td><strong>${d.hrpCount.toLocaleString()}</strong></td>
                    <td>${d.modCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.modIdPct, mmModId.min, mmModId.max)}">${d.modIdPct.toFixed(2)}</td>
                    <td>${d.modMgmtCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.modMgmtPct, mmModMgmt.min, mmModMgmt.max)}">${d.modMgmtPct.toFixed(2)}</td>
                    <td>${d.sevCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.sevIdPct, mmSevId.min, mmSevId.max)}">${d.sevIdPct.toFixed(2)}</td>
                    <td>${d.sevMgmtCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.sevMgmtPct, mmSevMgmt.min, mmSevMgmt.max)}">${d.sevMgmtPct.toFixed(2)}</td>
                    <td>${d.pihCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.pihIdPct, mmPihId.min, mmPihId.max)}">${d.pihIdPct.toFixed(2)}</td>
                    <td>${d.pihMgmtCount.toLocaleString()}</td>
                    <td class="${getExcelScaleClass(d.pihMgmtPct, mmPihMgmt.min, mmPihMgmt.max)}">${d.pihMgmtPct.toFixed(2)}</td>
                </tr>`;
            }).join('');

            tbodyUhrp.innerHTML = rowsHtml;

            // Sync Table 3 1st Trimester Moderate Anemia Exclusion UI
            const chipT1Ma = document.getElementById('chip-uhrp-t1-ma-excluded');
            if (chipT1Ma) {
                chipT1Ma.textContent = dpmuExcludeT1ModAnemia ? totT1MaExcluded.toLocaleString() : `0 (Toggle Off - ${totT1MaExcluded} Eligible)`;
            }
            const btnT1Ma = document.getElementById('btn-toggle-exclude-t1-ma');
            if (btnT1Ma) {
                btnT1Ma.classList.toggle('active', dpmuExcludeT1ModAnemia);
            }

            const totModIdPct = totRegPw > 0 ? (totMod / totRegPw * 100) : 0;
            const totModMgmtPct = totMod > 0 ? (totModMgmt / totMod * 100) : 0;
            const totSevIdPct = totRegPw > 0 ? (totSev / totRegPw * 100) : 0;
            const totSevMgmtPct = totSev > 0 ? (totSevMgmt / totSev * 100) : 0;
            const totPihIdPct = totRegPw > 0 ? (totPih / totRegPw * 100) : 0;
            const totPihMgmtPct = totPih > 0 ? (totPihMgmt / totPih * 100) : 0;

            tfootUhrp.innerHTML = `<tr class="anmol-total-row">
                <td colspan="2" style="text-align:center; font-weight:800;">Total</td>
                <td>${totRegPw.toLocaleString()}</td>
                <td>${totHrpw.toLocaleString()}</td>
                <td>${totMod.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totModIdPct, mmModId.min, mmModId.max)}">${totModIdPct.toFixed(2)}</td>
                <td>${totModMgmt.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totModMgmtPct, mmModMgmt.min, mmModMgmt.max)}">${totModMgmtPct.toFixed(2)}</td>
                <td>${totSev.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totSevIdPct, mmSevId.min, mmSevId.max)}">${totSevIdPct.toFixed(2)}</td>
                <td>${totSevMgmt.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totSevMgmtPct, mmSevMgmt.min, mmSevMgmt.max)}">${totSevMgmtPct.toFixed(2)}</td>
                <td>${totPih.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totPihIdPct, mmPihId.min, mmPihId.max)}">${totPihIdPct.toFixed(2)}</td>
                <td>${totPihMgmt.toLocaleString()}</td>
                <td class="${getExcelScaleClass(totPihMgmtPct, mmPihMgmt.min, mmPihMgmt.max)}">${totPihMgmtPct.toFixed(2)}</td>
            </tr>`;
        }

        // =========================================================================
        // 4. POPULATE TABLE 4: PHC Facility Performance Review Table
        // =========================================================================
        const tbodyFacility = document.getElementById('tbody-anmol-facility-kpi');
        const tfootFacility = document.getElementById('tfoot-anmol-facility-kpi');
        const facilityTitleEl = document.getElementById('facility-table-title');
        const facilityCountStat = document.getElementById('facility-count-stat');
        const facilityActiveStat = document.getElementById('facility-active-stat');

        if (tbodyFacility && tfootFacility) {
            if (facilityTitleEl) {
                facilityTitleEl.textContent = locInfo.level === 'block' ? 'Block-wise Clinical Performance & Review' : (locInfo.level === 'phc' ? 'PHC Facility Clinical Performance & Review' : 'Subcenter Clinical Performance & Review');
            }

            let grandTotalReg = 0;
            let grandActivePreg = 0;
            let grandMissedAnc = 0;
            let grandDeliveryOverdue = 0;
            let grandDelivered = 0;
            let grandAbortion = 0;
            let grandDeath = 0;

            const facilityRawData = locInfo.units.map((unitName, idx) => {
                const uAnc = yrAncPatients.filter(p => locInfo.filterFn(p, unitName));

                const totalReg = uAnc.length;
                let activePreg = 0;
                let missedAnc = 0;
                let deliveryOverdue = 0;
                let delivered = 0;
                let abortion = 0;
                let death = 0;

                uAnc.forEach(p => {
                    const isDead = isMaternalDeath(p);
                    const isAb = (p.del === 2 || p.del === '2' || p.is_abortion === 1);
                    const isDelivered = (p.del === 1 || p.del === '1' || (p.del_date && p.del_date !== '-' && !isDead && !isAb));

                    if (isDead) {
                        death++;
                    } else if (isAb) {
                        abortion++;
                    } else if (isDelivered) {
                        delivered++;
                    } else if (p.del === 0 || p.del === '0' || !p.del) {
                        activePreg++;
                    }

                    if (!isDead && !isAb) {
                        const ancCheck = checkConsecutiveMissedAnc(p);
                        if (ancCheck.hasMissed) missedAnc++;
                    }
                    if (isEddOverdue(p)) deliveryOverdue++;
                });

                grandTotalReg += totalReg;
                grandActivePreg += activePreg;
                grandMissedAnc += missedAnc;
                grandDeliveryOverdue += deliveryOverdue;
                grandDelivered += delivered;
                grandAbortion += abortion;
                grandDeath += death;

                return {
                    sno: idx + 1,
                    name: unitName,
                    totalReg,
                    activePreg,
                    missedAnc,
                    deliveryOverdue,
                    delivered,
                    abortion,
                    death
                };
            });

            if (facilityCountStat) facilityCountStat.textContent = facilityRawData.length.toLocaleString();
            if (facilityActiveStat) facilityActiveStat.textContent = grandActivePreg.toLocaleString();

            // Sort data according to facilitySortCol and facilitySortAsc
            facilityRawData.sort((a, b) => {
                let va = a[facilitySortCol];
                let vb = b[facilitySortCol];
                if (typeof va === 'string') {
                    return facilitySortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
                }
                return facilitySortAsc ? (va - vb) : (vb - va);
            });

            // Update Sort Indicators on Table 4 Header
            const sortHeaders = document.querySelectorAll('#table-anmol-facility-kpi th.sortable');
            sortHeaders.forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc', 'col-spotlight');
                const colKey = th.getAttribute('data-col');
                if (colKey === facilitySortCol) {
                    th.classList.add(facilitySortAsc ? 'sort-asc' : 'sort-desc', 'col-spotlight');
                }
            });

            const facilityRowsHtml = facilityRawData.map((d, i) => {
                return `<tr>
                    <td>${i + 1}</td>
                    <td class="col-block ${facilitySortCol === 'name' ? 'col-spotlight' : ''}">${cleanPhcName(d.name)}</td>
                    <td class="${facilitySortCol === 'totalReg' ? 'col-spotlight' : ''}"><strong>${d.totalReg.toLocaleString()}</strong></td>
                    <td class="${facilitySortCol === 'activePreg' ? 'col-spotlight' : ''}">${d.activePreg.toLocaleString()}</td>
                    <td class="${facilitySortCol === 'missedAnc' ? 'col-spotlight' : ''}" style="color:${d.missedAnc > 0 ? '#e11d48' : '#64748b'}; font-weight:700;">${d.missedAnc.toLocaleString()}</td>
                    <td class="${facilitySortCol === 'deliveryOverdue' ? 'col-spotlight' : ''}" style="color:${d.deliveryOverdue > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">${d.deliveryOverdue.toLocaleString()}</td>
                    <td class="${facilitySortCol === 'delivered' ? 'col-spotlight' : ''}" style="color:${d.delivered > 0 ? '#059669' : '#64748b'}; font-weight:700;">${d.delivered.toLocaleString()}</td>
                    <td class="${facilitySortCol === 'abortion' ? 'col-spotlight' : ''}" style="color:${d.abortion > 0 ? '#d97706' : '#64748b'}; font-weight:700;">${d.abortion.toLocaleString()}</td>
                    <td class="${facilitySortCol === 'death' ? 'col-spotlight' : ''}" style="color:${d.death > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">${d.death.toLocaleString()}</td>
                </tr>`;
            }).join('');

            tbodyFacility.innerHTML = facilityRowsHtml;

            tfootFacility.innerHTML = `<tr class="anmol-total-row">
                <td colspan="2" style="text-align:center; font-weight:800;">Total</td>
                <td class="${facilitySortCol === 'totalReg' ? 'col-spotlight' : ''}">${grandTotalReg.toLocaleString()}</td>
                <td class="${facilitySortCol === 'activePreg' ? 'col-spotlight' : ''}">${grandActivePreg.toLocaleString()}</td>
                <td class="${facilitySortCol === 'missedAnc' ? 'col-spotlight' : ''}">${grandMissedAnc.toLocaleString()}</td>
                <td class="${facilitySortCol === 'deliveryOverdue' ? 'col-spotlight' : ''}">${grandDeliveryOverdue.toLocaleString()}</td>
                <td class="${facilitySortCol === 'delivered' ? 'col-spotlight' : ''}">${grandDelivered.toLocaleString()}</td>
                <td class="${facilitySortCol === 'abortion' ? 'col-spotlight' : ''}">${grandAbortion.toLocaleString()}</td>
                <td class="${facilitySortCol === 'death' ? 'col-spotlight' : ''}">${grandDeath.toLocaleString()}</td>
            </tr>`;
        }

        bindDpmuEventsOnce();
    }

    // ==========================================================================
    // SECTION 5: SANKALP — SHC-LEVEL COMPREHENSIVE MATERNAL CARE TRACKER
    // ==========================================================================
    let sankalpSortCol = 'totalReg';
    let sankalpSortAsc = false;
    let sankalpEventsBound = false;

    function renderSankalpTable() {
        const tbody = document.getElementById('tbody-sankalp-shc');
        const tfoot = document.getElementById('tfoot-sankalp-shc');
        if (!tbody || !tfoot) return;

        const yearVal = document.getElementById(elementIds.year)?.value || 'All';
        const blockVal = document.getElementById(elementIds.block)?.value || 'All';
        const phcVal = document.getElementById(elementIds.phc)?.value || 'All';
        const subVal = document.getElementById(elementIds.subcenter)?.value || 'All';

        // Update breadcrumb
        const bcEl = document.getElementById('sankalp-breadcrumb-text');
        if (bcEl) {
            const scopeParts = [];
            scopeParts.push(blockVal === 'All' ? 'All 9 Blocks (Khargone)' : `${blockVal} Block`);
            if (phcVal !== 'All') scopeParts.push(cleanPhcName(phcVal));
            if (subVal !== 'All') scopeParts.push(subVal);
            scopeParts.push(`FY: ${yearVal}`);
            bcEl.textContent = `Sankalp Scope: ${scopeParts.join(' • ')}`;
        }

        const refDate = new Date();
        refDate.setHours(0, 0, 0, 0);

        const dData = typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : (window.DASHBOARD_DATA || {});
        const ancPatients = dData.anc_patients || [];

        const pool = ancPatients.filter(p => {
            if (yearVal !== 'All' && p.y !== yearVal) return false;
            if (blockVal !== 'All' && (p.b || '').toLowerCase() !== blockVal.toLowerCase()) return false;
            if (phcVal !== 'All' && (p.phc || '').toLowerCase() !== phcVal.toLowerCase()) return false;
            if (subVal !== 'All' && (p.sub || '').toLowerCase() !== subVal.toLowerCase()) return false;
            return true;
        });

        const shcMap = new Map();
        const createEmptyShcRec = (block, sector, shc) => ({
            block,
            sector,
            shc,
            totalReg: 0,
            activePreg: 0,
            earlyCount: 0,
            anc1Due: 0,
            anc2Due: 0,
            anc3Due: 0,
            anc4Due: 0,
            eligible4Anc: 0,
            fourAncDone: 0,
            deliveryOverdue: 0,
            abortion: 0,
            delivered: 0,
            death: 0,
            modAnemiaDue: 0,
            sevAnemiaDue: 0,
            pihDue: 0
        });

        // Seed shcMap with all Location Hierarchy SHCs passing active top filters
        const shcMaster = (typeof DASHBOARD_DATA !== 'undefined' && Array.isArray(DASHBOARD_DATA.shc_master)) ? DASHBOARD_DATA.shc_master : [];
        shcMaster.forEach(m => {
            const bName = (m.b || 'Unknown').trim();
            const sectorRaw = (m.phc || 'Unknown').trim();
            const sectorName = cleanPhcName(sectorRaw);
            const shcName = (m.sub || 'Unknown').trim();
            if (blockVal !== 'All' && bName.toLowerCase() !== blockVal.toLowerCase()) return;
            if (phcVal !== 'All' && sectorRaw.toLowerCase() !== phcVal.toLowerCase() && sectorName.toLowerCase() !== cleanPhcName(phcVal).toLowerCase()) return;
            if (subVal !== 'All' && shcName.toLowerCase() !== subVal.toLowerCase()) return;
            const key = `${bName.toLowerCase()}||${sectorName.toLowerCase()}||${shcName.toLowerCase()}`;
            if (!shcMap.has(key)) {
                shcMap.set(key, createEmptyShcRec(bName, sectorName, shcName));
            }
        });

        pool.forEach(p => {
            const bName = (p.b || 'Unknown').trim();
            const sectorRaw = (p.phc || 'Unknown').trim();
            const sectorName = cleanPhcName(sectorRaw);
            const shcName = (p.sub || 'Unknown').trim();
            const key = `${bName.toLowerCase()}||${sectorName.toLowerCase()}||${shcName.toLowerCase()}`;

            if (!shcMap.has(key)) {
                shcMap.set(key, createEmptyShcRec(bName, sectorName, shcName));
            }

            const rec = shcMap.get(key);
            rec.totalReg++;

            if (isEarlyAncRegistration(p)) {
                rec.earlyCount++;
            }

            const isDead = isMaternalDeath(p);
            const isAb = (p.del === 2 || p.del === '2' || p.is_abortion === 1);
            const isDelivered = (!isDead && !isAb && (p.del === 1 || p.del === '1' || (p.del_date && p.del_date !== '-')));

            if (isDead) {
                rec.death++;
            } else if (isAb) {
                rec.abortion++;
            } else if (isDelivered) {
                rec.delivered++;
            } else {
                rec.activePreg++;

                // Check 4 ANC Due by current GA window for Active Pregnancies
                const ga = getPatientCurrentGaWeeks(p);
                const gaCheck = check4AncByGestationalAge(p);
                const hasC1 = (p.c1 === 1 || gaCheck.c1 === 1);
                const hasC2 = (p.c2 === 1 || gaCheck.c2 === 1);
                const hasC3 = (p.c3 === 1 || gaCheck.c3 === 1);
                const hasC4 = (p.c4 === 1 || gaCheck.c4 === 1);

                if (ga !== null) {
                    if (ga <= 12.0) {
                        if (!hasC1) rec.anc1Due++;
                    } else if (ga <= 26.0) {
                        if (!hasC2) rec.anc2Due++;
                    } else if (ga <= 34.0) {
                        if (!hasC3) rec.anc3Due++;
                    } else {
                        if (!hasC4) rec.anc4Due++;
                    }
                }
            }

            if (isEddOverdue(p)) {
                rec.deliveryOverdue++;
            }

            // Complete 4 ANC % coverage (Eligible Matured PW excluding abortions & <35w preterm)
            let isMatured = (p.del === 1 || p.del === 2 || p.is_abortion === 1);
            if (!isMatured && p.edd && p.edd !== '-' && p.edd !== 'None') {
                const dEdd = parseDate(p.edd);
                if (dEdd && dEdd <= refDate) isMatured = true;
            }
            if (isMatured) {
                const ex = isAbortionOrPreterm(p);
                if (!ex.isExcluded) {
                    rec.eligible4Anc++;
                    const isAll4 = p.all4 === 1 || (p.c1 === 1 && p.c2 === 1 && p.c3 === 1 && p.c4 === 1) || (check4AncByGestationalAge(p).all4 === 1);
                    if (isAll4) rec.fourAncDone++;
                }
            }

            // Management Due (Mod Anemia, Severe Anemia, PIH)
            if (!isDead && !isAb) {
                if (p.ma === 1 && !isMaManaged(p)) rec.modAnemiaDue++;
                if (p.sa === 1 && !isSaManaged(p)) rec.sevAnemiaDue++;
                if (p.pi === 1 && !isPiManaged(p)) rec.pihDue++;
            }
        });

        let rows = Array.from(shcMap.values()).map(r => {
            r.earlyPct = r.totalReg > 0 ? (r.earlyCount / r.totalReg * 100) : 0;
            r.fourAncPct = r.eligible4Anc > 0 ? (r.fourAncDone / r.eligible4Anc * 100) : 0;
            return r;
        });

        const countBadge = document.getElementById('sankalp-shc-count');
        if (countBadge) countBadge.textContent = rows.length.toLocaleString();

        // Sort rows
        rows.sort((a, b) => {
            const va = a[sankalpSortCol];
            const vb = b[sankalpSortCol];
            if (typeof va === 'string') {
                return sankalpSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            return sankalpSortAsc ? (va - vb) : (vb - va);
        });

        // Update sort header styling
        const sortHeaders = document.querySelectorAll('#table-sankalp-shc th.sortable');
        sortHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc', 'col-spotlight');
            if (th.getAttribute('data-col') === sankalpSortCol) {
                th.classList.add(sankalpSortAsc ? 'sort-asc' : 'sort-desc', 'col-spotlight');
            }
        });

        const tot = {
            totalReg: 0, activePreg: 0, earlyCount: 0,
            anc1Due: 0, anc2Due: 0, anc3Due: 0, anc4Due: 0,
            eligible4Anc: 0, fourAncDone: 0,
            deliveryOverdue: 0, abortion: 0, delivered: 0, death: 0,
            modAnemiaDue: 0, sevAnemiaDue: 0, pihDue: 0
        };

        rows.forEach(r => {
            tot.totalReg += r.totalReg;
            tot.activePreg += r.activePreg;
            tot.earlyCount += r.earlyCount;
            tot.anc1Due += r.anc1Due;
            tot.anc2Due += r.anc2Due;
            tot.anc3Due += r.anc3Due;
            tot.anc4Due += r.anc4Due;
            tot.eligible4Anc += r.eligible4Anc;
            tot.fourAncDone += r.fourAncDone;
            tot.deliveryOverdue += r.deliveryOverdue;
            tot.abortion += r.abortion;
            tot.delivered += r.delivered;
            tot.death += r.death;
            tot.modAnemiaDue += r.modAnemiaDue;
            tot.sevAnemiaDue += r.sevAnemiaDue;
            tot.pihDue += r.pihDue;
        });

        const sp = (col) => (sankalpSortCol === col ? 'col-spotlight' : '');

        if (rows.length === 0) {
            tbody.innerHTML = `<tr><td colspan="18" style="text-align:center; padding:1.5rem; color:#64748b; font-weight:600;">No SHC records found for the selected filters.</td></tr>`;
        } else {
            tbody.innerHTML = rows.map(r => `<tr>
                <td class="col-txt-left ${sp('block')}" title="${r.block}">${r.block}</td>
                <td class="col-txt-left ${sp('sector')}" title="${r.sector}">${r.sector}</td>
                <td class="col-txt-left ${sp('shc')}" style="font-weight:700;" title="${r.shc}">${r.shc}</td>
                <td class="${sp('totalReg')}"><strong>${r.totalReg.toLocaleString()}</strong></td>
                <td class="${sp('activePreg')}">${r.activePreg.toLocaleString()}</td>
                <td class="${sp('earlyPct')}" style="color:${r.earlyPct >= 80 ? '#059669' : '#d97706'}; font-weight:700;">${r.earlyPct.toFixed(1)}%</td>
                <td class="${sp('anc1Due')}" style="color:${r.anc1Due > 0 ? '#0369a1' : '#64748b'};">${r.anc1Due.toLocaleString()}</td>
                <td class="${sp('anc2Due')}" style="color:${r.anc2Due > 0 ? '#0369a1' : '#64748b'};">${r.anc2Due.toLocaleString()}</td>
                <td class="${sp('anc3Due')}" style="color:${r.anc3Due > 0 ? '#0369a1' : '#64748b'};">${r.anc3Due.toLocaleString()}</td>
                <td class="${sp('anc4Due')}" style="color:${r.anc4Due > 0 ? '#0369a1' : '#64748b'};">${r.anc4Due.toLocaleString()}</td>
                <td class="${sp('fourAncPct')}" style="color:${r.fourAncPct >= 75 ? '#059669' : '#dc2626'}; font-weight:700;">${r.fourAncPct.toFixed(1)}%</td>
                <td class="${sp('deliveryOverdue')}" style="color:${r.deliveryOverdue > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">${r.deliveryOverdue.toLocaleString()}</td>
                <td class="${sp('abortion')}" style="color:${r.abortion > 0 ? '#d97706' : '#64748b'};">${r.abortion.toLocaleString()}</td>
                <td class="${sp('delivered')}" style="color:${r.delivered > 0 ? '#059669' : '#64748b'}; font-weight:700;">${r.delivered.toLocaleString()}</td>
                <td class="${sp('death')}" style="color:${r.death > 0 ? '#991b1b' : '#64748b'}; font-weight:700;">${r.death.toLocaleString()}</td>
                <td class="${sp('modAnemiaDue')}" style="color:${r.modAnemiaDue > 0 ? '#be123c' : '#64748b'}; font-weight:700;">${r.modAnemiaDue.toLocaleString()}</td>
                <td class="${sp('sevAnemiaDue')}" style="color:${r.sevAnemiaDue > 0 ? '#dc2626' : '#64748b'}; font-weight:700;">${r.sevAnemiaDue.toLocaleString()}</td>
                <td class="${sp('pihDue')}" style="color:${r.pihDue > 0 ? '#ea580c' : '#64748b'}; font-weight:700;">${r.pihDue.toLocaleString()}</td>
            </tr>`).join('');
        }

        const totEarlyPct = tot.totalReg > 0 ? (tot.earlyCount / tot.totalReg * 100) : 0;
        const totFourAncPct = tot.eligible4Anc > 0 ? (tot.fourAncDone / tot.eligible4Anc * 100) : 0;

        tfoot.innerHTML = `<tr class="anmol-total-row">
            <td colspan="3" style="text-align:center; font-weight:800;">Total (${rows.length} SHCs)</td>
            <td class="${sp('totalReg')}">${tot.totalReg.toLocaleString()}</td>
            <td class="${sp('activePreg')}">${tot.activePreg.toLocaleString()}</td>
            <td class="${sp('earlyPct')}">${totEarlyPct.toFixed(1)}%</td>
            <td class="${sp('anc1Due')}">${tot.anc1Due.toLocaleString()}</td>
            <td class="${sp('anc2Due')}">${tot.anc2Due.toLocaleString()}</td>
            <td class="${sp('anc3Due')}">${tot.anc3Due.toLocaleString()}</td>
            <td class="${sp('anc4Due')}">${tot.anc4Due.toLocaleString()}</td>
            <td class="${sp('fourAncPct')}">${totFourAncPct.toFixed(1)}%</td>
            <td class="${sp('deliveryOverdue')}">${tot.deliveryOverdue.toLocaleString()}</td>
            <td class="${sp('abortion')}">${tot.abortion.toLocaleString()}</td>
            <td class="${sp('delivered')}">${tot.delivered.toLocaleString()}</td>
            <td class="${sp('death')}">${tot.death.toLocaleString()}</td>
            <td class="${sp('modAnemiaDue')}">${tot.modAnemiaDue.toLocaleString()}</td>
            <td class="${sp('sevAnemiaDue')}">${tot.sevAnemiaDue.toLocaleString()}</td>
            <td class="${sp('pihDue')}">${tot.pihDue.toLocaleString()}</td>
        </tr>`;

        bindSankalpEventsOnce();
    }

    function bindSankalpEventsOnce() {
        if (sankalpEventsBound) return;
        sankalpEventsBound = true;

        const sortHeaders = document.querySelectorAll('#table-sankalp-shc th.sortable');
        sortHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-col');
                if (!col) return;
                if (sankalpSortCol === col) {
                    sankalpSortAsc = !sankalpSortAsc;
                } else {
                    sankalpSortCol = col;
                    sankalpSortAsc = ['block', 'sector', 'shc'].includes(col);
                }
                renderSankalpTable();
            });
        });

        const btnExp = document.getElementById('btn-export-sankalp-csv');
        if (btnExp) {
            btnExp.addEventListener('click', () => {
                const yearVal = document.getElementById(elementIds.year)?.value || 'All';
                exportTableToCsv('table-sankalp-shc', `Sankalp_SHC_Tracker_${yearVal}.csv`);
            });
        }

        const btnCopy = document.getElementById('btn-copy-sankalp-table');
        if (btnCopy) {
            btnCopy.addEventListener('click', () => copyTableToClipboard('table-sankalp-shc', btnCopy));
        }
    }

    function bindDpmuEventsOnce() {
        if (dpmuEventsBound) return;
        dpmuEventsBound = true;

        // 1st Trimester Moderate Anemia Exclusion Toggle
        const t1MaToggleBtn = document.getElementById('btn-toggle-exclude-t1-ma');
        if (t1MaToggleBtn) {
            t1MaToggleBtn.addEventListener('click', () => {
                dpmuExcludeT1ModAnemia = !dpmuExcludeT1ModAnemia;
                t1MaToggleBtn.classList.toggle('active', dpmuExcludeT1ModAnemia);
                renderDpmuOfficialTables();
            });
        }

        // Cohort buttons for 4 ANC
        const cohortBtns = document.querySelectorAll('.anmol-cohort-btn');
        cohortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                cohortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                dpmuSelectedCohort = btn.getAttribute('data-cohort');
                saveDashboardState();
                renderDpmuOfficialTables();
            });
        });

        // Toggle Abortion Exclusion
        const btnToggleAbort = document.getElementById('btn-toggle-exclude-abortions');
        if (btnToggleAbort) {
            btnToggleAbort.addEventListener('click', () => {
                dpmuExcludeAbortions = !dpmuExcludeAbortions;
                btnToggleAbort.classList.toggle('active', dpmuExcludeAbortions);
                saveDashboardState();
                renderDpmuOfficialTables();
            });
        }

        // Toggle Pre-term Exclusion
        const btnTogglePreterm = document.getElementById('btn-toggle-exclude-preterm');
        if (btnTogglePreterm) {
            btnTogglePreterm.addEventListener('click', () => {
                dpmuExcludePreterm = !dpmuExcludePreterm;
                btnTogglePreterm.classList.toggle('active', dpmuExcludePreterm);
                saveDashboardState();
                renderDpmuOfficialTables();
            });
        }

        // YoY Period buttons for ANC Registration Comparison
        const yoyBtns = document.querySelectorAll('.anmol-yoy-btn');
        yoyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                yoyBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                dpmuYoyPeriod = btn.getAttribute('data-yoy-period');
                renderDpmuOfficialTables();
            });
        });

        // Table 4 Sorting Header Clicks
        const sortHeaders = document.querySelectorAll('#table-anmol-facility-kpi th.sortable');
        sortHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-col');
                if (facilitySortCol === col) {
                    facilitySortAsc = !facilitySortAsc;
                } else {
                    facilitySortCol = col;
                    facilitySortAsc = (col === 'sno' || col === 'name');
                }
                renderDpmuOfficialTables();
            });
        });

// Table 4 Management View Scope Toggle removed (now automatic dynamic sync)

        // Export to CSV for HRP Table
        const btnExpUhrp = document.getElementById('btn-export-uhrp-csv');
        if (btnExpUhrp) {
            btnExpUhrp.addEventListener('click', () => exportTableToCsv('table-anmol-uhrp', `Anmol_Status_of_HRP_Identification_Management_${dpmuSelectedYear}.csv`));
        }

        // Copy Table for HRP Table
        const btnCopyUhrp = document.getElementById('btn-copy-uhrp-table');
        if (btnCopyUhrp) {
            btnCopyUhrp.addEventListener('click', () => copyTableToClipboard('table-anmol-uhrp', btnCopyUhrp));
        }

        // Export to CSV for 4 ANC Table
        const btnExp4Anc = document.getElementById('btn-export-4anc-csv');
        if (btnExp4Anc) {
            btnExp4Anc.addEventListener('click', () => exportTableToCsv('table-anmol-4anc', `Anmol_Status_of_4_ANC_Checkup_${dpmuSelectedYear}.csv`));
        }

        // Copy Table for 4 ANC Table
        const btnCopy4Anc = document.getElementById('btn-copy-4anc-table');
        if (btnCopy4Anc) {
            btnCopy4Anc.addEventListener('click', () => copyTableToClipboard('table-anmol-4anc', btnCopy4Anc));
        }

        // Export to CSV for ANC YoY Table
        const btnExpAncYoY = document.getElementById('btn-export-anc-yoy-csv');
        if (btnExpAncYoY) {
            btnExpAncYoY.addEventListener('click', () => exportTableToCsv('table-anmol-anc-yoy', `Anmol_Status_of_ANC_Registration_YoY_${dpmuYoyPeriod}.csv`));
        }

        // Copy Table for ANC YoY Table
        const btnCopyAncYoY = document.getElementById('btn-copy-anc-yoy-table');
        if (btnCopyAncYoY) {
            btnCopyAncYoY.addEventListener('click', () => copyTableToClipboard('table-anmol-anc-yoy', btnCopyAncYoY));
        }

        // Export to CSV for Facility Table
        const btnExpFacility = document.getElementById('btn-export-facility-csv');
        if (btnExpFacility) {
            btnExpFacility.addEventListener('click', () => exportTableToCsv('table-anmol-facility-kpi', `Facility_Performance_Review_${dpmuSelectedYear}.csv`));
        }

        // Copy Table for Facility Table
        const btnCopyFacility = document.getElementById('btn-copy-facility-table');
        if (btnCopyFacility) {
            btnCopyFacility.addEventListener('click', () => copyTableToClipboard('table-anmol-facility-kpi', btnCopyFacility));
        }
    }

    function exportTableToCsv(tableId, filename) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const rows = Array.from(table.querySelectorAll('tr'));
        const csvContent = rows.map(r => {
            const cells = Array.from(r.querySelectorAll('th, td'));
            return cells.map(c => {
                let txt = (c.innerText || '').replace(/\r?\n|\r/g, ' ').trim();
                if (txt.includes(',') || txt.includes('"')) {
                    txt = `"${txt.replace(/"/g, '""')}"`;
                }
                return txt;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function copyTableToClipboard(tableId, btn) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const rows = Array.from(table.querySelectorAll('tr'));
        const text = rows.map(r => {
            const cells = Array.from(r.querySelectorAll('th, td'));
            return cells.map(c => (c.innerText || '').replace(/\r?\n|\r/g, ' ').trim()).join('\t');
        }).join('\n');

        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.innerText;
            btn.innerText = '✓ Copied';
            setTimeout(() => { btn.innerText = orig; }, 1800);
        }).catch(err => {
            console.error('Failed to copy table text: ', err);
        });
    }

    // SECTION 2: CHARTS & ANALYTICAL INSIGHTS
    // ==========================================================================

    function renderMonthlyTrendChart(tabKey, toolbarConfig) {
        if (monthlyTrendChartInstance) {
            monthlyTrendChartInstance.destroy();
            monthlyTrendChartInstance = null;
        }

        const chartEl = document.getElementById('chart-monthly-trend');
        if (!chartEl) return;
        chartEl.innerHTML = '';

        const titleEl = document.getElementById('chart-monthly-trend-title');
        const badgeEl = document.getElementById('chart-monthly-trend-badge');

        const monthsOrder = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];
        const monthsLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

        const blockVal = document.getElementById(elementIds.block)?.value || 'All';
        const blockFilter = blockVal === 'All' ? null : blockVal.toLowerCase();

        // Helper to extract registration / earliest attended visit month (MM)
        function getPatientRegMonth(p) {
            if (p.reg && typeof p.reg === 'string' && p.reg.includes('-')) {
                const parts = p.reg.split('-');
                if (parts.length === 3) return parts[1];
            }
            if (p.m && typeof p.m === 'string' && p.m.includes('-')) {
                const parts = p.m.split('-');
                if (parts.length === 2) return parts[1];
            }
            if (p.v_dates && p.v_dates.length) {
                for (let i = 0; i < p.v_dates.length; i++) {
                    const d = p.v_dates[i];
                    if (d && d !== '-' && d.includes('-')) {
                        const parts = d.split('-');
                        if (parts.length === 3) return parts[1];
                    }
                }
            }
            if (p.lmp && p.lmp !== '-' && p.lmp.includes('-')) {
                const parts = p.lmp.split('-');
                if (parts.length === 3) return parts[1];
            }
            return null;
        }

        // Helper to extract date of first clinical diagnosis for SA, MA, and PIH
        function getPatientDiagnosisMonth(p, conditionKey) {
            // Severe Anemia: First visit with Hb < 7.0 g/dL
            if (conditionKey === 'sa') {
                if (p.hb_v && p.v_dates) {
                    for (let i = 0; i < p.v_dates.length; i++) {
                        const d = p.v_dates[i];
                        const hb = p.hb_v[i];
                        if (d && d !== '-' && d.includes('-') && typeof hb === 'number' && hb > 0 && hb < 7.0) {
                            const parts = d.split('-');
                            if (parts.length === 3) return parts[1];
                        }
                    }
                }
                return getPatientRegMonth(p);
            }

            // Moderate Anemia: First visit with 7.0 <= Hb < 10.0 g/dL
            if (conditionKey === 'ma') {
                if (p.hb_v && p.v_dates) {
                    for (let i = 0; i < p.v_dates.length; i++) {
                        const d = p.v_dates[i];
                        const hb = p.hb_v[i];
                        if (d && d !== '-' && d.includes('-') && typeof hb === 'number' && hb >= 7.0 && hb < 10.0) {
                            const parts = d.split('-');
                            if (parts.length === 3) return parts[1];
                        }
                    }
                }
                return getPatientRegMonth(p);
            }

            // PIH (Pregnancy-Induced Hypertension): First visit with Sys >= 140 or Dia >= 90
            if (conditionKey === 'pi') {
                if (p.bp_v && p.v_dates) {
                    for (let i = 0; i < p.v_dates.length; i++) {
                        const d = p.v_dates[i];
                        const bp = p.bp_v[i];
                        if (d && d !== '-' && d.includes('-') && bp && typeof bp === 'string' && bp.includes('/')) {
                            const bparts = bp.split('/');
                            const sys = parseFloat(bparts[0]);
                            const dia = parseFloat(bparts[1]);
                            if ((!isNaN(sys) && sys >= 140) || (!isNaN(dia) && dia >= 90)) {
                                const parts = d.split('-');
                                if (parts.length === 3) return parts[1];
                            }
                        }
                    }
                }
                return getPatientRegMonth(p);
            }

            // For all other risk factors (gd, ls, sc, tp, bh, all, anc): use registration date
            return getPatientRegMonth(p);
        }

        const allAnc = DASHBOARD_DATA.anc_patients || [];
        const allHrp = DASHBOARD_DATA.patients || [];

        // Apply active block filter if selected
        const ancPool = blockFilter ? allAnc.filter(p => (p.b || '').toLowerCase() === blockFilter) : allAnc;
        const hrpPool = blockFilter ? allHrp.filter(p => (p.b || '').toLowerCase() === blockFilter) : allHrp;

        // Aggregate monthly ANC totals for 2026-27 and 2025-26
        const ancMonthly = { '2026-27': {}, '2025-26': {} };
        ancPool.forEach(p => {
            const y = p.y;
            if (ancMonthly[y]) {
                const m = getPatientRegMonth(p);
                if (m && monthsOrder.includes(m)) {
                    ancMonthly[y][m] = (ancMonthly[y][m] || 0) + 1;
                }
            }
        });

        const activeKey = tabKey || currentTab || 'all';
        const isAncTab = (activeKey === 'anc');
        const isAllUhrp = (activeKey === 'all');
        const tabName = TAB_NAMES[activeKey] || activeKey.toUpperCase();
        const blockSuffix = blockVal === 'All' ? '' : ` (${blockVal} Block)`;

        if (titleEl) {
            if (isAncTab) {
                titleEl.textContent = `📈 Monthly ANC Registrations Trend${blockSuffix}`;
            } else if (isAllUhrp) {
                titleEl.textContent = `📈 All High Risk (UHRP) Monthly Identification Rate${blockSuffix}`;
            } else {
                titleEl.textContent = `📈 ${tabName} Monthly Identification Rate${blockSuffix}`;
            }
        }

        if (badgeEl) {
            if (isAncTab) {
                badgeEl.textContent = 'Monthly Registered Pregnant Women (2026-27 vs 2025-26)';
            } else {
                badgeEl.textContent = '% Identified Against Total Monthly ANC Registrations (2026-27 vs 2025-26)';
            }
        }

        let series = [];
        let yaxisTitle = isAncTab ? 'Registrations' : '% Identified';
        const hrpMonthly = { '2026-27': {}, '2025-26': {} };

        if (isAncTab) {
            // Count of ANC registrations YoY
            const currCounts = monthsOrder.map((m, idx) => {
                if (idx > 7) return null; // Future months (Dec–Mar)
                return ancMonthly['2026-27'][m] || 0;
            });
            const prevCounts = monthsOrder.map(m => ancMonthly['2025-26'][m] || 0);

            series = [
                { name: '2025-26 (Previous FY)', data: prevCounts },
                { name: '2026-27 (Current FY)', data: currCounts }
            ];
        } else {
            // Percentage of monthly ANC registrations YoY based on registration month
            hrpPool.forEach(p => {
                const y = p.y;
                if (!hrpMonthly[y]) return;

                let matches = false;
                if (isAllUhrp) {
                    matches = (p.uhrp === 1 || p.sa === 1 || p.ma === 1 || p.pi === 1 || p.gd === 1 || p.ls === 1 || p.sc === 1 || p.tp === 1 || p.bh === 1);
                } else if (activeKey === 'ma') {
                    matches = (p.ma === 1);
                } else {
                    matches = (p[activeKey] === 1);
                }

                if (matches) {
                    const m = getPatientRegMonth(p) || getPatientDiagnosisMonth(p, activeKey);
                    if (m && monthsOrder.includes(m)) {
                        hrpMonthly[y][m] = (hrpMonthly[y][m] || 0) + 1;
                    }
                }
            });

            const currPcts = monthsOrder.map((m, idx) => {
                if (idx > 7) return null; // Future months (Dec–Mar)
                const tot = ancMonthly['2026-27'][m] || 0;
                const cnt = hrpMonthly['2026-27'][m] || 0;
                return tot > 0 ? parseFloat(((cnt / tot) * 100).toFixed(2)) : 0.0;
            });

            const prevPcts = monthsOrder.map(m => {
                const tot = ancMonthly['2025-26'][m] || 0;
                const cnt = hrpMonthly['2025-26'][m] || 0;
                return tot > 0 ? parseFloat(((cnt / tot) * 100).toFixed(2)) : 0.0;
            });

            series = [
                { name: '2025-26 (Previous FY)', data: prevPcts },
                { name: '2026-27 (Current FY)', data: currPcts }
            ];
        }

        const options = {
            series: series,
            chart: {
                type: 'bar',
                height: 340,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                toolbar: toolbarConfig || { show: true },
                animations: { enabled: true, easing: 'easeinout', speed: 450 },
                background: 'transparent'
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    borderRadius: 5,
                    borderRadiusApplication: 'end',
                    dataLabels: {
                        position: 'top'
                    }
                }
            },
            dataLabels: {
                enabled: true,
                offsetY: -18,
                style: {
                    fontSize: '10.5px',
                    fontWeight: 700,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    colors: [
                        function ({ seriesIndex, dataPointIndex, w }) {
                            if (seriesIndex !== 1) return 'transparent';
                            const s0 = w.config.series[0]?.data;
                            const s1 = w.config.series[1]?.data;
                            if (!s0 || !s1) return 'transparent';
                            const vPrev = s0[dataPointIndex];
                            const vCurr = s1[dataPointIndex];
                            if (vCurr === null || vCurr === undefined || vPrev === null || vPrev === undefined) return 'transparent';
                            const diff = vCurr - vPrev;
                            if (diff > 0) return '#16a34a'; // Green for positive % change
                            if (diff < 0) return '#ef4444'; // Red for negative % change
                            return '#64748b'; // Neutral slate
                        }
                    ]
                },
                background: {
                    enabled: false
                },
                formatter: function (val, { seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex !== 1) return '';
                    if (val === null || val === undefined) return '';
                    const s0 = w.config.series[0]?.data;
                    if (!s0) return '';
                    const vPrev = s0[dataPointIndex];
                    if (vPrev === null || vPrev === undefined) return '';
                    if (vPrev === 0) {
                        return val > 0 ? '+100%' : '0%';
                    }
                    const pct = ((val - vPrev) / vPrev) * 100;
                    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                }
            },
            theme: {
                mode: 'light'
            },
            colors: ['#ef4444', '#0284c7'],
            xaxis: {
                categories: monthsLabels,
                labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } },
                axisBorder: { show: true, color: '#cbd5e1' },
                axisTicks: { show: false }
            },
            yaxis: {
                title: {
                    text: yaxisTitle,
                    style: { fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }
                },
                labels: {
                    formatter: function (val) {
                        if (val === null || val === undefined) return '';
                        return isAncTab ? val.toLocaleString() : `${val.toFixed(1)}%`;
                    },
                    style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                fontSize: '11.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                labels: { colors: '#334155' },
                markers: { radius: 12, width: 10, height: 10 },
                onItemHover: { highlightDataSeries: true }
            },
            grid: {
                borderColor: 'rgba(226, 232, 240, 0.9)',
                strokeDashArray: 4,
                padding: {
                    top: 20
                }
            },
            tooltip: {
                theme: 'light',
                shared: true,
                intersect: false,
                y: {
                    formatter: function (val, { seriesIndex, dataPointIndex, w }) {
                        if (val === null || val === undefined) return 'N/A';
                        const s0 = w.config.series[0]?.data;
                        const prevVal = s0 ? s0[dataPointIndex] : null;
                        let yoyTag = '';
                        if (seriesIndex === 1 && prevVal !== null && prevVal !== undefined && prevVal > 0) {
                            const chg = ((val - prevVal) / prevVal) * 100;
                            yoyTag = ` [${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% YoY]`;
                        }
                        if (isAncTab) {
                            return `${val.toLocaleString()} PW registered${yoyTag}`;
                        } else {
                            const ymKey = seriesIndex === 1 ? '2026-27' : '2025-26';
                            const mCode = monthsOrder[dataPointIndex];
                            const cnt = hrpMonthly[ymKey][mCode] || 0;
                            const tot = ancMonthly[ymKey][mCode] || 0;
                            return `${val.toFixed(2)}% (${cnt.toLocaleString()} cases / ${tot.toLocaleString()} ANC)${yoyTag}`;
                        }
                    }
                }
            }
        };

        monthlyTrendChartInstance = new ApexCharts(chartEl, options);
        monthlyTrendChartInstance.render();
    }

    let lateDeliveryChartInstance = null;

    function renderLateDeliveryTrendChart(toolbarConfig) {
        if (lateDeliveryChartInstance) {
            lateDeliveryChartInstance.destroy();
            lateDeliveryChartInstance = null;
        }

        const chartEl = document.getElementById('chart-late-delivery');
        if (!chartEl) return;
        chartEl.innerHTML = '';

        const titleEl = document.getElementById('chart-late-delivery-title');
        const badgeEl = document.getElementById('chart-late-delivery-badge');

        const monthsOrder = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03'];
        const monthsLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

        const blockVal = document.getElementById(elementIds.block)?.value || 'All';
        const blockFilter = blockVal === 'All' ? null : blockVal.toLowerCase();
        const blockSuffix = blockVal === 'All' ? '' : ` (${blockVal} Block)`;

        if (titleEl) {
            titleEl.textContent = `📅 Monthly Post Term Deliveries (>42 Weeks) Rate${blockSuffix}`;
        }
        if (badgeEl) {
            badgeEl.textContent = `% of Monthly Deliveries with Gestational Age > 42 Weeks (2026-27 vs 2025-26)`;
        }

        const dData = (typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : (window.DASHBOARD_DATA || {})) || {};
        const deliveryStats = dData.monthly_delivery_stats;
        let statsBlockKey = 'All';
        if (deliveryStats && blockFilter) {
            const availBlocks = Object.keys(deliveryStats['2025-26'] || deliveryStats['2026-27'] || {});
            const matched = availBlocks.find(b => b.toLowerCase() === blockFilter);
            if (matched) statsBlockKey = matched;
        }

        const seriesCurr = [];
        const seriesPrev = [];

        const monthlyTot = { '2025-26': {}, '2026-27': {} };
        const monthlyLate = { '2025-26': {}, '2026-27': {} };
        let totLate26 = 0, totDeliv26 = 0;
        let totLate25 = 0, totDeliv25 = 0;

        monthsOrder.forEach((m, idx) => {
            // 2025-26 (Previous FY from complete Delivery Report)
            let pct25 = null;
            if (deliveryStats && deliveryStats['2025-26'] && deliveryStats['2025-26'][statsBlockKey] && deliveryStats['2025-26'][statsBlockKey][m]) {
                const item25 = deliveryStats['2025-26'][statsBlockKey][m];
                const tot = item25.tot || 0;
                const late = item25.late || 0;
                monthlyTot['2025-26'][m] = tot;
                monthlyLate['2025-26'][m] = late;
                totDeliv25 += tot;
                totLate25 += late;
                if (tot > 0) {
                    pct25 = parseFloat(((late / tot) * 100).toFixed(2));
                }
            }
            seriesPrev.push(pct25);

            // 2026-27 (Current FY up to current report month)
            let pct26 = null;
            if (deliveryStats && deliveryStats['2026-27'] && deliveryStats['2026-27'][statsBlockKey] && deliveryStats['2026-27'][statsBlockKey][m]) {
                const item26 = deliveryStats['2026-27'][statsBlockKey][m];
                const tot = item26.tot || 0;
                const late = item26.late || 0;
                monthlyTot['2026-27'][m] = tot;
                monthlyLate['2026-27'][m] = late;
                totDeliv26 += tot;
                totLate26 += late;
                if (tot > 0) {
                    pct26 = parseFloat(((late / tot) * 100).toFixed(2));
                }
            }
            seriesCurr.push(pct26);
        });

        const options = {
            series: [
                { name: '2025-26 (Previous FY)', data: seriesPrev },
                { name: '2026-27 (Current FY)', data: seriesCurr }
            ],
            chart: {
                type: 'bar',
                height: 340,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                toolbar: toolbarConfig || { show: true },
                animations: { enabled: true, easing: 'easeinout', speed: 450 },
                background: 'transparent'
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: '55%',
                    borderRadius: 5,
                    borderRadiusApplication: 'end',
                    dataLabels: {
                        position: 'top'
                    }
                }
            },
            dataLabels: {
                enabled: true,
                offsetY: -18,
                style: {
                    fontSize: '10.5px',
                    fontWeight: 700,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    colors: [
                        function ({ seriesIndex, dataPointIndex, w }) {
                            if (seriesIndex !== 1) return 'transparent';
                            const s0 = w.config.series[0]?.data;
                            const s1 = w.config.series[1]?.data;
                            if (!s0 || !s1) return 'transparent';
                            const vPrev = s0[dataPointIndex];
                            const vCurr = s1[dataPointIndex];
                            if (vCurr === null || vCurr === undefined || vPrev === null || vPrev === undefined) return 'transparent';
                            const diff = vCurr - vPrev;
                            if (diff > 0) return '#16a34a'; // Green for positive % change
                            if (diff < 0) return '#ef4444'; // Red for negative % change
                            return '#64748b'; // Neutral slate
                        }
                    ]
                },
                background: {
                    enabled: false
                },
                formatter: function (val, { seriesIndex, dataPointIndex, w }) {
                    if (seriesIndex !== 1) return '';
                    if (val === null || val === undefined) return '';
                    const s0 = w.config.series[0]?.data;
                    if (!s0) return '';
                    const vPrev = s0[dataPointIndex];
                    if (vPrev === null || vPrev === undefined) return '';
                    if (vPrev === 0) {
                        return val > 0 ? '+100%' : '0%';
                    }
                    const pct = ((val - vPrev) / vPrev) * 100;
                    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
                }
            },
            theme: {
                mode: 'light'
            },
            colors: ['#ef4444', '#0284c7'],
            xaxis: {
                categories: monthsLabels,
                labels: { style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' } },
                axisBorder: { show: true, color: '#cbd5e1' },
                axisTicks: { show: false }
            },
            yaxis: {
                title: {
                    text: 'Post Term Deliveries (% of Deliveries)',
                    style: { fontSize: '11.5px', fontWeight: 700, color: '#0f172a' }
                },
                labels: {
                    formatter: function (val) {
                        if (val === null || val === undefined) return '';
                        return `${val.toFixed(1)}%`;
                    },
                    style: { fontSize: '11px', fontWeight: 600, colors: '#64748b' }
                }
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                fontSize: '11.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                labels: { colors: '#334155' },
                markers: { radius: 12, width: 10, height: 10 },
                onItemHover: { highlightDataSeries: true },
                formatter: function (seriesName) {
                    const isCurr = seriesName.includes('2026-27');
                    const late = isCurr ? totLate26 : totLate25;
                    const tot = isCurr ? totDeliv26 : totDeliv25;
                    const rate = tot > 0 ? ((late / tot) * 100).toFixed(2) + '%' : '0.00%';
                    return `${seriesName} — ${rate} (${late.toLocaleString()} / ${tot.toLocaleString()})`;
                }
            },
            grid: {
                borderColor: 'rgba(226, 232, 240, 0.9)',
                strokeDashArray: 4,
                padding: {
                    top: 20
                }
            },
            tooltip: {
                theme: 'light',
                shared: true,
                intersect: false,
                y: {
                    formatter: function (val, { seriesIndex, dataPointIndex, w }) {
                        if (val === null || val === undefined) return 'No data (Future Month)';
                        const m = monthsOrder[dataPointIndex];
                        const fy = seriesIndex === 1 ? '2026-27' : '2025-26';
                        const tot = (monthlyTot[fy] && monthlyTot[fy][m]) || 0;
                        const lateC = (monthlyLate[fy] && monthlyLate[fy][m]) || 0;
                        let yoyTag = '';
                        const s0 = w.config.series[0]?.data;
                        const prevVal = s0 ? s0[dataPointIndex] : null;
                        if (seriesIndex === 1 && prevVal !== null && prevVal !== undefined && prevVal > 0) {
                            const chg = ((val - prevVal) / prevVal) * 100;
                            yoyTag = ` [${chg >= 0 ? '+' : ''}${chg.toFixed(1)}% YoY]`;
                        }
                        return `${val.toFixed(2)}% (${lateC.toLocaleString()} / ${tot.toLocaleString()} deliveries)${yoyTag}`;
                    }
                }
            }
        };

        lateDeliveryChartInstance = new ApexCharts(chartEl, options);
        lateDeliveryChartInstance.render();
    }

    // 4. Type of Delivery Pie Charts (Column AB from Delivery Line List)
    function renderDeliveryTypeCharts(toolbarConfig) {
        if (deliveryTypeChart2025Instance) {
            deliveryTypeChart2025Instance.destroy();
            deliveryTypeChart2025Instance = null;
        }
        if (deliveryTypeChart2026Instance) {
            deliveryTypeChart2026Instance.destroy();
            deliveryTypeChart2026Instance = null;
        }

        const el25 = document.getElementById('chart-delivery-type-2025-26');
        const el26 = document.getElementById('chart-delivery-type-2026-27');
        if (!el25 || !el26) return;
        el25.innerHTML = '';
        el26.innerHTML = '';

        const blockVal = document.getElementById(elementIds.block)?.value || 'All';
        const blockFilter = blockVal === 'All' ? null : blockVal.toLowerCase();
        const blockSuffix = blockVal === 'All' ? '' : ` (${blockVal} Block)`;

        const titleEl = document.getElementById('chart-delivery-type-title');
        if (titleEl) {
            titleEl.textContent = `🩺 Type of Delivery (YoY Comparison)${blockSuffix}`;
        }

        const dData = (typeof DASHBOARD_DATA !== 'undefined' ? DASHBOARD_DATA : (window.DASHBOARD_DATA || {})) || {};
        const typeStats = dData.delivery_type_stats || {};

        let statsBlockKey = 'All';
        if (typeStats && blockFilter) {
            const availBlocks = Object.keys(typeStats['2025-26'] || typeStats['2026-27'] || {});
            const matched = availBlocks.find(b => b.toLowerCase() === blockFilter);
            if (matched) statsBlockKey = matched;
        }

        const stats25 = (typeStats['2025-26'] && typeStats['2025-26'][statsBlockKey]) || {};
        const stats26 = (typeStats['2026-27'] && typeStats['2026-27'][statsBlockKey]) || {};

        const effectiveToolbar = toolbarConfig || {
            show: true,
            tools: { download: true, selection: false, zoom: false, zoomin: false, zoomout: false, pan: false, reset: false }
        };

        renderSingleDeliveryTypePie('2025-26', el25, stats25, 'badge-delivery-type-2025-26', effectiveToolbar);
        renderSingleDeliveryTypePie('2026-27', el26, stats26, 'badge-delivery-type-2026-27', effectiveToolbar);
    }

    function renderSingleDeliveryTypePie(fy, containerEl, statsObj, badgeId, toolbarConfig) {
        const standardOrder = ['Vaginal Delivery', 'Caesarean (LSCS)', 'Assisted Delivery'];
        const labels = [];
        const series = [];

        standardOrder.forEach(k => {
            const cnt = statsObj[k] || 0;
            if (cnt > 0) {
                labels.push(k);
                series.push(cnt);
            }
        });

        Object.keys(statsObj).forEach(k => {
            if (!standardOrder.includes(k) && statsObj[k] > 0) {
                labels.push(k);
                series.push(statsObj[k]);
            }
        });

        const total = series.reduce((a, b) => a + b, 0);
        const badgeEl = document.getElementById(badgeId);
        if (badgeEl) {
            badgeEl.textContent = `${total.toLocaleString()} Deliveries`;
        }

        if (total === 0) {
            containerEl.innerHTML = `<div style="display:flex; height:240px; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; font-weight:600;">No delivery records found for ${fy}</div>`;
            return;
        }

        const colorMap = {
            'Vaginal Delivery': '#10b981',       // Emerald
            'Caesarean (LSCS)': '#0284c7',       // Blue
            'Assisted Delivery': '#f59e0b',      // Amber
            'Unknown': '#94a3b8'                 // Slate
        };
        const colors = labels.map(l => colorMap[l] || '#8b5cf6');

        const options = {
            series: series,
            labels: labels,
            chart: {
                type: 'pie',
                height: 310,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                toolbar: toolbarConfig || { show: true },
                animations: { enabled: true, easing: 'easeinout', speed: 450 }
            },
            colors: colors,
            dataLabels: {
                enabled: true,
                formatter: function (val, opts) {
                    return `${val.toFixed(1)}%`;
                },
                style: {
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
                },
                dropShadow: { enabled: false }
            },
            legend: {
                position: 'bottom',
                fontSize: '11.5px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                labels: { colors: '#334155' },
                markers: { radius: 12, width: 9, height: 9 },
                formatter: function (seriesName, opts) {
                    const val = opts.w.globals.series[opts.seriesIndex];
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                    return `${seriesName}: ${val.toLocaleString()} (${pct}%)`;
                }
            },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: function (val, opts) {
                        const pct = total > 0 ? ((val / total) * 100).toFixed(2) : '0.00';
                        return `${val.toLocaleString()} deliveries (${pct}%)`;
                    }
                }
            },
            stroke: {
                width: 2,
                colors: ['#ffffff']
            }
        };

        const chartInstance = new ApexCharts(containerEl, options);
        chartInstance.render();

        if (fy === '2025-26') deliveryTypeChart2025Instance = chartInstance;
        else deliveryTypeChart2026Instance = chartInstance;
    }

    function renderAnalyticsCharts(filteredTabPatients) {
        currentAnalyticsPatients = filteredTabPatients;
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

        // 1. Monthly Identification Trend Chart (YoY Comparison)
        renderMonthlyTrendChart(currentTab, toolbarConfig);

        // 2. Monthly Post Term Deliveries (>42 Weeks) Trend Chart (YoY Comparison)
        renderLateDeliveryTrendChart(toolbarConfig);

        // 3. Delivery Place Distribution Donut Chart
        renderDeliveryPlaceChart(filteredTabPatients, toolbarConfig);

        // 4. Type of Delivery Pie Charts (YoY Comparison from Delivery Line List Column AB)
        renderDeliveryTypeCharts(toolbarConfig);

        setupSvgDownloadButtons();
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

    // Update Filter Chip Visual Active State
    function updateFilterChipActiveStates() {
        const checkChip = (id, defaultVal) => {
            const el = document.getElementById(elementIds[id]);
            if (!el) return;
            const chip = el.closest('.filter-chip');
            if (!chip) return;
            if (el.value !== defaultVal) {
                chip.classList.add('chip-active');
            } else {
                chip.classList.remove('chip-active');
            }
        };
        checkChip('year', 'All');
        checkChip('block', 'All');
        checkChip('phc', 'All');
        checkChip('subcenter', 'All');
        checkChip('delivery', '0');
    }

    // Render Table Line List
    function renderLineList() {
        updateFilterChipActiveStates();
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
            } else if (kpiFilter === 'overdue') {
                kpiFilteredPatients = mgmtFilteredPatients.filter(p => isEddOverdue(p));
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
            if (visitFilter === 0) {
                finalPatients = finalPatients.filter(p => {
                    const vDates = p.v_dates || [];
                    for (let i = 0; i < 12; i++) {
                        const vd = vDates[i];
                        if (vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan' && String(vd).trim() !== '') {
                            return false;
                        }
                    }
                    return true;
                });
            } else {
                const vIdx = visitFilter - 1;
                finalPatients = finalPatients.filter(p => {
                    const vd = (p.v_dates || [])[vIdx];
                    return vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan' && String(vd).trim() !== '';
                });
            }
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
            const cardsContainer = document.getElementById(elementIds.cardsContainer);
            if (cardsContainer) {
                cardsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#64748b; background:#fff; border-radius:12px; border:1px solid #e2e8f0;">No high-risk patient records found for the selected filters.</div>`;
            }
            return;
        }

        const isExpandableTab = true;

        tbody.innerHTML = pagePatients.map(p => {
            const ancCheck = checkConsecutiveMissedAnc(p);

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
            const isOverdue = isEddOverdue(p);

            const isMaternalDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);

            let delStatusBadge = '';
            if (isMaternalDeath) {
                const deathDateStr = (p.mat && p.mat.includes('(')) ? p.mat.replace(/^Yes\s*\(?|\)?$/gi, '').trim() : '';
                const deathCauseStr = p.mat_dir ? ` • Cause: ${p.mat_dir}` : '';
                delStatusBadge = `<span class="badge-death" style="background:#450a0a; color:#fecaca; border:1px solid #dc2626; font-size:0.68rem; font-weight:800; padding:0.2rem 0.5rem; border-radius:12px; display:inline-block;" title="Maternal Death${deathDateStr ? ' on ' + deathDateStr : ''}${p.mat_place ? ' at ' + p.mat_place : ''}${deathCauseStr}">🖤 Maternal Death${deathDateStr ? ' (' + deathDateStr + ')' : ''}</span>`;
            } else if (p.del === 2 || p.is_abortion === 1) {
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
            let showAnemiaMgmt = false;
            let showPihMgmt = false;
            let showGdmMgmt = false;
            if (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc' || ['sa', 'ma', 'sc', 'severe', 'moderate', 'mild', 'resolved'].includes(kpiFilter)) {
                showAnemiaMgmt = true;
            } else if (currentTab === 'pi' || ['pi', 'controlled', 'uncontrolled', 'preeclampsia'].includes(kpiFilter)) {
                showPihMgmt = true;
            } else if (currentTab === 'gd' || kpiFilter === 'gd') {
                showGdmMgmt = true;
            } else {
                showAnemiaMgmt = (p.sa === 1 || p.ma === 1 || p.sc === 1) || hasAnemiaMgmtGiven;
                showPihMgmt = (p.pi === 1 || !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-'));
                showGdmMgmt = (p.gd === 1 || p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes');
            }

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
                                        <div class="dprofile-item"><span class="dprofile-label">👩‍⚕️ ANM Contact</span><span class="dprofile-val">${p.anm_n ? `<strong>${p.anm_n}</strong><br>` : ''}${p.anm_p ? `<a href="tel:${p.anm_p}" style="color:#16a34a; font-weight:700; text-decoration:none;">📞 ${p.anm_p}</a>` : '<span style="color:#94a3b8;">Not Mapped</span>'}</span></div>
                                        <div class="dprofile-item"><span class="dprofile-label">🩺 CHO Contact</span><span class="dprofile-val">${p.cho_n ? `<strong>${p.cho_n}</strong><br>` : ''}${p.cho_p ? `<a href="tel:${p.cho_p}" style="color:#0284c7; font-weight:700; text-decoration:none;">📞 ${p.cho_p}</a>` : '<span style="color:#94a3b8;">Not Mapped</span>'}</span></div>
                                        <div class="dprofile-item full-span"><span class="dprofile-label">Complications / Risk</span><span class="dprofile-val" style="color:#b91c1c; font-weight:700;">${p.f || '-'}</span></div>
                                    </div>
                                </div>

                                ${isMaternalDeath ? `
                                <div class="drawer-death-bar" style="background:#450a0a; color:#fecaca; border:1.5px solid #dc2626; border-radius:8px; padding:0.5rem 0.85rem; margin-bottom:0.6rem; font-size:0.82rem; line-height:1.5;">
                                    🖤 <strong>Maternal Death:</strong> ${(p.mat && p.mat.includes('(')) ? p.mat.replace(/^Yes\s*\(?|\)?$/gi, '').trim() : 'Reported'}
                                    ${p.mat_place ? ` | 🏥 <strong>Facility/Place:</strong> <strong style="color:#ffffff;">${p.mat_place}</strong>` : ''}
                                    ${p.mat_dir ? ` | ⚠️ <strong>Direct Cause:</strong> <strong style="color:#fca5a5;">${p.mat_dir}</strong>` : ''}
                                    ${p.mat_indir ? ` | ℹ️ <strong>Indirect Cause:</strong> ${p.mat_indir}` : ''}
                                </div>
                                ` : ''}

                                <div class="drawer-location-bar">
                                    📍 <strong>Facility Hierarchy:</strong> Block: <strong>${p.b}</strong> | PHC: <strong>${p.phc}</strong> | Subcenter: <strong>${p.sub}</strong> | Village: <strong>${cleanV}</strong>
                                    ${isDelivered ? ` | 🏥 <strong>Delivery Facility:</strong> <strong style="color:#059669;">${p.d || '-'}</strong> (${p.del_cat || 'Facility'}) ${p.del_date && p.del_date !== '-' ? `on <strong>${delDateDisplay}</strong>` : ''}` : ''}
                                    ${p.lr_hb ? ` | 🩸 <strong>Hb on LR Admission:</strong> <strong style="color:#dc2626;">${p.lr_hb} g/dL</strong>` : ''}
                                    ${p.bp_adm ? ` | 🩺 <strong>BP at Admission:</strong> <strong style="color:#0369a1;">${p.bp_adm} mmHg</strong>` : ''}
                                </div>

                                <div class="drawer-contact-bar">
                                    <div class="contact-group">
                                        <span style="font-weight:700; color:#166534;">👩‍⚕️ ANM:</span>
                                        <strong style="color:#0f172a;">${p.anm_n || 'Not Mapped'}</strong>
                                        ${p.anm_p ? `<a href="tel:${p.anm_p}" class="btn-call-chip btn-call-anm" title="Call ANM ${p.anm_n || ''}">📞 Call ANM (${p.anm_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                                    </div>
                                    <div class="contact-group">
                                        <span style="font-weight:700; color:#0369a1;">🩺 CHO:</span>
                                        <strong style="color:#0f172a;">${p.cho_n || 'Not Mapped'}</strong>
                                        ${p.cho_p ? `<a href="tel:${p.cho_p}" class="btn-call-chip btn-call-cho" title="Call CHO ${p.cho_n || ''}">📞 Call CHO (${p.cho_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                                    </div>
                                </div>
                                ${showAnemiaMgmt ? `
                                <div class="drawer-management-bar" style="margin-bottom: 0.6rem;">
                                    <span class="d-mgt-heading" style="color:#9f1239;">💊 Anemia Clinical Management:</span>
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
                                <div class="drawer-management-bar drawer-pih-bar" style="background:#ffffff; border: 1px solid #fed7aa; border-left:4px solid #ea580c; margin-bottom: 0.6rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
                                    <span class="d-mgt-heading" style="color:#9a3412;">💊 PIH Clinical Management (Hypertension Regimen):</span>
                                    <div class="d-mgt-grid">
                                        <div class="d-mgt-item" style="grid-column: 1 / -1;">
                                            <span class="d-mgt-label">Antihypertensive Therapy:</span>
                                            <span class="d-mgt-badge ${p.pih_mgmt ? 'mgt-yes' : 'mgt-no'}">
                                                ${p.pih_mgmt ? `✓ ${p.pih_mgmt}` : '✕ Not Recorded / Not Prescribed'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                ${showGdmMgmt ? `
                                <div class="drawer-management-bar drawer-gdm-bar" style="background:#ffffff; border: 1px solid #bae6fd; border-left:4px solid #0284c7; margin-bottom: 0.6rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
                                    <span class="d-mgt-heading" style="color:#075985;">💊 GDM Clinical Management & OGTT Screen:</span>
                                    <div class="d-mgt-grid">
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">OGTT-1 (Col FE):</span>
                                            <span class="d-mgt-badge ${p.og1 ? (p.og1 > 140 ? 'mgt-yes' : 'mgt-no') : 'mgt-no'}">
                                                ${p.og1 ? `${p.og1} mg/dL ${p.og1 > 140 ? '(>140 Positive)' : '(Normal)'}` : '✕ Not Recorded'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">OGTT-2 (Col FG):</span>
                                            <span class="d-mgt-badge ${p.og2 ? (p.og2 > 140 ? 'mgt-yes' : 'mgt-no') : 'mgt-no'}">
                                                ${p.og2 ? `${p.og2} mg/dL ${p.og2 > 140 ? '(>140 Positive)' : '(Normal)'}` : '✕ Not Recorded'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Medical Nutrition Therapy (MNT):</span>
                                            <span class="d-mgt-badge ${p.gdm_mnt === 'Yes' ? 'mgt-yes' : 'mgt-no'}">
                                                ${p.gdm_mnt === 'Yes' ? '✓ On MNT' : '✕ No'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Tab. Metformin:</span>
                                            <span class="d-mgt-badge ${p.gdm_met === 'Yes' ? 'mgt-yes' : 'mgt-no'}">
                                                ${p.gdm_met === 'Yes' ? '✓ Prescribed' : '✕ None'}
                                            </span>
                                        </div>
                                        <div class="d-mgt-item">
                                            <span class="d-mgt-label">Inj. Insulin:</span>
                                            <span class="d-mgt-badge ${p.gdm_ins === 'Yes' ? 'mgt-yes' : 'mgt-no'}">
                                                ${p.gdm_ins === 'Yes' ? '✓ Prescribed' : '✕ None'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}
                                <div class="anc-timeline-container">
                                    <div class="anc-timeline-title">📋 12 ANC visit record</div>
                                    <div class="anc-timeline-grid" id="timeline-${p.id}"></div>
                                </div>
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
                    const isCardDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);
                    if (isCardDeath) {
                        const deathDateStr = (p.mat && p.mat.includes('(')) ? p.mat.replace(/^Yes\s*\(?|\)?$/gi, '').trim() : '';
                        riskTagsHtml += `<span style="background:#450a0a; color:#fecaca; border:1px solid #dc2626; font-size:0.68rem; font-weight:800; padding:0.15rem 0.45rem; border-radius:6px;">🖤 Maternal Death${deathDateStr ? ' (' + deathDateStr + ')' : ''}</span>`;
                    }
                    if (p.f) {
                        riskTagsHtml += `<span style="background:#fee2e2; color:#991b1b; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;">${p.f}</span>`;
                    }
                    if (!isMoSeen) {
                        riskTagsHtml += `<span style="background:#e0f2fe; color:#0369a1; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;">🩺 MO Pending</span>`;
                    }
                    if (ancCheck.hasMissed && currentTab !== 'anc') {
                        riskTagsHtml += `<span style="background:#fef3c7; color:#b45309; font-size:0.68rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:6px;" title="${ancCheck.daysSinceLastVisit ? `No visit in last ${ancCheck.daysSinceLastVisit} days` : '2+ Consecutive ANC Visits Missed'}">⚠️ 2+ Missed</span>`;
                    }

                            const hasAnemiaRisk = (p.sa === 1 || p.ma === 1 || p.sc === 1);
                            const hasPihRisk = (p.pi === 1 || !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-'));
                            const hasGdmRisk = (p.gd === 1 || p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes');
                            const isAnemiaDone = (p.fcm === 'Yes' || (p.bt && p.bt !== 'No' && p.bt !== '-') || (Array.isArray(p.is_doses) && p.is_doses.length >= 3));
                            const isPihDone = !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-');
                            const isGdmDone = (p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes' || p.gdm_mgmt_at === 'Yes');

                            let cardMgmtDone = false;
                            let cardMgmtPending = false;
                            if (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc' || ['sa', 'ma', 'sc', 'severe', 'moderate', 'mild', 'resolved'].includes(kpiFilter)) {
                                cardMgmtDone = isAnemiaDone;
                                cardMgmtPending = !isAnemiaDone;
                            } else if (currentTab === 'pi' || ['pi', 'controlled', 'uncontrolled', 'preeclampsia'].includes(kpiFilter)) {
                                cardMgmtDone = isPihDone;
                                cardMgmtPending = !isPihDone;
                            } else if (currentTab === 'gd' || kpiFilter === 'gd') {
                                cardMgmtDone = isGdmDone;
                                cardMgmtPending = !isGdmDone;
                            } else {
                                const hasAnyMgmt = isAnemiaDone || isPihDone || isGdmDone;
                                const needsMgmt = hasAnemiaRisk || hasPihRisk || hasGdmRisk;
                                cardMgmtDone = hasAnyMgmt;
                                cardMgmtPending = needsMgmt && !hasAnyMgmt;
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
                                        <button type="button" class="btn-card-action btn-card-mgmt ${cardMgmtDone ? 'btn-mgmt-done' : (cardMgmtPending ? 'btn-mgmt-pending' : 'btn-mgmt-routine')}" onclick="window.openMgmtModal('${p.id}')" style="${cardMgmtDone ? 'background:#059669 !important; color:#ffffff !important; border:1.5px solid #047857 !important; font-weight:700 !important;' : (cardMgmtPending ? 'background:#ea580c !important; color:#ffffff !important; border:1.5px solid #c2410c !important; font-weight:700 !important;' : 'background:#f1f5f9 !important; color:#475569 !important; border:1.5px solid #cbd5e1 !important;')}" title="Clinical Management: ${cardMgmtDone ? 'Done' : (cardMgmtPending ? 'Pending' : 'Routine')}">
                                            ${cardMgmtDone ? '💊 Mgmt Done' : (cardMgmtPending ? '💊 Mgmt Pending' : '💊 Management')}
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
            }
        }
    }

    // Helper: Calculate gestational age in completed weeks based on LMP and reference event date
    function getPatientCurrentGaWeeks(p) {
        if (!p.lmp || p.lmp === '-' || p.lmp === 'N/A') return null;
        const lmpDate = parseDate(p.lmp);
        if (!lmpDate) return null;

        // Reference date:
        // 1. If maternal death -> Date of Death (extracted from p.mat) or del_date
        // 2. If delivered -> Delivery Date (or EDD as fallback)
        // 3. If abortion -> event occurred early (cap at 20 wks or use edd/gen_date)
        // 4. If undelivered -> Date of Dashboard Generation Date (DASHBOARD_DATA.gen_date)
        let refDate = parseDate(DASHBOARD_DATA.gen_date) || new Date();

        const isMaternalDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);
        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const isAbortion = (p.del === 2 || p.is_abortion === 1);

        if (isMaternalDeath) {
            let deathDate = null;
            if (p.mat && p.mat.includes('(')) {
                const deathDateStr = p.mat.replace(/^Yes\s*\(?|\)?$/gi, '').trim();
                deathDate = parseDate(deathDateStr);
            }
            if (!deathDate && p.del_date && p.del_date !== '-') {
                deathDate = parseDate(p.del_date);
            }
            if (deathDate) {
                refDate = deathDate;
                const diffMs = refDate.getTime() - lmpDate.getTime();
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays < 0) return null;
                return Math.floor(diffDays / 7);
            }
        }

        if (isAbortion) {
            // In abortion cases, date of abortion is not available.
            // Freeze GA to the GA of the last recorded ANC visit.
            let lastVisitDate = null;
            const vDates = p.v_dates || [];
            for (let i = vDates.length - 1; i >= 0; i--) {
                const dStr = vDates[i];
                if (dStr && dStr !== '-' && dStr !== 'None' && dStr !== 'nan' && dStr.trim() !== '') {
                    const parsed = parseDate(dStr);
                    if (parsed && !isNaN(parsed.getTime())) {
                        lastVisitDate = parsed;
                        break;
                    }
                }
            }
            if (!lastVisitDate && p.reg && p.reg !== '-' && p.reg !== 'None' && p.reg !== 'nan') {
                const parsedReg = parseDate(p.reg);
                if (parsedReg && !isNaN(parsedReg.getTime())) {
                    lastVisitDate = parsedReg;
                }
            }

            if (lastVisitDate) {
                const diffMs = lastVisitDate.getTime() - lmpDate.getTime();
                const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    return Math.floor(diffDays / 7);
                }
            }
            // Fallback: if no visit date or reg date recorded, calculate to gen_date capped at 20 wks
            const diffMs = refDate.getTime() - lmpDate.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const calculatedWeeks = Math.floor(diffDays / 7);
            return (calculatedWeeks >= 0 && calculatedWeeks <= 20) ? calculatedWeeks : 12;
        }

        if (isDelivered) {
            const parsedDel = parseDate(p.del_date);
            if (parsedDel) {
                refDate = parsedDel;
            } else {
                const parsedEdd = parseDate(p.edd);
                if (parsedEdd) refDate = parsedEdd;
            }
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
        const isMaternalDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);
        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));
        const isAbortion = (p.del === 2 || p.is_abortion === 1);

        if (isMaternalDeath) {
            return `<span class="badge-ga" style="background:#450a0a; color:#fecaca; border:1px solid #dc2626;" title="Maternal Death at ~${weeks} Wks GA">${weeks} Wks</span>`;
        }
        if (isAbortion) {
            return `<span class="badge-ga" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca;" title="Abortion (GA frozen at last ANC visit: ${weeks} Wks)">${weeks} Wks</span>`;
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
        let zeroVisitCount = 0;

        tabPatients.forEach(p => {
            const vDates = p.v_dates || [];
            let attendedCount = 0;
            for (let i = 0; i < 12; i++) {
                // A visit is attended if v_dates[i] is a non-null, non-'-' date string
                const vd = vDates[i];
                if (vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan' && String(vd).trim() !== '') {
                    visitCounts[i]++;
                    attendedCount++;
                }
            }
            if (attendedCount === 0) {
                zeroVisitCount++;
            }
        });

        let activeKpiLabel = '';
        if (kpiFilter) {
            if (kpiFilter === 'missed_anc') activeKpiLabel = ' • Missed 2+ ANC Cohort';
            else if (kpiFilter === 'overdue') activeKpiLabel = ' • Delivery Overdue Cohort';
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
                <div class="anc-visit-kpi-card ${visitFilter === 0 ? 'active-visit-filter' : ''}" data-vnum="0" title="Click to filter line list for patients with 0 ANC visits updated">
                    <span class="anc-vkpi-title">Visit 0</span>
                    <span class="anc-vkpi-value">${zeroVisitCount}</span>
                </div>
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
                filterProtocolCards(currentTab);
                renderLineList();
                renderDpmuOfficialTables();
                if (currentMainView === 'analytics') {
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                }
                saveDashboardState();
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
            } else if (kpiFilter === 'overdue') {
                exportData = exportData.filter(p => isEddOverdue(p));
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
            if (visitFilter === 0) {
                exportData = exportData.filter(p => {
                    const vDates = p.v_dates || [];
                    for (let i = 0; i < 12; i++) {
                        const vd = vDates[i];
                        if (vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan' && String(vd).trim() !== '') {
                            return false;
                        }
                    }
                    return true;
                });
            } else {
                const vIdx = visitFilter - 1;
                exportData = exportData.filter(p => {
                    const vd = (p.v_dates || [])[vIdx];
                    return vd && vd !== '-' && vd !== null && vd !== 'None' && vd !== 'nan' && String(vd).trim() !== '';
                });
            }
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
            'ANM Name': p.anm_n || '',
            'ANM Contact': p.anm_p || '',
            'CHO Name': p.cho_n || '',
            'CHO Contact': p.cho_p || '',
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
            'Place of Maternal Death': p.mat_place || '',
            'Direct Cause of Maternal Death': p.mat_dir || '',
            'Indirect Cause of Maternal Death': p.mat_indir || '',
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
        setupSvgDownloadButtons();

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
                renderDpmuOfficialTables();
                renderSankalpTable();
                if (currentMainView === 'analytics') {
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                }
                saveDashboardState();
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
                renderDpmuOfficialTables();
                renderSankalpTable();
                if (currentMainView === 'analytics') {
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                }
                saveDashboardState();
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
                    filterProtocolCards(currentTab);
                    renderLineList();
                    renderDpmuOfficialTables();
                }
                saveDashboardState();
                scrollToLinelistOnMobile();
            });
        }

        ['year', 'subcenter', 'delivery', 'mgmtStatus'].forEach(id => {
            const el = document.getElementById(elementIds[id]);
            if (el) el.addEventListener('change', () => {
                initializedCharts = {};
                currentPage = 1;
                renderLineList();
                renderDpmuOfficialTables();
                renderSankalpTable();
                if (currentMainView === 'analytics') {
                    const filtered = getFilteredPatients();
                    let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
                    renderAnalyticsCharts(tabPatients);
                }
                saveDashboardState();
                scrollToLinelistOnMobile();
            });
        });

        const clearBtn = document.getElementById(elementIds.clearFiltersBtn);
        if (clearBtn) {
            clearBtn.addEventListener('click', function(e) {
                // Add animated spin to broom icon or button
                this.classList.add('is-clearing');
                setTimeout(() => {
                    this.classList.remove('is-clearing');
                }, 450);
                clearFilters();
            });
        }

        // Delivery Place Gestational Age Toggles
        const gaBtns = document.querySelectorAll('.delivery-ga-btn');
        gaBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                gaBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentDeliveryGaFilter = btn.getAttribute('data-ga');
                saveDashboardState();
                renderDeliveryPlaceChart();
            });
        });

        const searchInput = document.getElementById(elementIds.searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                initializedCharts = {};
                currentPage = 1;
                renderLineList();
            }, 250));
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

        // Neo-Tactile Dynamic Frosted Elevation & Compact Docking Listener
        const mainFilterBar = document.getElementById('main-filter-bar') || document.querySelector('.filter-bar');
        const riskTabsSection = document.querySelector('.risk-tabs-section');
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                window.requestAnimationFrame(() => {
                    const isDocked = window.scrollY > 30;
                    if (mainFilterBar) mainFilterBar.classList.toggle('is-scrolled-docked', isDocked);
                    if (riskTabsSection) riskTabsSection.classList.toggle('is-scrolled-docked', isDocked);
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });
    }

    // =========================================================================
    // Session-Isolated State Persistence & Loader Management
    // =========================================================================
    const DASHBOARD_STATE_KEY = 'uhrp_dashboard_state_v1';
    let isRestoringState = false;

    // Clear legacy localStorage state immediately so old persisted filters from previous sessions are wiped
    try {
        localStorage.removeItem('uhrp_dashboard_state');
        localStorage.removeItem(DASHBOARD_STATE_KEY);
    } catch (e) {}

    // Hide Application Loading Screen
    function hideAppLoader() {
        const loader = document.getElementById('uhrp-app-loader');
        if (!loader) return;
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 460);
    }

    // Save active state to sessionStorage (session-only isolation; URL hash param sync disabled)
    function saveDashboardState() {
        if (isRestoringState) return;
        try {
            const yearVal = document.getElementById(elementIds.year)?.value || 'All';
            const blockVal = document.getElementById(elementIds.block)?.value || 'All';
            const phcVal = document.getElementById(elementIds.phc)?.value || 'All';
            const subVal = document.getElementById(elementIds.subcenter)?.value || 'All';
            const delVal = document.getElementById(elementIds.delivery)?.value || '0';

            const state = {
                view: currentMainView || 'linelist',
                tab: currentTab || 'anc',
                year: yearVal,
                block: blockVal,
                phc: phcVal,
                subcenter: subVal,
                delivery: delVal,
                deliveryGa: currentDeliveryGaFilter || 'all',
                dpmuCohort: dpmuSelectedCohort || 'matured',
                dpmuExcludeAbortions: !!dpmuExcludeAbortions,
                dpmuExcludePreterm: !!dpmuExcludePreterm
            };
            sessionStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.warn('Unable to persist dashboard state:', e);
        }
    }

    // Restore saved state from sessionStorage
    function restoreDashboardState() {
        isRestoringState = true;
        try {
            // Clean legacy localStorage keys on initialization to prevent cross-session leakage
            try {
                localStorage.removeItem('uhrp_dashboard_state');
                localStorage.removeItem(DASHBOARD_STATE_KEY);
            } catch (e) {}

            // Clean legacy URL hash parameters if any were present from older sessions
            if (window.location.hash && window.location.hash.includes('=')) {
                try {
                    history.replaceState(null, '', window.location.pathname);
                } catch (e) {}
            }

            let saved = null;
            const raw = sessionStorage.getItem(DASHBOARD_STATE_KEY);
            if (raw) saved = JSON.parse(raw);

            if (!saved) {
                isRestoringState = false;
                return false;
            }

            // Restore Year
            const yearSelect = document.getElementById(elementIds.year);
            if (yearSelect && saved.year) {
                const hasOpt = Array.from(yearSelect.options).some(o => o.value === saved.year);
                if (hasOpt) yearSelect.value = saved.year;
            }

            // Restore Block
            const blockSelect = document.getElementById(elementIds.block);
            if (blockSelect && saved.block) {
                const hasOpt = Array.from(blockSelect.options).some(o => o.value === saved.block);
                if (hasOpt) blockSelect.value = saved.block;
            }

            // Update PHC Dropdown for restored Block
            updatePhcDropdown(saved.block || 'All', saved.phc);

            // Update Subcenter Dropdown for restored Block & PHC
            updateSubcenterDropdown(saved.block || 'All', saved.phc || 'All', saved.subcenter);

            // Restore Delivery Status
            const delSelect = document.getElementById(elementIds.delivery);
            if (delSelect && saved.delivery !== undefined && saved.delivery !== null) {
                const hasOpt = Array.from(delSelect.options).some(o => o.value === saved.delivery);
                if (hasOpt) delSelect.value = saved.delivery;
            }

            // Restore Tab
            if (saved.tab && TAB_NAMES[saved.tab]) {
                currentTab = saved.tab;
                const tabTitleEl = document.getElementById(elementIds.tabTitle);
                if (tabTitleEl) tabTitleEl.textContent = `${TAB_NAMES[currentTab]} Line List`;
                const riskSelect = document.getElementById(elementIds.riskFactor);
                if (riskSelect) riskSelect.value = currentTab;
            }

            // Restore Main View
            if (saved.view && ['linelist', 'analytics', 'protocols', 'dpmu'].includes(saved.view)) {
                currentMainView = saved.view;
            }

            // Restore DPMU Cohort & Exclusions
            if (saved.dpmuCohort) {
                dpmuSelectedCohort = saved.dpmuCohort;
                const cohortBtns = document.querySelectorAll('.anmol-cohort-btn');
                cohortBtns.forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-cohort') === dpmuSelectedCohort);
                });
            }
            if (saved.dpmuExcludeAbortions !== undefined) {
                dpmuExcludeAbortions = !!saved.dpmuExcludeAbortions;
                const btnToggleAbort = document.getElementById('btn-toggle-exclude-abortions');
                if (btnToggleAbort) btnToggleAbort.classList.toggle('active', dpmuExcludeAbortions);
            }
            if (saved.dpmuExcludePreterm !== undefined) {
                dpmuExcludePreterm = !!saved.dpmuExcludePreterm;
                const btnTogglePreterm = document.getElementById('btn-toggle-exclude-preterm');
                if (btnTogglePreterm) btnTogglePreterm.classList.toggle('active', dpmuExcludePreterm);
            }

            // Restore Delivery Place Gestational Age Filter
            if (saved.deliveryGa && ['all', 'preterm', 'lateterm'].includes(saved.deliveryGa)) {
                currentDeliveryGaFilter = saved.deliveryGa;
                const gaBtns = document.querySelectorAll('.delivery-ga-btn');
                gaBtns.forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-ga') === currentDeliveryGaFilter);
                });
            }

            isRestoringState = false;
            return true;
        } catch (e) {
            console.warn('Error restoring dashboard state:', e);
            isRestoringState = false;
            return false;
        }
    }

    // Deep Link URL Hash Handler (e.g. #analytics, #tab-pi, #open-20202797448)
    function handleInitialHash() {
        const hash = window.location.hash;
        if (!hash) return;
        if (hash === '#analytics') {
            const analyticsBtn = Array.from(document.querySelectorAll('.main-view-btn')).find(b => b.getAttribute('data-view') === 'analytics');
            if (analyticsBtn) analyticsBtn.click();
        } else if (hash === '#dpmu') {
            const dpmuBtn = Array.from(document.querySelectorAll('.main-view-btn')).find(b => b.getAttribute('data-view') === 'dpmu');
            if (dpmuBtn) dpmuBtn.click();
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

        const subName = p.sub || p.subcenter || p.sc || 'Not Mapped';
        const phcName = cleanPhcName(p.phc || p.phc_name || 'Not Mapped');
        const cleanV = cleanVillageName(p.v);
        const blockName = p.b || 'Not Mapped';

        titleEl.textContent = `📋 12 ANC Visit Record — ${p.n}`;
        subtitleEl.textContent = `MP ID: ${p.id}`;

        const isMoSeen = hasMoVisit(p);
        const ancCheck = checkConsecutiveMissedAnc(p);

        bodyEl.innerHTML = `
            <!-- Top Location Strip (Village, Subcenter, PHC, Block) -->
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.4rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.78rem;">
                <div><span style="color:#64748b; font-weight:700;">🏠 Village:</span> <strong style="color:#0f172a;">${cleanV}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏠 Subcenter:</span> <strong style="color:#0284c7;">${subName}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏛️ PHC:</span> <strong style="color:#0f172a;">${phcName}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏥 Block:</span> <strong style="color:#0f172a;">${blockName}</strong></div>
            </div>

            <!-- 1. 12 ANC visit record -->
            <div class="anc-timeline-container" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:0.75rem;">
                <div class="anc-timeline-title" style="font-size:0.82rem; font-weight:800; margin-bottom:0.5rem; color:#0f172a;">📋 12 ANC Visit Record</div>
                <div class="anc-timeline-grid" id="timeline-modal-${p.id}"></div>
            </div>

            <div id="drawer-status-modal-${p.id}" style="margin-bottom:0.25rem;"></div>

            <!-- 2. ANM & CHO Contact Numbers -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.8rem;">
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.45rem;">
                    <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                        <span style="color:#166534; font-weight:700;">👩‍⚕️ ANM:</span> <strong style="color:#0f172a;">${p.anm_n || 'Not Mapped'}</strong>
                        ${p.anm_p ? `<a href="tel:${p.anm_p}" class="btn-call-chip btn-call-anm" title="Call ANM">📞 Call (${p.anm_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                        <span style="color:#0369a1; font-weight:700;">🩺 CHO:</span> <strong style="color:#0f172a;">${p.cho_n || 'Not Mapped'}</strong>
                        ${p.cho_p ? `<a href="tel:${p.cho_p}" class="btn-call-chip btn-call-cho" title="Call CHO">📞 Call (${p.cho_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                    </div>
                </div>
            </div>

            <!-- 3. Medical Officer & Attendance Status Alert -->
            <div class="modal-vitals-bar" style="margin-bottom:0.15rem;">
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">Medical Officer (MO) Status</span>
                    <span class="modal-vitals-val" style="color:${isMoSeen ? '#059669' : '#0284c7'}; font-size:0.82rem;">
                        ${isMoSeen ? '✓ Examined by Doctor / MO' : '⚠️ Pending Mandatory MO Exam'}
                    </span>
                </div>
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">ANC Attendance Alert</span>
                    <span class="modal-vitals-val" style="color:${ancCheck.hasMissed ? '#ea580c' : '#059669'}; font-size:0.82rem;">
                        ${ancCheck.hasMissed ? `⚠️ Missed 2+ ANC Visits${ancCheck.daysSinceLastVisit ? ` (${ancCheck.daysSinceLastVisit}d)` : ''}` : '✓ Regular Follow-up'}
                    </span>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';
        renderAncTimelineGrid(`modal-${p.id}`, p);
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
        const containerEl = document.getElementById('modal-mgmt-container') || overlay?.querySelector('.uhrp-modal-container');
        const titleEl = document.getElementById('modal-mgmt-title');
        const subtitleEl = document.getElementById('modal-mgmt-subtitle');
        const bodyEl = document.getElementById('modal-mgmt-body');
        if (!overlay || !bodyEl) return;

        const subName = p.sub || p.subcenter || p.sc || 'Not Mapped';
        const phcName = cleanPhcName(p.phc || p.phc_name || 'Not Mapped');
        const cleanV = cleanVillageName(p.v);
        const blockName = p.b || 'Not Mapped';

        titleEl.textContent = `💊 Clinical Management — ${p.n}`;
        subtitleEl.textContent = `MP ID: ${p.id}`;

        const isDelivered = (p.del === 1 || (p.del_date && p.del_date !== '-'));

        // Management Status Calculation
        const hasAnemiaRisk = (p.sa === 1 || p.ma === 1 || p.sc === 1);
        const hasPihRisk = (p.pi === 1 || !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-'));
        const hasGdmRisk = (p.gd === 1 || p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes');
        const hasAnemiaMgmtGiven = (p.is_doses && p.is_doses.length > 0) || (p.fcm === 'Yes') || (p.bt && p.bt !== 'No');

        const isAnemiaDone = (p.fcm === 'Yes' || (p.bt && p.bt !== 'No' && p.bt !== '-') || (Array.isArray(p.is_doses) && p.is_doses.length >= 3));
        const isPihDone = !!(p.pih_mgmt && p.pih_mgmt.trim() !== '' && p.pih_mgmt !== 'None' && p.pih_mgmt !== '-');
        const isGdmDone = (p.gdm_mnt === 'Yes' || p.gdm_met === 'Yes' || p.gdm_ins === 'Yes' || p.gdm_mgmt_at === 'Yes');

        const hasAnyMgmt = isAnemiaDone || isPihDone || isGdmDone;
        const needsMgmt = hasAnemiaRisk || hasPihRisk || hasGdmRisk;
        const isModalDeath = (p.mat && p.mat !== 'No' && p.mat !== '-' && p.mat !== '') || (p.mat_death === true);

        // Determine active risk factor context:
        let targetRisk = null;
        if (currentTab === 'sa' || currentTab === 'ma' || currentTab === 'sc') {
            targetRisk = 'anemia';
        } else if (currentTab === 'pi') {
            targetRisk = 'pih';
        } else if (currentTab === 'gd') {
            targetRisk = 'gdm';
        } else if (kpiFilter) {
            if (['sa', 'ma', 'sc', 'severe', 'moderate', 'mild', 'resolved'].includes(kpiFilter)) {
                targetRisk = 'anemia';
            } else if (['pi', 'controlled', 'uncontrolled', 'preeclampsia'].includes(kpiFilter)) {
                targetRisk = 'pih';
            } else if (kpiFilter === 'gd') {
                targetRisk = 'gdm';
            }
        }

        let showAnemia = false;
        let showPih = false;
        let showGdm = false;

        let statusDone = false;
        let statusPending = false;
        let statusTitle = '';
        let statusSubtext = '';
        let statusBadge = '';

        if (targetRisk === 'anemia') {
            showAnemia = true;
            statusDone = isAnemiaDone;
            statusPending = !isAnemiaDone;
            statusTitle = isAnemiaDone ? 'Anemia Clinical Management: Done' : 'Anemia Clinical Management: Action Pending';
            statusSubtext = isAnemiaDone ? 'Inj. FCM, Blood Transfusion, or ≥3 Iron Sucrose doses recorded' : 'Pending IV Iron/FCM, Blood Transfusion, or ≥3 Iron Sucrose doses';
            statusBadge = isAnemiaDone ? '✓ DONE' : '⚠️ PENDING';
            titleEl.textContent = `💉 Anemia Clinical Management — ${p.n}`;
        } else if (targetRisk === 'pih') {
            showPih = true;
            statusDone = isPihDone;
            statusPending = !isPihDone;
            statusTitle = isPihDone ? 'PIH Hypertension Treatment: Prescribed' : 'PIH Hypertension Treatment: Action Pending';
            statusSubtext = isPihDone ? 'Antihypertensive therapy prescribed' : 'Pending Antihypertensive therapy (Methyldopa/Labetalol/Nifedipine)';
            statusBadge = isPihDone ? '✓ DONE' : '⚠️ PENDING';
            titleEl.textContent = `🟠 PIH Hypertension Management — ${p.n}`;
        } else if (targetRisk === 'gdm') {
            showGdm = true;
            statusDone = isGdmDone;
            statusPending = !isGdmDone;
            statusTitle = isGdmDone ? 'GDM Diabetes Management: Active' : 'GDM Diabetes Management: Action Pending';
            statusSubtext = isGdmDone ? 'MNT, Metformin, or Insulin therapy recorded' : 'Pending GDM Medical Nutrition Therapy or Pharmacotherapy';
            statusBadge = isGdmDone ? '✓ DONE' : '⚠️ PENDING';
            titleEl.textContent = `🔵 GDM Diabetes Management — ${p.n}`;
        } else {
            showAnemia = hasAnemiaRisk || hasAnemiaMgmtGiven;
            showPih = hasPihRisk;
            showGdm = hasGdmRisk;

            const isMgmtPending = needsMgmt && !hasAnyMgmt;
            statusDone = hasAnyMgmt;
            statusPending = isMgmtPending;
            statusTitle = hasAnyMgmt ? 'Clinical Management: Done / Prescribed' : (isMgmtPending ? 'Clinical Management: Action Pending' : 'Routine Clinical Monitoring');
            statusSubtext = hasAnyMgmt ? 'Medication / Therapy recorded for identified risk factor' : (isMgmtPending ? 'Pending IV Iron/FCM, Antihypertensive or GDM therapy' : 'No specialized medical therapy indicated');
            statusBadge = hasAnyMgmt ? '✓ DONE' : (isMgmtPending ? '⚠️ PENDING' : 'ROUTINE');
            titleEl.textContent = `💊 Clinical Management & Vitals — ${p.n}`;
        }

        // Apply popup card colour: Green if Done, Orange if Pending
        if (containerEl) {
            containerEl.classList.remove('modal-status-done', 'modal-status-pending');
            if (statusDone) {
                containerEl.classList.add('modal-status-done');
            } else if (statusPending) {
                containerEl.classList.add('modal-status-pending');
            }
        }

        bodyEl.innerHTML = `
            ${isModalDeath ? `
            <div style="background:#450a0a; color:#fecaca; border:1.5px solid #dc2626; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.8rem; line-height:1.4;">
                🖤 <strong>Maternal Death:</strong> ${(p.mat && p.mat.includes('(')) ? p.mat.replace(/^Yes\s*\(?|\)?$/gi, '').trim() : 'Reported'}
                ${p.mat_place ? ` | 🏥 <strong>Place:</strong> <strong style="color:#ffffff;">${p.mat_place}</strong>` : ''}
                ${p.mat_dir ? ` | ⚠️ <strong>Cause:</strong> <strong style="color:#fca5a5;">${p.mat_dir}</strong>` : ''}
            </div>
            ` : ''}

            <!-- 1. Top Location Strip (Village, Subcenter, PHC, Block) -->
            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.4rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.78rem;">
                <div><span style="color:#64748b; font-weight:700;">🏠 Village:</span> <strong style="color:#0f172a;">${cleanV}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏠 Subcenter:</span> <strong style="color:#0284c7;">${subName}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏛️ PHC:</span> <strong style="color:#0f172a;">${phcName}</strong></div>
                <div><span style="color:#64748b; font-weight:700;">🏥 Block:</span> <strong style="color:#0f172a;">${blockName}</strong></div>
            </div>

            <!-- 2. Unified Clinical Management Card (Consolidated, No Duplicate Banners) -->
            <div style="background:${statusDone ? '#ecfdf5' : (statusPending ? '#fff7ed' : '#f8fafc')}; border:1.5px solid ${statusDone ? '#10b981' : (statusPending ? '#f97316' : '#cbd5e1')}; border-radius:12px; padding:0.75rem; display:flex; flex-direction:column; gap:0.5rem;">
                <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px dashed ${statusDone ? '#a7f3d0' : (statusPending ? '#fed7aa' : '#cbd5e1')}; padding-bottom:0.4rem;">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span style="font-size:1.05rem;">${statusDone ? '🟢' : (statusPending ? '🟠' : 'ℹ️')}</span>
                        <strong style="font-size:0.825rem; color:${statusDone ? '#047857' : (statusPending ? '#c2410c' : '#334155')};">${statusTitle}</strong>
                    </div>
                    <span style="font-size:0.72rem; font-weight:800; padding:0.18rem 0.55rem; border-radius:6px; ${statusDone ? 'background:#10b981; color:#ffffff;' : (statusPending ? 'background:#f97316; color:#ffffff;' : 'background:#94a3b8; color:#ffffff;')}">
                        ${statusBadge}
                    </span>
                </div>
                <div style="font-size:0.75rem; color:${statusDone ? '#065f46' : (statusPending ? '#9a3412' : '#64748b')};">
                    ${statusSubtext}
                </div>

                ${showAnemia ? `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.45rem; background:#ffffff; border-radius:8px; padding:0.55rem 0.65rem; border:1px solid ${statusDone ? '#a7f3d0' : '#fed7aa'}; font-size:0.78rem;">
                    <div><span style="color:#64748b; font-weight:700;">Inj. FCM:</span> <strong style="color:#0f172a;">${p.fcm === 'Yes' ? `✓ Given ${p.fcm_fac ? `(${p.fcm_fac})` : ''}` : '✕ Not Given'}</strong></div>
                    <div><span style="color:#64748b; font-weight:700;">Blood Transfusion:</span> <strong style="color:#0f172a;">${p.bt || 'No'}</strong></div>
                    <div style="grid-column:1/-1;"><span style="color:#64748b; font-weight:700;">Iron Sucrose Doses:</span> <strong style="color:#0f172a;">${(p.is_doses && p.is_doses.length > 0) ? p.is_doses.join(', ') : 'None'}</strong></div>
                </div>` : ''}

                ${showPih ? `
                <div style="background:#ffffff; border-radius:8px; padding:0.55rem 0.65rem; border:1px solid ${statusDone ? '#a7f3d0' : '#fed7aa'}; font-size:0.78rem;">
                    <span style="color:#64748b; font-weight:700;">Antihypertensive Rx:</span> <strong style="color:${isPihDone ? '#059669' : '#ea580c'};">${isPihDone ? `✓ ${p.pih_mgmt}` : '✕ Not Recorded / Doctor Exam Pending'}</strong>
                </div>` : ''}

                ${showGdm ? `
                <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.35rem; background:#ffffff; border-radius:8px; padding:0.45rem 0.65rem; border:1px solid ${statusDone ? '#a7f3d0' : '#fed7aa'}; font-size:0.75rem; margin-bottom:0.35rem;">
                    <div><span style="color:#64748b; font-weight:700;">OGTT-1:</span> <strong style="color:${p.og1 && p.og1 > 140 ? '#dc2626' : '#0f172a'};">${p.og1 ? `${p.og1} mg/dL ${p.og1 > 140 ? '(High)' : ''}` : 'Not done'}</strong></div>
                    <div><span style="color:#64748b; font-weight:700;">OGTT-2:</span> <strong style="color:${p.og2 && p.og2 > 140 ? '#dc2626' : '#0f172a'};">${p.og2 ? `${p.og2} mg/dL ${p.og2 > 140 ? '(High)' : ''}` : 'Not done'}</strong></div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.35rem; background:#ffffff; border-radius:8px; padding:0.55rem 0.65rem; border:1px solid ${statusDone ? '#a7f3d0' : '#fed7aa'}; font-size:0.76rem;">
                    <div><span style="color:#64748b; font-weight:700;">MNT:</span> <strong>${p.gdm_mnt === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    <div><span style="color:#64748b; font-weight:700;">Metformin:</span> <strong>${p.gdm_met === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                    <div><span style="color:#64748b; font-weight:700;">Insulin:</span> <strong>${p.gdm_ins === 'Yes' ? '✓ Yes' : '✕ No'}</strong></div>
                </div>` : ''}

                ${(!showAnemia && !showPih && !showGdm) ? `
                <div style="background:#ffffff; border-radius:8px; padding:0.5rem; text-align:center; font-size:0.76rem; color:#64748b;">
                    No specialized medical drug therapy indicated for this patient (Routine Antenatal Follow-up).
                </div>` : ''}
            </div>

            <!-- 3. Risk Factor & Delivery Status -->
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.78rem; display:flex; flex-direction:column; gap:0.3rem;">
                <div><strong style="color:#991b1b;">⚠️ Identified Risk Factor(s):</strong> <span style="font-weight:700; color:#b91c1c;">${p.f || 'High Risk Pregnancy'}</span></div>
                <div style="font-size:0.76rem; color:#475569; border-top:1px dashed #fecaca; padding-top:0.3rem;">
                    ${isDelivered ? `🏥 <strong>Delivery:</strong> <strong style="color:#059669;">${p.d || '-'}</strong> (${p.del_cat || 'Facility'}) ${p.del_date && p.del_date !== '-' ? `on <strong>${formatDateDDMMYYYY(p.del_date)}</strong>` : ''}` : `🤰 <strong>Delivery Status:</strong> <span style="color:#0284c7; font-weight:700;">Pregnant (Antenatal Care)</span>`}
                </div>
            </div>

            <!-- 4. Admission Vitals (For Delivered Cases) -->
            ${isDelivered ? `
            <div class="modal-vitals-bar" style="margin-bottom:0;">
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">🩸 Hb on LR Admission</span>
                    <span class="modal-vitals-val" style="color:#dc2626; font-size:0.82rem;">${(p.lr_hb !== null && p.lr_hb !== undefined) ? p.lr_hb + ' g/dL' : ((p.hb_lr !== null && p.hb_lr !== undefined) ? p.hb_lr + ' g/dL' : 'Not Recorded')}</span>
                </div>
                <div class="modal-vitals-item">
                    <span class="modal-vitals-label">🩺 BP at Admission</span>
                    <span class="modal-vitals-val" style="color:#0284c7; font-size:0.82rem;">${p.bp_adm ? p.bp_adm + ' mmHg' : 'Not Recorded'}</span>
                </div>
            </div>` : ''}

            <!-- 5. ANM & CHO Direct Contact Buttons -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:0.55rem 0.75rem; font-size:0.78rem;">
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:0.45rem;">
                    <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                        <span style="color:#166534; font-weight:700;">👩‍⚕️ ANM:</span> <strong style="color:#0f172a;">${p.anm_n || 'Not Mapped'}</strong>
                        ${p.anm_p ? `<a href="tel:${p.anm_p}" class="btn-call-chip btn-call-anm" title="Call ANM">📞 Call (${p.anm_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                    </div>
                    <div style="display:flex; align-items:center; gap:0.35rem; flex-wrap:wrap;">
                        <span style="color:#0369a1; font-weight:700;">🩺 CHO:</span> <strong style="color:#0f172a;">${p.cho_n || 'Not Mapped'}</strong>
                        ${p.cho_p ? `<a href="tel:${p.cho_p}" class="btn-call-chip btn-call-cho" title="Call CHO">📞 Call (${p.cho_p})</a>` : '<span style="color:#94a3b8; font-size:0.75rem;">(No Phone)</span>'}
                    </div>
                </div>
            </div>
        `;

        overlay.style.display = 'flex';
    };

    window.closeMgmtModal = function() {
        const overlay = document.getElementById('modal-mgmt-overlay');
        if (overlay) overlay.style.display = 'none';
        const containerEl = document.getElementById('modal-mgmt-container') || overlay?.querySelector('.uhrp-modal-container');
        if (containerEl) {
            containerEl.classList.remove('modal-status-done', 'modal-status-pending');
        }
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
    restoreDashboardState();
    setupTabs();
    // Synchronize UI active states with restored state
    document.querySelectorAll('.risk-tab-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-tab') === currentTab);
    });
    switchMainView(currentMainView, true);
    setupSorting();
    setupEventListeners();
    filterProtocolCards(currentTab);
    renderLineList();
    renderDpmuOfficialTables();
    renderSankalpTable();
    if (currentMainView === 'analytics') {
        const filtered = getFilteredPatients();
        let tabPatients = currentTab === 'all' ? filtered : (currentTab === 'anc' ? getFilteredAncPatients() : (currentTab === 'ma' ? filtered.filter(p => p.ma === 1) : filtered.filter(p => p[currentTab] === 1)));
        setTimeout(() => renderAnalyticsCharts(tabPatients), 50);
    }
    updateFilterChipActiveStates();
    handleInitialHash();
    hideAppLoader();
});
