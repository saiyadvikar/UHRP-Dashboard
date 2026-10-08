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

# Design Palette — Sample 2 Theme
PRIMARY = colors.HexColor('#ff2a6d')       # Neon Pink / Rose
PRIMARY_DARK = colors.HexColor('#e01e5a')
SLATE_HEADER = colors.HexColor('#1e2538')   # Dark Slate
SECONDARY = colors.HexColor('#475569')      # Slate
MUTED = colors.HexColor('#64748b')
BG_CANVAS = colors.HexColor('#fcf1f4')      # Blush Canvas
BORDER_COLOR = colors.HexColor('#f0e6ec')
SUCCESS = colors.HexColor('#10b981')       # Emerald
INFO = colors.HexColor('#00b4d8')          # Cyan
WARNING = colors.HexColor('#f77f00')       # Orange
PURPLE = colors.HexColor('#7928ca')        # Purple
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
            self.drawString(40, A4[1] - 30, "UHRP Care Dashboard — Clinical & Technical Architecture Guide")
            self.drawRightString(A4[0] - 40, A4[1] - 30, "West Nimar (Khargone)")
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(40, A4[1] - 34, A4[0] - 40, A4[1] - 34)

        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {total_pages}"
        self.drawString(40, 25, "National Health Mission • Dept. of Health & Family Welfare, MP")
        self.drawRightString(A4[0] - 40, 25, page_str)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(40, 35, A4[0] - 40, 35)

        self.restoreState()


