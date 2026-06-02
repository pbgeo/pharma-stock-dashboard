const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle', timeout: 30000 });

    // OMS 탭 클릭
    await page.click('text=OMS');
    await page.waitForTimeout(1000);

    // ID 입력 (name으로 특정)
    await page.click('input[name="mb_id"]');
    await page.type('input[name="mb_id"]', process.env.WMS_ID, { delay: 50 });

    // PW 입력 (name으로 특정, type으로 키보드 입력)
    await page.click('input[name="mb_password"]');
    await page.type('input[name="mb_password"]', process.env.WMS_PW, { delay: 50 });

    await page.waitForTimeout(500);

    // 로그인 버튼 (input[type="submit"])
    await page.click('input[type="submit"]');

    // 로그인 완료 대기
    await page.waitForURL('**/main', { timeout: 20000 });
    console.error('로그인 성공');

    // 재고현황 이동
    await page.goto('https://mate.ourbox.co.kr/mate/page/wms_stock', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 그리드 로드 대기
    await page.waitForFunction(() =>
      window.grid &&
      window.grid.modelManager &&
      window.grid.modelManager.dataModel &&
      window.grid.modelManager.dataModel.models.length > 0
    , { timeout: 30000 });

    const items = await page.evaluate(() => {
      const dm = window.grid.modelManager.dataModel;
      const rows = dm.models.map(m => m.attributes);
      const bakyak = rows.filter(r => JSON.stringify(r).includes('박약다식'));
      return bakyak.map(r => ({
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
