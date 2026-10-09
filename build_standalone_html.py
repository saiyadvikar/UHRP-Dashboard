"""
Optional utility: Builds an offline single-file standalone HTML dashboard.
Inlines style.css, data.js, and app.js from index.html into UHRP_Dashboard_Standalone.html.
Leaves index.html clean and modular for GitHub Pages.
"""
import os

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

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    css_tag = f'<style id="dashboard-styles">\n{css}\n</style>'
    html = html.replace('<link rel="stylesheet" href="style.css">', css_tag)
    data_tag = f'<script id="dashboard-data">\n{data_js}\n</script>'
    app_tag = f'<script id="dashboard-app">\n{app_js}\n</script>'
    html = html.replace('<script src="data.js"></script>', data_tag)
    html = html.replace('<script src="app.js"></script>', app_tag)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"SUCCESS: Generated offline standalone HTML: {output_path}")
    print(f"File Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    build_standalone()
