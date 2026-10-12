"""Bundle the site into one self-contained HTML file (CSS, JS, question banks
and logo inlined). Used for hosting it as a single page, e.g. a Claude artifact.

    python tools/build_single.py out.html [--fragment]

--fragment drops the <!DOCTYPE>/<html>/<head>/<body> wrapper for hosts that
add their own skeleton.
"""
import base64, re, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1])
fragment = '--fragment' in sys.argv

html = (root / 'index.html').read_text(encoding='utf-8')
logo = 'data:image/svg+xml;base64,' + base64.b64encode((root / 'assets/logo.svg').read_bytes()).decode()

def inline_script(m):
    js = (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script')
    return f'<script>\n{js}\n</script>'

html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)
css = (root / 'assets/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="assets/style.css">', f'<style>\n{css}\n</style>')
html = html.replace('<link rel="icon" href="favicon.svg" type="image/svg+xml">', f'<link rel="icon" href="{logo}" type="image/svg+xml">')
html = html.replace('src="assets/logo.svg"', f'src="{logo}"')

if fragment:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    body = re.search(r'<body[^>]*>(.*?)</body>', html, re.S).group(1)
    head = re.sub(r'<title>.*?</title>', '<title>5kmocks</title>', head)
    keep = '\n'.join(re.findall(r'<title>.*?</title>|<meta name="description"[^>]*>|<style>.*?</style>', head, re.S))
    html = keep + '\n' + body

out.write_text(html, encoding='utf-8')
print(f'wrote {out} ({out.stat().st_size // 1024} KB)')
