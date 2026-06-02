import requests, os, json, re, sys

s = requests.Session()
s.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

r = s.get('https://mate.ourbox.co.kr/login')

# 작은따옴표/큰따옴표 모두 지원
csrf_tag = re.search(r"<input[^>]*name=['\"]login_csrf_token['\"][^>]*>", r.text)
if not csrf_tag:
    print("CSRF 태그 없음", file=sys.stderr)
    sys.exit(1)

csrf_val = re.search(r"value=['\"]([^'\"]+)['\"]", csrf_tag.group(0))
if not csrf_val:
    print("CSRF value 없음", file=sys.stderr)
    sys.exit(1)

csrf = csrf_val.group(1)
print("CSRF 획득:", csrf[:10] + "...", file=sys.stderr)

r2 = s.post('https://mate.ourbox.co.kr/login/login', data={
    'login_csrf_token': csrf,
    'login_kind': 'reseller',
    'mb_id': os.environ['WMS_ID'],
    'mb_password': os.environ['WMS_PW']
}, allow_redirects=True)

print("로그인 후 URL:", r2.url, file=sys.stderr)

if 'main' not in r2.url:
    print("로그인 실패:", r2.text[:200], file=sys.stderr)
    sys.exit(1)

cookies = [{'name': c.name, 'value': c.value, 'domain': 'mate.ourbox.co.kr', 'path': '/'} for c in s.cookies]
print(json.dumps(cookies))
