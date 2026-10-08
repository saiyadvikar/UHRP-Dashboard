"""
Builds or updates the single self-contained standalone HTML file: UHRP_Dashboard_Standalone.html
Inlines style.css, data.js, and app.js into UHRP_Dashboard_Standalone.html.
Works whether index.html is present or UHRP_Dashboard_Standalone.html is the sole standalone file.
"""
import os
import re

def build_standalone():
    workspace = os.path.dirname(os.path.abspath(__file__))
    
    index_path = os.path.join(workspace, "index.html")
    style_path = os.path.join(workspace, "style.css")
    data_path = os.path.join(workspace, "data.js")
    app_path = os.path.join(workspace, "app.js")
    output_path = os.path.join(workspace, "UHRP_Dashboard_Standalone.html")

    with open(style_path, "r", encoding="utf-8") as f:
        css = f.read()

    with open(data_path, "r", encoding="utf-8") as f:
        data_js = f.read()

    with open(app_path, "r", encoding="utf-8") as f:
        app_js = f.read()

    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()
        css_tag = f'<style id="dashboard-styles">\n{css}\n</style>'
        html = html.replace('<link rel="stylesheet" href="style.css">', css_tag)
        data_tag = f'<script id="dashboard-data">\n{data_js}\n</script>'
        app_tag = f'<script id="dashboard-app">\n{app_js}\n</script>'
        html = html.replace('<script src="data.js"></script>', data_tag)
        html = html.replace('<script src="app.js"></script>', app_tag)
    else:
        # Helper for exact safe string replacement without regex escape issues
        def replace_tag_content(source_html, start_tag, end_tag, new_inner):
            start_pos = source_html.find(start_tag)
            if start_pos == -1:
                return source_html
            content_start = start_pos + len(start_tag)
            end_pos = source_html.find(end_tag, content_start)
            if end_pos == -1:
                return source_html
            return source_html[:content_start] + "\n" + new_inner + "\n" + source_html[end_pos:]

        # Update directly inside UHRP_Dashboard_Standalone.html
        with open(output_path, "r", encoding="utf-8") as f:
            html = f.read()

        html = replace_tag_content(html, '<style id="dashboard-styles">', '</style>', css)
        html = replace_tag_content(html, '<script id="dashboard-data">', '</script>', data_js)
        html = replace_tag_content(html, '<script id="dashboard-app">', '</script>', app_js)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated standalone HTML dashboard: {output_path}")
    print(f"File Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    build_standalone()
