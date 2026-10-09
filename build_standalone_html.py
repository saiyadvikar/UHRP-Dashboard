"""
Builds or updates the single self-contained standalone HTML dashboard: index.html
Inlines style.css, data.js, and app.js from template.html into index.html.
Also maintains UHRP_Dashboard_Standalone.html as an automatic redirect to index.html.
"""
import os
import re

def build_standalone():
    workspace = os.path.dirname(os.path.abspath(__file__))
    
    template_path = os.path.join(workspace, "template.html")
    index_path = os.path.join(workspace, "index.html")
    style_path = os.path.join(workspace, "style.css")
    data_path = os.path.join(workspace, "data.js")
    app_path = os.path.join(workspace, "app.js")
    legacy_standalone_path = os.path.join(workspace, "UHRP_Dashboard_Standalone.html")

    # If template.html does not exist, initialize it from index.html if it contains link/script tags
    if not os.path.exists(template_path) and os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        if '<link rel="stylesheet" href="style.css">' in content:
            with open(template_path, "w", encoding="utf-8") as f:
                f.write(content)

    with open(style_path, "r", encoding="utf-8") as f:
        css = f.read()

    with open(data_path, "r", encoding="utf-8") as f:
        data_js = f.read()

    with open(app_path, "r", encoding="utf-8") as f:
        app_js = f.read()

    # Use template.html as clean source markup
    source_path = template_path if os.path.exists(template_path) else index_path
    with open(source_path, "r", encoding="utf-8") as f:
        html = f.read()

    if '<link rel="stylesheet" href="style.css">' in html:
        css_tag = f'<style id="dashboard-styles">\n{css}\n</style>'
        html = html.replace('<link rel="stylesheet" href="style.css">', css_tag)
        data_tag = f'<script id="dashboard-data">\n{data_js}\n</script>'
        app_tag = f'<script id="dashboard-app">\n{app_js}\n</script>'
        html = html.replace('<script src="data.js"></script>', data_tag)
        html = html.replace('<script src="app.js"></script>', app_tag)
    else:
        # Fallback helper for exact replacement if source already has inline tags
        def replace_tag_content(source_html, start_tag, end_tag, new_inner):
            start_pos = source_html.find(start_tag)
            if start_pos == -1:
                return source_html
            content_start = start_pos + len(start_tag)
            end_pos = source_html.find(end_tag, content_start)
            if end_pos == -1:
                return source_html
            return source_html[:content_start] + "\n" + new_inner + "\n" + source_html[end_pos:]

        html = replace_tag_content(html, '<style id="dashboard-styles">', '</style>', css)
        html = replace_tag_content(html, '<script id="dashboard-data">', '</script>', data_js)
        html = replace_tag_content(html, '<script id="dashboard-app">', '</script>', app_js)

    # Write compiled standalone dashboard to index.html
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)

    size_mb = os.path.getsize(index_path) / (1024 * 1024)
    print(f"SUCCESS: Generated standalone HTML dashboard: {index_path}")
    print(f"File Size: {size_mb:.2f} MB")

    # Update legacy standalone file as redirect to index.html
    redirect_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=index.html">
    <title>Redirecting to index.html</title>
</head>
<body>
    <p>The dashboard has been renamed to index.html. <a href="index.html">Click here if not redirected automatically</a>.</p>
    <script>window.location.href = "index.html";</script>
</body>
</html>
"""
    with open(legacy_standalone_path, "w", encoding="utf-8") as f:
        f.write(redirect_html)

if __name__ == "__main__":
    build_standalone()
