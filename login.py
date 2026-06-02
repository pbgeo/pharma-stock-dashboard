import requests, os, json, re, sys

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9',
})

r = s.get('https://mate.ourbox.co.kr/login')
csrf_tag = re.search(r"<input[^>]*name=['\"]login_csrf_token['\"][^>]*>", r.text)
csrf = re.search(r"value=['\"]([^'\"]+)['\"]", csrf_tag.group(0)).group(1)

# default, reseller, oms 순서로 시도
for kind in ['default', 'reseller', 'oms']:
    # CSRF는 한 번씩 다시 가져와야 함 (소모됨)
    r_fresh = s.get('https://mate.ourbox.co.kr/login')
    csrf_tag = re.search(r"<input[^>]*name=['\"]login_csrf_token['\"][^>]*>", r_fresh.text)
    csrf_fresh = re.search(r"value=['\"]([^'\"]+)['\"]", csrf_tag.group(0)).group(1)
    
    r2 = s.post('https://mate.ourbox.co.kr/login/login', data={
        'login_csrf_token': csrf_fresh,
        'login_kind': kind,
        'mb_id': os.environ['WMS_ID'],
        'mb_password': os.environ['WMS_PW']
    }, allow_redirects=True)
    
    print(f"login_kind={kind} → URL:{r2.url} status:{r2.status_code}", file=sys.stderr)
    
    if 'main' in r2.url:
        print(f"로그인 성공! kind={kind}", file=sys.stderr)
        cookies = [{'name': c.name, 'value': c.value, 'domain': 'mate.ourbox.co.kr', 'path': '/'} for c in s.cookies]
        print(json.dumps(cookies))
        sys.exit(0)

print("모든 login_kind 실패", file=sys.stderr)
sys.exit(1)
