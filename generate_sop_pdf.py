"""
Ultra High Risk Pregnancy (UHRP) Dashboard — Documentation & SOP PDF Generator
Generates a comprehensive clinical and technical architecture PDF using ReportLab.
Integrates directly with update_dashboard.py via build_sop_pdf(sop_path).
"""
import os
import sys
import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

WORKSPACE = os.path.dirname(os.path.abspath(__file__))

# Design Palette — Rose & Slate Executive Theme
PRIMARY = colors.HexColor('#ff2a6d')       # Neon Pink / Rose
PRIMARY_DARK = colors.HexColor('#e01e5a')
SLATE_HEADER = colors.HexColor('#1e2538')   # Dark Slate
SECONDARY = colors.HexColor('#475569')      # Slate
MUTED = colors.HexColor('#64748b')
BG_CANVAS = colors.HexColor('#fcf1f4')      # Blush Canvas
BORDER_COLOR = colors.HexColor('#e2e8f0')
SUCCESS = colors.HexColor('#10b981')       # Emerald
INFO = colors.HexColor('#00b4d8')          # Cyan
WARNING = colors.HexColor('#f77f00')       # Orange
PURPLE = colors.HexColor('#7928ca')        # Purple
CRIMSON = colors.HexColor('#dc2626')       # Red / Overdue
LIGHT_GRAY = colors.HexColor('#f8fafc')

