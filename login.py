import requests, os, json, re, sys

s = requests.Session()
s.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

r = s.get('https://mate.ourbox.co.kr/login')
print("GET 상태:", r.status_code, "URL:", r.url, file=sys.stderr)
print("HTML 앞부분:", r.text[:500], file=sys.stderr)

# 더 넓게 CSRF 탐색
csrf_patterns = [
    r'name="login_csrf_token"[^>]*value="([^"]+)"',
    r'value="([^"]+)"[^>]*name="login_csrf_token"',
    r'login_csrf_token.*?value="([^"]+)"',
    r'"login_csrf_token"\s*:\s*"([^"]+)"'
]

csrf_val = None
for p in csrf_patterns:
    m = re.search(p, r.text)
    if m:
        csrf_val = m.group(1)
        print("CSRF 발견 패턴:", p, "값:", csrf_val[:20] + "...", file=sys.stderr)
        break

if not csrf_val:
    print("CSRF 없음, 폼 직접 탐색:", file=sys.stderr)
    inputs = re.findall(r'<input[^>]*>', r.text)
    for inp in inputs[:10]:
        print(" ", inp, file=sys.stderr)
    sys.exit(1)

r2 = s.post('https://mate.ourbox.co.kr/login/login', data={
    'login_csrf_token': csrf_val,
    'login_kind': 'reseller',
    'mb_id': os.environ['WMS_ID'],
    'mb_password': os.environ['WMS_PW']
}, allow_redirects=True)

print("로그인 후 URL:", r2.url, file=sys.stderr)
print("상태코드:", r2.status_code, file=sys.stderr)

if 'main' not in r2.url:
    print("로그인 실패, 응답:", r2.text[:300], file=sys.stderr)
    sys.exit(1)

cookies = [{'name': c.name, 'value': c.value, 'domain': 'mate.ourbox.co.kr', 'path': '/'} for c in s.cookies]
print(json.dumps(cookies))
