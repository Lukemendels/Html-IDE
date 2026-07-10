#!/usr/bin/env python3
import os
import urllib.request

WORKSPACE_DIR = "/home/luke/BrainDump"
TEMPLATE_PATH = os.path.join(WORKSPACE_DIR, "local-ide.src.html")
OUTPUT_PATH = os.path.join(WORKSPACE_DIR, "local-ide.html")
OUTPUT_PATH_PUBLIC = os.path.join(WORKSPACE_DIR, "public", "local-ide.html")

TAILWIND_CACHE_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "tailwind-cdn-offline.js")
PRISM_CSS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "prismjs", "themes", "prism-tomorrow.min.css")
PRISM_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "prismjs", "prism.js")
CODEJAR_JS_PATH = os.path.join(WORKSPACE_DIR, "node_modules", "codejar", "dist", "codejar.js")

def get_tailwind_js():
    if os.path.exists(TAILWIND_CACHE_PATH):
        print(f"Loading Tailwind JS from local cache: {TAILWIND_CACHE_PATH}")
        with open(TAILWIND_CACHE_PATH, "r", encoding="utf-8") as f:
            return f.read()
    
    url = "https://cdn.tailwindcss.com"
    print(f"Fetching Tailwind JS from CDN: {url}")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            code = response.read().decode("utf-8")
        
        # Save to local cache
        os.makedirs(os.path.dirname(TAILWIND_CACHE_PATH), exist_ok=True)
        with open(TAILWIND_CACHE_PATH, "w", encoding="utf-8") as f:
            f.write(code)
        print("Tailwind JS cached successfully.")
        return code
    except Exception as e:
        print(f"Error fetching Tailwind JS: {e}")
        raise

def main():
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Error: Template file not found at {TEMPLATE_PATH}")
        return

    # Load Tailwind JS
    tailwind_js = get_tailwind_js()

    # Load Prism CSS
    print(f"Reading Prism CSS: {PRISM_CSS_PATH}")
    with open(PRISM_CSS_PATH, "r", encoding="utf-8") as f:
        prism_css = f.read()

    # Load Prism JS
    print(f"Reading Prism JS: {PRISM_JS_PATH}")
    with open(PRISM_JS_PATH, "r", encoding="utf-8") as f:
        prism_js = f.read()

    # Load CodeJar JS and strip "export " prefix
    print(f"Reading CodeJar JS: {CODEJAR_JS_PATH}")
    with open(CODEJAR_JS_PATH, "r", encoding="utf-8") as f:
        codejar_js = f.read()
    codejar_js = codejar_js.replace("export function CodeJar", "function CodeJar")

    # Read template source HTML
    print(f"Reading template: {TEMPLATE_PATH}")
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Perform inline replacements
    print("Inlining dependencies...")
    html_content = html_content.replace("/* {{tailwind_js}} */", tailwind_js)
    html_content = html_content.replace("/* {{prism_css}} */", prism_css)
    html_content = html_content.replace("/* {{codejar_js}} */", codejar_js)
    html_content = html_content.replace("/* {{prism_js}} */", prism_js)

    # Write output files
    for path in [OUTPUT_PATH, OUTPUT_PATH_PUBLIC]:
        print(f"Writing compiled standalone IDE to: {path}")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_content)

    print("Success! Standalone offline local-ide.html built successfully.")

if __name__ == "__main__":
    main()
