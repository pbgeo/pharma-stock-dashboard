const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle', timeout: 30000 });

    // OMS 탭 클릭
    await page.click('text=OMS');
    await page.waitForTimeout(1000);

    // JS로 폼 값 설정 및 submit (인자를 객체로 묶음)
    await page.evaluate(({ id, pw }) => {
      document.querySelector('input[name="mb_id"]').value = id;
      document.querySelector('input[name="mb_password"]').value = pw;
      document.querySelector('form').submit();
    }, { id: process.env.WMS_ID, pw: process.env.WMS_PW });

    await page.waitForURL('**/main', { timeout: 20000 });
    console.error('로그인 성공');

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
