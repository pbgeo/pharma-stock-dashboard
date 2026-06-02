const { chromium } = require('playwright');
const { execSync } = require('child_process');

async function main() {
  // Python requests로 로그인 → 세션 쿠키 획득
  const pythonScript = `
import requests, os, json, re, sys

s = requests.Session()
s.headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

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
print("상태코드:", r2.status_code, file=sys.stderr)

if 'main' not in r2.url:
    print("로그인 실패", file=sys.stderr)
    sys.exit(1)

cookies = [{'name': c.name, 'value': c.value, 'domain': 'mate.ourbox.co.kr', 'path': '/'} for c in s.cookies]
print(json.dumps(cookies))
`;

  const cookiesJson = execSync(`python3 -c "${pythonScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    env: process.env,
    encoding: 'utf8'
  }).trim();

  const cookies = JSON.parse(cookiesJson);
  console.error('쿠키 획득:', cookies.length + '개');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(cookies);
  const page = await context.newPage();

  try {
    await page.goto('https://mate.ourbox.co.kr/mate/page/wms_stock', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.waitForFunction(() =>
      window.grid?.modelManager?.dataModel?.models?.length > 0
    , { timeout: 30000 });

    const items = await page.evaluate(() => {
      const rows = window.grid.modelManager.dataModel.models.map(m => m.attributes);
      return rows.filter(r => JSON.stringify(r).includes('박약다식')).map(r => ({
        it_id: r.it_id, item_name: r.item_name,
        "재고수량": parseInt(r.item_num)||0,
        "가용수량": parseInt(r.item_ass_num)||0,
        "할당수량": parseInt(r.item_set_num)||0,
        "유통기한": r.item_life_date||''
      }));
    });

    if (!items.length) throw new Error('박약다식 데이터 없음');
    process.stdout.write(JSON.stringify(items));
    console.error('완료: ' + items.length + '개');

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
