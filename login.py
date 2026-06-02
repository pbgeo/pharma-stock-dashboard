import requests, os, json, re, sys

s = requests.Session()
s.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

r = s.get('https://mate.ourbox.co.kr/login')
csrf = re.search(r'name="login_csrf_token"[^>]*value="([^"]+)"', r.text)
if not csrf:
    print("CSRF 토큰 없음", file=sys.stderr)
    sys.exit(1)

r2 = s.post('https://mate.ourbox.co.kr/login/login', data={
    'login_csrf_token': csrf.group(1),
    'login_kind': 'reseller',
    'mb_id': os.environ['WMS_ID'],
    'mb_password': os.environ['WMS_PW']
}, allow_redirects=True)

print("로그인 후 URL:", r2.url, file=sys.stderr)

if 'main' not in r2.url:
    print("로그인 실패", file=sys.stderr)
    sys.exit(1)

cookies = [{'name': c.name, 'value': c.value, 'domain': 'mate.ourbox.co.kr', 'path': '/'} for c in s.cookies]
print(json.dumps(cookies))