class NumberedCanvas(canvas.Canvas):
    """Canvas that computes total pages dynamically and adds header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, total_pages):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED)

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(40, A4[1] - 30, "UHRP Care Dashboard — Clinical SOP & Technical Architecture Guide")
            self.drawRightString(A4[0] - 40, A4[1] - 30, "West Nimar (Khargone)")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(40, A4[1] - 34, A4[0] - 40, A4[1] - 34)

        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(40, 25, "National Health Mission • Dept. of Health & Family Welfare, MP • Sankalp")
        self.drawRightString(A4[0] - 40, 25, page_str)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(40, 35, A4[0] - 40, 35)

        self.restoreState()


def build_sop_pdf(output_path=None):
    if output_path is None:
        output_path = os.path.join(WORKSPACE, "UHRP_Dashboard_SOP.pdf")

    # Document Setup (margins: 40pt)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=SLATE_HEADER,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=PRIMARY_DARK,
        spaceAfter=10
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=SLATE_HEADER,
        spaceBefore=11,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=PRIMARY,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=SLATE_HEADER,
        spaceAfter=4
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=2.5
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        backColor=LIGHT_GRAY,
        borderPadding=3,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=SLATE_HEADER
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=SLATE_HEADER
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#78350f')
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------------------
    meta_box = [
        [
            Paragraph("<b>DISTRICT:</b> West Nimar (Khargone), MP", table_cell_style),
            Paragraph("<b>DEVELOPER:</b> Dr. Vikar Saiyad (Sankalp)", table_cell_style),
            Paragraph(f"<b>DATE:</b> {datetime.datetime.now().strftime('%d-%m-%Y')}", table_cell_style)
        ],
        [
            Paragraph("<b>TOTAL ANC:</b> Active District Registry", table_cell_style),
            Paragraph("<b>INTERVENTION:</b> Ultra High Risk Pregnancy (UHRP)", table_cell_style),
            Paragraph("<b>EDITION:</b> Version 5.0 (Section-Wise Logic)", table_cell_style)
        ]
    ]
    t_meta = Table(meta_box, colWidths=[175, 175, 165])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_GRAY),
        ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))

    story.append(Paragraph("Ultra High Risk Pregnancy (UHRP) Care Dashboard", title_style))
    story.append(Paragraph("Standard Operating Procedure (SOP), Clinical Algorithms & Technical Architecture", subtitle_style))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 1: EXECUTIVE OVERVIEW & CARE CASCADE
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Executive Overview & Maternal Health Mission", h1_style))
    story.append(Paragraph(
        "The Ultra High Risk Pregnancy (UHRP) Care Dashboard is an operational decision-support command center deployed across the 9 administrative blocks of West Nimar (Khargone) district, Madhya Pradesh (Barwaha, Bhagwanpura, Bhikangaon, Gogaon, Jhiranya, Kasrawad, Khargone, Maheshwar, and Segaon). Its objective is the systematic reduction of maternal mortality and neonatal deaths by identifying pregnant women with clinical red flags, tracking longitudinal hemoglobin and blood pressure trajectories across 12 Antenatal Care (ANC) visits, ensuring timely parenteral iron / antihypertensive therapies, and orchestrating planned institutional deliveries.",
        body_style
    ))

    cascade_table_data = [
        [Paragraph("Funnel Tier", table_header_style), Paragraph("Target Cohort", table_header_style), Paragraph("Clinical Criteria", table_header_style), Paragraph("Operational Action / Treatment Focus", table_header_style)],
        [Paragraph("<b>Total ANC Registered</b>", table_cell_style), Paragraph("District Registry", table_cell_style), Paragraph("Universal 1st Trimester Booking", table_cell_style), Paragraph("Universal screening, IFA supplementation, baseline Hb & BP recording", table_cell_style)],
        [Paragraph("<b>High Risk Flagged (HRP)</b>", table_cell_style), Paragraph("Identified at Subcenter", table_cell_style), Paragraph("Screened by ANM / CHO", table_cell_style), Paragraph("Routine ANC + PMSMA referral on 9th of each month", table_cell_style)],
        [Paragraph("<b>Ultra HRP Master Cohort</b>", table_cell_bold), Paragraph("<b>Active UHRP Line List</b>", table_cell_bold), Paragraph("<b>Critical Red Flag Conditions</b>", table_cell_bold), Paragraph("Intensive 12-visit tracking, specialist MO exam, and planned delivery", table_cell_style)],
        [Paragraph("<b>Severe Anemia (&lt; 7.0 g/dL)</b>", table_cell_style), Paragraph("Critical Anemia", table_cell_style), Paragraph("Hb &lt; 7.0 g/dL at any visit", table_cell_style), Paragraph("Immediate FRU referral: Inj. FCM 1000mg, IV Iron Sucrose, or PRBC", table_cell_style)],
        [Paragraph("<b>Moderate Anemia (7.0-9.9)</b>", table_cell_style), Paragraph("Parenteral Iron Cohort", table_cell_style), Paragraph("Hb 7.0 – 9.9 g/dL", table_cell_style), Paragraph("Prompt IV Iron Sucrose / FCM initiation before 3rd trimester labor", table_cell_style)],
        [Paragraph("<b>PIH (Hypertension)</b>", table_cell_style), Paragraph("Hypertensive Disorders", table_cell_style), Paragraph("BP ≥ 140/90 mmHg", table_cell_style), Paragraph("Tab Labetalol 100mg BD / Methyldopa, urine albumin, pre-eclampsia alert", table_cell_style)],
        [Paragraph("<b>Delivery Overdue</b>", table_cell_bold), Paragraph("<b>Past EDD Cohort</b>", table_cell_bold), Paragraph("<b>EDD &lt; Today & Del Pending</b>", table_cell_bold), Paragraph("Urgent facility referral, NST, biophysical profile, induction of labor", table_cell_style)]
    ]
    t_cascade = Table(cascade_table_data, colWidths=[115, 80, 110, 210])
    t_cascade.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_cascade)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 2: SECTION-WISE DASHBOARD LOGIC & CLINICAL PROTOCOLS
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Section-Wise Dashboard Logic & Clinical Protocols", h1_style))
    story.append(Paragraph(
        "The dashboard organizes maternal care into distinct operational sections, each governed by strict NHM clinical algorithms and exact Excel source column mappings:",
        body_style
    ))

    story.append(Paragraph("A. Patient Line List — Risk Factor Identification (Source Reports & Columns)", h2_style))
    risk_mapping_data = [
        [Paragraph("Risk Factor", table_header_style), Paragraph("Source Report", table_header_style), Paragraph("Excel Column(s)", table_header_style), Paragraph("Exact Identification Logic", table_header_style)],
        [Paragraph("<b>Severe Anemia (SA)</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col AH</b> (Col 34)", table_cell_style), Paragraph("<code>If severe anemia (Yes/No) == 'Yes'</code> (and/or ANC visit Hb &lt; 7.0 g/dL)", table_cell_style)],
        [Paragraph("<b>Moderate Anemia (MA)</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col AG</b> (Col 33)", table_cell_style), Paragraph("<code>If moderate anemia (Yes/No) == 'Yes'</code> (and/or ANC visit Hb 7.0–9.9 g/dL)", table_cell_style)],
        [Paragraph("<b>PIH (Hypertension)</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col AQ</b> (Col 43)", table_cell_style), Paragraph("<code>Identified with PIH (Yes/No) == 'Yes'</code> (and/or ANC BP ≥ 140/90)", table_cell_style)],
        [Paragraph("<b>GDM (Diabetes)</b>", table_cell_bold), Paragraph("ANC + HRP Reports", table_cell_style), Paragraph("<b>Col FE &amp; FG</b> (ANC)<br/><b>Col AS</b> (HRP)", table_cell_style), Paragraph("ANC Linelist <code>OGTT 1</code> (Col FE) or <code>OGTT 2</code> (Col FG) <b>≥ 140 mg/dL</b>, OR HRP <code>GDM Positive</code> on treatment / with other 6 risks", table_cell_style)],
        [Paragraph("<b>Previous LSCS</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col AD</b> (Col 30)", table_cell_style), Paragraph("<code>Previous LSCS == 'Yes'</code>", table_cell_style)],
        [Paragraph("<b>Sickle Cell Disease</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col W</b> (Col 23)", table_cell_style), Paragraph("<code>Result of sickle cell test</code> contains 'Disease' or 'Sickle Beta' (excludes Trait)", table_cell_style)],
        [Paragraph("<b>Teenage Pregnancy</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col Q</b> (Col 17)", table_cell_style), Paragraph("Numeric <code>Age ≤ 17</code> years", table_cell_style)],
        [Paragraph("<b>BOH (Complications)</b>", table_cell_bold), Paragraph("HRP Line List", table_cell_style), Paragraph("<b>Col AC</b> (Col 29)", table_cell_style), Paragraph("<code>Last Pregnancy Complications</code> contains <b>Neonate Death</b> or <b>Stillbirth</b> ONLY", table_cell_style)]
    ]
    t_risk_map = Table(risk_mapping_data, colWidths=[95, 80, 85, 255])
    t_risk_map.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_risk_map)
    story.append(Spacer(1, 5))

    story.append(Paragraph("B. Clinical Management Done Logic (Anemia, PIH, GDM)", h2_style))
    story.append(Paragraph("• <b>Anemia Management Done (SA, MA, Sickle Cell):</b> Marked <i>Done</i> if ANY ONE of the following is recorded in the HRP Line List: (1) <b>At least 3 Iron Sucrose doses</b> documented with valid dates across <b>Cols AI–AM</b> (Doses 1–5), OR (2) <b>Inj. FCM given == 'Yes'</b> in <b>Col AO</b>, OR (3) <b>Blood Transfusion units &gt; 0</b> in <b>Col AN</b>. Patients with 0, 1, or 2 Iron Sucrose doses (and no FCM/BT) remain <i>Management Pending</i>.", bullet_style))
    story.append(Paragraph("• <b>PIH Management Done:</b> Marked <i>Done</i> if <b>Col AR</b> (<code>PIH Management Done</code>) contains a valid medication/regimen (e.g., Labetalol, Methyldopa, MgSO4, Nifedipine).", bullet_style))
    story.append(Paragraph("• <b>GDM Management Done:</b> Marked <i>Done</i> if any of <b>Col AT</b> (<code>GDM Mangement</code>), <b>Col AX</b> (<code>On MNT</code>), <b>Col AY</b> (<code>On Metformin</code>), or <b>Col AZ</b> (<code>On Insulin</code>) is marked <code>'Yes'</code>.", bullet_style))
    story.append(Paragraph("• <b>Anemia Staging (4-Tier):</b> Resolved (≥ 11.0 g/dL), Mild (10.0–10.9 g/dL), Moderate (7.0–9.9 g/dL), Severe (&lt; 7.0 g/dL) evaluated from the latest recorded ANC visit Hb.", bullet_style))

    story.append(Spacer(1, 3))
    story.append(Paragraph("C. 12 ANC Visit Summary, Visit 0 & Triage Alerts", h2_style))
    story.append(Paragraph("• <b>Visit 0 KPI Card:</b> Placed before Visit 1 in the 12 ANC Visit Summary strip; counts and filters pregnant women who have <b>0 ANC visits</b> recorded across all 12 visit date slots.", bullet_style))
    story.append(Paragraph("• <b>Delivery Overdue (Past EDD):</b> Identified when <code>p.del === 0</code> and EDD &lt; today. <i>Maternal death and abortion cases are strictly excluded.</i> Maternal death GA is frozen at Date of Death; abortion GA is frozen at last recorded ANC visit.", bullet_style))
    story.append(Paragraph("• <b>Missed 2+ Consecutive ANC Visits:</b> Triggered when elapsed time since last visit &gt; 70 days OR ≥ 2 consecutive scheduled visit gaps occur.", bullet_style))
    story.append(Paragraph("• <b>Not Seen by Medical Officer (MO):</b> Triggered when all attended visits were conducted exclusively by ANM/CHO without MO/Gynecologist examination.", bullet_style))

    story.append(Spacer(1, 3))
    story.append(Paragraph("D. Protocol & Counselling Section (गृह भेंट परामर्श बिंदु)", h2_style))
    story.append(Paragraph("Dedicated clinical protocols and standardized Hindi counselling points are embedded across all 9 risk factor categories for ANM/CHO home-visit guidance (high-iron diet, Vitamin C pairing, PIH warning signs, left-lateral rest, hydration, and 108 emergency referral).", bullet_style))

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 3: DPMU & CHARTS SECTION LOGIC
    # -------------------------------------------------------------------------
    story.append(Paragraph("3. DPMU Section & YoY Charts Section Logic", h1_style))

    story.append(Paragraph("A. DPMU Section (Official ANMOL Verification Tables)", h2_style))
    story.append(Paragraph("• Located as a dedicated section immediately after Protocol &amp; Counselling. Computes block-wise ANMOL official verification tables (Tables 1–4) with dynamic trimester exclusion toggles (e.g., excluding 1st trimester Moderate Anemia cases from parenteral iron denominators where clinically not indicated).", bullet_style))

    story.append(Spacer(1, 3))
    story.append(Paragraph("B. Charts Section (YoY Comparison & SVG Export)", h2_style))
    story.append(Paragraph("All charts render in Financial Year order (Apr–Mar) with <b>2025-26 (Previous FY)</b> displayed first (left/red) and <b>2026-27 (Current FY)</b> displayed second (right/blue), complete with YoY % change labels (green positive, red negative) and direct <b>SVG download</b> buttons:", bullet_style))
    story.append(Paragraph("• <b>Chart 1 — Monthly ANC Registrations Trend &amp; Risk Identification Rate (%):</b> Uses <code>ANC_Line_List_Report</code> <b>Col N</b> (<code>PW Registration Date</code>, falling back to earliest ANC Visit Date / LMP) as the monthly denominator. When a specific risk factor tab is active, plots <code>(Monthly Risk Cases / Monthly ANC Registrations) × 100</code>.", bullet_style))
    story.append(Paragraph("• <b>Chart 2 — Monthly Post Term Deliveries (&gt;42 Weeks) Rate:</b> Bar chart tracking deliveries where Gestational Age at delivery exceeds <b>294 days (&gt;42 weeks)</b> as a percentage of total monthly deliveries YoY.", bullet_style))
    story.append(Paragraph("• <b>Chart 3 — Delivery Place Distribution (YoY Comparison):</b> Side-by-side donut charts (2025-26 left, 2026-27 right) categorizing institutional vs home deliveries (DH, CHC, PHC, Private, Home, In Transit) with interactive Gestational Age filters (ALL, Pre-term &lt;34 Wks, Late Term &gt;42 Wks).", bullet_style))
    story.append(Paragraph("• <b>Chart 4 — Type of Delivery (YoY Comparison):</b> Side-by-side pie charts (2025-26 left, 2026-27 right) sourced from <code>Delivery_Line_List</code> <b>Col AB</b> showing % split of Vaginal Delivery, Caesarean (LSCS), and Assisted Delivery.", bullet_style))

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 4: MOBILE-FIRST ARCHITECTURE & SESSION-ISOLATED STATE
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Mobile-First Popups & User-Isolated Session State", h1_style))
    story.append(Paragraph(
        "For frontline ANMs, CHOs, and Block Medical Officers reviewing cases on smartphones, the dashboard provides native mobile cards and minimal modal popups with zero cross-user filter leakage:",
        body_style
    ))

    story.append(Paragraph("• <b>Session-Only Filter Isolation (sessionStorage):</b> Active filter selections (Block, Year, Category, Trimester, Visit) are persisted strictly in <code>sessionStorage</code> rather than global <code>localStorage</code> or URL hash parameters. Every user and browser tab starts clean and operates independently without affecting other users or shared links.", bullet_style))
    story.append(Paragraph("• <b>Mobile 0-Cases Empty State Handling:</b> When applied filters yield 0 matching patients, both the desktop table and mobile native card container (<code>#patient-cards-container</code>) are immediately cleared to display the empty-state notice.", bullet_style))
    story.append(Paragraph("• <b>12 ANC Visit &amp; Management Popups:</b> Mobile popups display the 12-visit timeline, unified Subcenter + ANM/CHO one-touch calling (<code>tel:</code>), and color-coded Clinical Management status cards (green Done / orange Pending).", bullet_style))

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 5: DATA PIPELINE & ETL ARCHITECTURE
    # -------------------------------------------------------------------------
    story.append(Paragraph("5. Data Ingestion Pipeline & Field Extraction Mappings", h1_style))
    story.append(Paragraph(
        "Data synchronization is executed by <code>update_dashboard.py</code>. The script ingests raw Excel reports exported from the state pregnancy tracking software and builds the global data structure in <code>data.js</code>:",
        body_style
    ))

    etl_mapping_data = [
        [Paragraph("Target Field", table_header_style), Paragraph("Source Folder / Excel Column", table_header_style), Paragraph("Transform / Normalization Logic", table_header_style)],
        [Paragraph("<code>id</code> (MP ID)", table_cell_bold), Paragraph("HRP Line list (Col 0 / 'MP ID')", table_cell_style), Paragraph("String cast, whitespace stripped, primary key", table_cell_style)],
        [Paragraph("<code>hb_v</code> (12 Hb)", table_cell_bold), Paragraph("HRP Line list (Cols 15, 19, 23...)", table_cell_style), Paragraph("Float parse, invalid non-numerics mapped to <code>null</code>", table_cell_style)],
        [Paragraph("<code>bp_v</code> (12 BP)", table_cell_bold), Paragraph("HRP Line list (Cols 16, 20, 24...)", table_cell_style), Paragraph("Parsed as 'SYS/DIA', whitespace stripped", table_cell_style)],
        [Paragraph("<code>v_dates</code> (Dates)", table_cell_bold), Paragraph("HRP Line list (Cols 14, 18, 22...)", table_cell_style), Paragraph("Normalized to 'YYYY-MM-DD' format", table_cell_style)],
        [Paragraph("<code>mo_v</code> (Provider)", table_cell_bold), Paragraph("HRP Line list (Cols 17, 21, 25...)", table_cell_style), Paragraph("Classified as MO/Specialist vs ANM/CHO/FLW", table_cell_style)],
        [Paragraph("<code>is_doses</code>", table_cell_bold), Paragraph("HRP Line list (Cols BA to BF)", table_cell_style), Paragraph("List of dates where Iron Sucrose injection was given", table_cell_style)],
        [Paragraph("<code>fcm</code> / <code>bt</code>", table_cell_bold), Paragraph("HRP Line list (Cols BG, BH, BI)", table_cell_style), Paragraph("Extracted as 'Yes'/'No', facility name, and unit counts", table_cell_style)],
        [Paragraph("<code>mat</code> (Death)", table_cell_bold), Paragraph("HRP Line list (Maternal Death col)", table_cell_style), Paragraph("Date of death extracted from string <code>Yes (DD-MM-YYYY)</code>", table_cell_style)],
        [Paragraph("<code>del_cat</code>", table_cell_bold), Paragraph("Delivery linelist / HRP Line list", table_cell_style), Paragraph("Reclassified into DH, SDH, CHC, PHC, Private, Home, In Transit", table_cell_style)]
    ]
    t_etl = Table(etl_mapping_data, colWidths=[90, 160, 265])
    t_etl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_etl)
    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 6: UI ARCHITECTURE & NAVIGATION
    # -------------------------------------------------------------------------
    story.append(Paragraph("6. UI Architecture & Responsive Navigation System", h1_style))
    story.append(Paragraph(
        "The interface incorporates Apple iOS Liquid Glass design aesthetics, featuring frosted glass panels (<code>backdrop-filter: blur(20px)</code>), subtle borders, high-contrast typography, and a 4-view navigation dock:",
        body_style
    ))

    views_data = [
        [Paragraph("Navigation View", table_header_style), Paragraph("DOM Container", table_header_style), Paragraph("Clinical & Operational Purpose", table_header_style)],
        [Paragraph("<b>Ultra HRP</b>", table_cell_bold), Paragraph("<code>#view-uhrp</code>", table_cell_style), Paragraph("Primary command center with 8 risk factor tabs, NHM Hindi protocol box, triage KPI cards, and full 12-visit expandable drawer line list.", table_cell_style)],
        [Paragraph("<b>Moderate Anemia</b>", table_cell_bold), Paragraph("<code>#view-moderate</code>", table_cell_style), Paragraph("Dedicated triage for pregnant women with Hb 7.0–9.9 g/dL. Tracks parenteral iron initiation, 3rd trimester urgency, and delivery status.", table_cell_style)],
        [Paragraph("<b>Indicators</b>", table_cell_bold), Paragraph("<code>#view-indicators</code>", table_cell_style), Paragraph("District-wide visual charts: Management by risk/block, MO checkups, geographic block cases, and institutional delivery place breakdown.", table_cell_style)],
        [Paragraph("<b>All ANC</b>", table_cell_bold), Paragraph("<code>#view-anc</code>", table_cell_style), Paragraph("Total ANC registry line list with actionable KPI cards (Total Registered, High Risk, Delivery Overdue, Missed 2+ ANC, Not Seen by MO).", table_cell_style)]
    ]
    t_views = Table(views_data, colWidths=[100, 100, 315])
    t_views.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_views)

    story.append(Spacer(1, 3))
    story.append(Paragraph("• <b>Desktop Navigation:</b> Persistent left sidebar with live counter badges and clean developer attribution.", bullet_style))
    story.append(Paragraph("• <b>Mobile Navigation:</b> Floating bottom pill navigation dock (blurred glass, rounded 36px) with touch-optimized targets.", bullet_style))

    story.append(Spacer(1, 8))

    # -------------------------------------------------------------------------
    # SECTION 7: MAINTENANCE & REFRESH WORKFLOW
    # -------------------------------------------------------------------------
    story.append(Paragraph("7. Maintenance & Operational Guide for Health Administrators", h1_style))
    story.append(Paragraph(
        "To update data on a recurring monthly or weekly basis, health informatics officers follow this standardized workflow:",
        body_style
    ))

    story.append(Paragraph("Step 1: File Ingestion", h2_style))
    story.append(Paragraph("1. Download the latest Excel reports and place them into their respective folders: <code>HRP line list/</code>, <code>ANC line list/</code>, and <code>Delivery linelist/</code>.", bullet_style))
    story.append(Paragraph("2. Ensure new files follow the standard column format exported from the maternal tracking portal.", bullet_style))

    story.append(Paragraph("Step 2: Automated Pipeline Execution", h2_style))
    story.append(Paragraph("1. Open PowerShell or Command Prompt in the project directory and execute: <code>python update_dashboard.py</code>", bullet_style))
    story.append(Paragraph("2. The script cleans raw records, merges deliveries, parses 12-visit longitudinal vitals, computes gestational age and delivery overdue metrics, outputs fresh <code>data.js</code>, and automatically recompiles this SOP documentation PDF.", bullet_style))

    story.append(Paragraph("Step 3: Verification & Deployment", h2_style))
    story.append(Paragraph("1. Open <code>index.html</code> in any modern browser (Chrome, Edge, Safari, Firefox) to verify KPI counts and charts.", bullet_style))
    story.append(Paragraph("2. Push commits to GitHub repository to automatically publish updates to GitHub Pages.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated PDF documentation: {output_path}")

if __name__ == "__main__":
    sop_file = os.path.join(WORKSPACE, "UHRP_Dashboard_SOP.pdf")
    build_sop_pdf(sop_file)