def build_sop_pdf(output_path=None):
    if output_path is None:
        output_path = os.path.join(WORKSPACE, "UHRP_Dashboard_Architecture_and_Logic.pdf")

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
        fontSize=20,
        leading=24,
        textColor=SLATE_HEADER,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=PRIMARY_DARK,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=SLATE_HEADER,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=SLATE_HEADER,
        spaceAfter=5
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0f172a'),
        backColor=LIGHT_GRAY,
        borderPadding=4,
        spaceAfter=5
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=SLATE_HEADER
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=SLATE_HEADER
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#78350f')
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER / HEADER BANNER
    # -------------------------------------------------------------------------
    meta_box = [
        [
            Paragraph("<b>DISTRICT:</b> West Nimar (Khargone), MP", table_cell_style),
            Paragraph("<b>COHORT:</b> 2,042 High Risk Mothers", table_cell_style),
            Paragraph(f"<b>DATE:</b> {datetime.datetime.now().strftime('%d-%m-%Y')}", table_cell_style)
        ],
        [
            Paragraph("<b>TOTAL ANC:</b> 17,475 Registrations", table_cell_style),
            Paragraph("<b>SCREENED HRP:</b> 13,066 (74.8%)", table_cell_style),
            Paragraph("<b>VERSION:</b> 3.0 (Liquid Glass Theme)", table_cell_style)
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
    story.append(Paragraph("Technical Architecture, Clinical Algorithms & Maintenance Guide", subtitle_style))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 1: EXECUTIVE OVERVIEW & CARE CASCADE
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Executive Overview & Continuum of Maternal Care", h1_style))
    story.append(Paragraph(
        "The Ultra High Risk Pregnancy (UHRP) portal is an operational decision-support command center deployed across the 9 administrative blocks of West Nimar (Khargone) district, Madhya Pradesh. Its mission is to prevent maternal mortality and neonatal deaths by identifying pregnant women with clinical red flags, tracking longitudinal hemoglobin and blood pressure trajectories across 12 Antenatal Care (ANC) visits, ensuring parenteral iron/antihypertensive administration, and orchestrating timely institutional deliveries.",
        body_style
    ))

    cascade_table_data = [
        [Paragraph("Funnel Tier", table_header_style), Paragraph("Cohort Size", table_header_style), Paragraph("% Total ANC", table_header_style), Paragraph("Clinical Management Focus", table_header_style)],
        [Paragraph("<b>Total ANC Registered</b>", table_cell_style), Paragraph("17,475", table_cell_style), Paragraph("100.0%", table_cell_style), Paragraph("Universal screening, IFA distribution, baseline Hb & BP estimation", table_cell_style)],
        [Paragraph("<b>HRP Screened Flagged</b>", table_cell_style), Paragraph("13,066", table_cell_style), Paragraph("74.8%", table_cell_style), Paragraph("Initial risk factor identification by ANM/CHO at Subcenter/PHC level", table_cell_style)],
        [Paragraph("<b>Ultra HRP Master Cohort</b>", table_cell_bold), Paragraph("<b>2,042</b>", table_cell_bold), Paragraph("<b>11.7%</b>", table_cell_bold), Paragraph("Critical conditions under active management protocol (7 high-risk factors)", table_cell_style)],
        [Paragraph("<b>Moderate Anemia (7.0 - 9.9)</b>", table_cell_style), Paragraph("425", table_cell_style), Paragraph("2.4%", table_cell_style), Paragraph("Parenteral iron therapy (Iron Sucrose/FCM) before 3rd trimester labor", table_cell_style)],
        [Paragraph("<b>Severe Anemia (< 7.0 g/dL)</b>", table_cell_style), Paragraph("211", table_cell_style), Paragraph("1.2%", table_cell_style), Paragraph("Immediate FRU referral, IV Iron Sucrose/FCM, or Blood Transfusion", table_cell_style)],
        [Paragraph("<b>PIH (Hypertension)</b>", table_cell_style), Paragraph("232", table_cell_style), Paragraph("1.3%", table_cell_style), Paragraph("Antihypertensive therapy (Tab Labetalol 100mg BD), proteinuria monitoring", table_cell_style)]
    ]
    t_cascade = Table(cascade_table_data, colWidths=[130, 65, 65, 255])
    t_cascade.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_cascade)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 2: CLINICAL CRITERIA & CLASSIFICATION LOGIC
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Clinical Protocols & Triage Classification Algorithms", h1_style))
    story.append(Paragraph(
        "The dashboard evaluates patient trajectories through deterministic rule engines grounded in National Health Mission (NHM) and Anemia Mukt Bharat guidelines:",
        body_style
    ))

    story.append(Paragraph("A. Severe & Moderate Anemia Protocol (Hb Tiers)", h2_style))
    story.append(Paragraph("• <b>Resolved Anemia (&gt; 11.0 g/dL):</b> Patient initially presented with severe/moderate anemia but latest recorded Hb reached normal range (≥ 11.0 g/dL).", bullet_style))
    story.append(Paragraph("• <b>Mild Anemia (10.0 – 10.9 g/dL):</b> Patient transitioning toward normal Hb; requires continuation of double-dose IFA tablets.", bullet_style))
    story.append(Paragraph("• <b>Moderate Anemia (7.0 – 9.9 g/dL):</b> High clinical risk of entering labor with depleted iron stores. Requires prompt initiation of IV Iron Sucrose (100mg elemental iron per dose, alternate days) or Inj. Ferric Carboxymaltose (FCM 1000mg single infusion).", bullet_style))
    story.append(Paragraph("• <b>Severe Anemia (&lt; 7.0 g/dL):</b> Critical obstetric alert. Patient requires immediate referral to First Referral Unit (FRU) or District Hospital Khargone for parenteral iron therapy or packed red blood cell (PRBC) transfusion.", bullet_style))
    story.append(Paragraph("• <b>Missed 2+ Consecutive ANC Visits:</b> Defined algorithmically as: (a) gap of ≥ 70 days between last recorded visit and current date, OR (b) two or more consecutive missed visits within the 12-visit schedule.", bullet_style))
    story.append(Paragraph("• <b>Not Seen by Medical Officer (MO):</b> Patient has attended ANC checkups exclusively by ANM, CHO, or Nursing Officer without clinical examination by a Medical Officer, PGMO, or Gynecologist.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("B. Pregnancy-Induced Hypertension (PIH) & Pre-Eclampsia", h2_style))
    story.append(Paragraph("• <b>Controlled BP (&lt; 140/90 mmHg):</b> Patient on antihypertensive therapy with normalized blood pressure.", bullet_style))
    story.append(Paragraph("• <b>Uncontrolled BP (≥ 140/90 mmHg):</b> Blood pressure remains hypertensive; medication dosage adjustment required.", bullet_style))
    story.append(Paragraph("• <b>Pre-Eclampsia Alert:</b> Triggered when Systolic BP ≥ 140 mmHg OR Diastolic BP ≥ 90 mmHg concurrent with Urine Albumin ≥ +2 (or 'Present' / '+++'). Requires immediate hospitalization and seizure prophylaxis with Magnesium Sulfate (Pritchard regimen).", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("C. Gestational Diabetes Mellitus (GDM) — Treatment Mapping (Columns AX, AY, AZ)", h2_style))
    story.append(Paragraph("GDM cases are identified via 2-hour 75g Oral Glucose Tolerance Test (OGTT ≥ 140 mg/dL). Management is extracted from raw columns:", bullet_style))
    story.append(Paragraph("• <b>Column AX (MNT):</b> Medical Nutrition Therapy ('Yes' / 'No'). Low glycemic tribal diet plan.", bullet_style))
    story.append(Paragraph("• <b>Column AY (Metformin):</b> Oral hypoglycemic therapy ('Yes' / 'No'). Tab Metformin 500mg OD/BD.", bullet_style))
    story.append(Paragraph("• <b>Column AZ (Insulin):</b> Subcutaneous insulin therapy ('Yes' / 'No') for uncontrolled glycemic levels.", bullet_style))

    story.append(Spacer(1, 4))
    story.append(Paragraph("D. Other High-Risk Conditions", h2_style))
    story.append(Paragraph("• <b>Previous LSCS:</b> Trial of labor restrictions; mandatory institutional delivery at FRU with blood bank.", bullet_style))
    story.append(Paragraph("• <b>Sickle Cell Disease:</b> Tribally endemic (HbSS / HbS-Beta Thalassemia). Daily Folic Acid 5mg, hydration, and nutritional counseling (Moringa, Chench bhaji, local pulses).", bullet_style))
    story.append(Paragraph("• <b>Teenage Pregnancy (Age ≤ 17):</b> Cephalopelvic disproportion (CPD) and IUGR alert.", bullet_style))
    story.append(Paragraph("• <b>Complication in Last Pregnancy:</b> History of stillbirth, severe hemorrhage, or obstructed labor.", bullet_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 3: DATA INGESTION & ETL PIPELINE
    # -------------------------------------------------------------------------
    story.append(Paragraph("3. Data Ingestion Pipeline & Field Extraction Mappings", h1_style))
    story.append(Paragraph(
        "Data synchronization is executed by <code>update_dashboard.py</code>. The script processes Excel reports exported from the state pregnancy tracking software and builds the global data structure in <code>data.js</code>:",
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
        [Paragraph("<code>gdm_mnt/met/ins</code>", table_cell_bold), Paragraph("HRP Line list (Cols AX, AY, AZ)", table_cell_style), Paragraph("Extracted as 'Yes'/'No' for diabetes management", table_cell_style)],
        [Paragraph("<code>del_cat</code>", table_cell_bold), Paragraph("Delivery linelist / HRP Line list", table_cell_style), Paragraph("Reclassified into DH, SDH, CHC, PHC, Private, Home, In Transit", table_cell_style)]
    ]
    t_etl = Table(etl_mapping_data, colWidths=[90, 165, 260])
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
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 4: CLINICAL MANAGEMENT & DRAWER ARCHITECTURE
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Clinical Management Visualization & Drawer Features", h1_style))
    story.append(Paragraph(
        "Each patient row in the line list expands into a compact clinical timeline drawer that aggregates 12 visits without duplicating dates:",
        body_style
    ))

    story.append(Paragraph("• <b>Hb Progression Sparkline:</b> Renders the 12-visit hemoglobin curve. Iron Sucrose (IS) doses are rendered as distinct cross markers ('X') at the visit dates when injections were administered.", bullet_style))
    story.append(Paragraph("• <b>BP Progression Sparkline:</b> Plots Systolic and Diastolic curves with clinical reference lines at 140 mmHg and 90 mmHg for instant hypertensive alert.", bullet_style))
    story.append(Paragraph("• <b>Conditional Anemia Clinical Management Bar:</b> This dedicated green/rose status container displays Inj. FCM status, Blood Transfusion units, and Iron Sucrose dates. <i>Invariant:</i> It is automatically hidden if the patient was never anemic and received no anemia therapy, keeping the drawer snug.", bullet_style))
    story.append(Paragraph("• <b>PIH Antihypertensive Pill:</b> Displays documented medications (Tab. Labetalol, Tab. Methyldopa, or Tab. Nifedipine) directly in the drawer profile grid.", bullet_style))
    story.append(Paragraph("• <b>GDM Management Regimen:</b> Displays badges for Medical Nutrition Therapy, Metformin, and Insulin.", bullet_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 5: UI ARCHITECTURE & 4-VIEW SYSTEM
    # -------------------------------------------------------------------------
    story.append(Paragraph("5. UI Architecture & Concept 3 Liquid Glass Navigation", h1_style))
    story.append(Paragraph(
        "The interface adopts Apple iOS 18 / visionOS Liquid Glass design principles, featuring frosted glass panels (<code>backdrop-filter: blur(20px)</code>), 1px specular border highlights, smooth cubic-bezier transitions, and a 4-view navigation dock:",
        body_style
    ))

    views_data = [
        [Paragraph("Navigation View", table_header_style), Paragraph("DOM Container", table_header_style), Paragraph("Clinical & Operational Purpose", table_header_style)],
        [Paragraph("<b>Ultra HRP</b>", table_cell_bold), Paragraph("<code>#view-uhrp</code>", table_cell_style), Paragraph("Primary command center with 8 risk factor tabs, NHM Hindi protocol box, Concept 3 triage funnel cards, and full 12-visit expandable drawer line list.", table_cell_style)],
        [Paragraph("<b>Moderate Anemia</b>", table_cell_bold), Paragraph("<code>#view-moderate</code>", table_cell_style), Paragraph("Dedicated triage for the 425 pregnant women with Hb 7.0–9.9 g/dL. Tracks parenteral iron (279 initiated), 3rd trimester urgency, and delivery status.", table_cell_style)],
        [Paragraph("<b>Indicators</b>", table_cell_bold), Paragraph("<code>#view-indicators</code>", table_cell_style), Paragraph("High-level analytics displaying 4 summary KPI tiles and 6 charts (Management by risk/block, MO checkup by block/risk, geographic cases, delivery donut).", table_cell_style)],
        [Paragraph("<b>All ANC</b>", table_cell_bold), Paragraph("<code>#view-anc</code>", table_cell_style), Paragraph("District maternal cascade (17,475 ANC -> 13,066 HRP -> 2,042 UHRP) and 9-block comparative matrix with interactive click-to-filter drill-down.", table_cell_style)]
    ]
    t_views = Table(views_data, colWidths=[100, 100, 315])
    t_views.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SLATE_HEADER),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_views)

    story.append(Spacer(1, 4))
    story.append(Paragraph("• <b>Desktop Layout:</b> Sticky left dock (width 250px) with frosted glass styling and live counter badges.", bullet_style))
    story.append(Paragraph("• <b>Mobile Layout:</b> Seamlessly transforms into a floating bottom pill navigation dock (height 64px, rounded 36px, blurred glass) anchored at the bottom of the screen with touch-friendly pills.", bullet_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # SECTION 6: MAINTENANCE & MODIFICATION GUIDE
    # -------------------------------------------------------------------------
    story.append(Paragraph("6. Maintenance & Modification Guide for Developers", h1_style))
    story.append(Paragraph(
        "To maintain or modify the dashboard in the future, follow these standard operational steps:",
        body_style
    ))

    story.append(Paragraph("Step 1: Ingesting New Monthly Data", h2_style))
    story.append(Paragraph("1. Place newly exported monthly Excel sheets into <code>HRP line list/</code>, <code>ANC line list/</code>, and <code>Ultra HRP delivery linelist/</code>.", bullet_style))
    story.append(Paragraph("2. Run the update script from PowerShell / Command Prompt: <code>python update_dashboard.py</code>", bullet_style))
    story.append(Paragraph("3. The script automatically processes Excel rows, generates <code>data.js</code>, compiles <code>UHRP_Dashboard_Standalone.html</code>, and updates this documentation PDF.", bullet_style))

    story.append(Paragraph("Step 2: Modifying Styling or Layout", h2_style))
    story.append(Paragraph("1. Edit <code>style.css</code> (colors, glass blur, responsive queries) or <code>index.html</code> (markup structure).", bullet_style))
    story.append(Paragraph("2. Compile the standalone file: <code>python build_standalone_html.py</code>", bullet_style))
    story.append(Paragraph("3. Open <code>UHRP_Dashboard_Standalone.html</code> in any web browser to verify changes.", bullet_style))

    story.append(Paragraph("Step 3: Adding a New Risk Factor or Indicator", h2_style))
    story.append(Paragraph("1. In <code>update_dashboard.py</code>: Add flag in patient extraction dict (e.g. <code>'rh_neg': 0|1</code>).", bullet_style))
    story.append(Paragraph("2. In <code>index.html</code>: Add risk card in <code>.risk-tabs-grid</code> with a unique <code>data-tab</code> attribute.", bullet_style))
    story.append(Paragraph("3. In <code>app.js</code>: Add counselling points in <code>COUNSELLING_POINTS</code>, add name in <code>TAB_NAMES</code>, and update <code>getPatientClinicalStatus()</code>.", bullet_style))
    story.append(Paragraph("4. Run <code>python build_standalone_html.py</code> to regenerate the standalone HTML.", bullet_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: Generated PDF documentation: {output_path}")

if __name__ == "__main__":
    sop_file = os.path.join(WORKSPACE, "UHRP_Dashboard_Architecture_and_Logic.pdf")
    build_sop_pdf(sop_file)
    # Also generate UHRP_Dashboard_SOP.pdf for update_dashboard.py compatibility
    sop_compat = os.path.join(WORKSPACE, "UHRP_Dashboard_SOP.pdf")
    build_sop_pdf(sop_compat)
