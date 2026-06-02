const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');

async function main() {
  const cookiesJson = execSync('python3 login.py', {
    env: process.env,
    encoding: 'utf8',
    cwd: path.dirname(process.argv[1])
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
