const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // 로그인
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle' });
    await page.click('text=OMS');
    await page.fill('input[type="text"]', process.env.WMS_ID);
    await page.fill('input[type="password"]', process.env.WMS_PW);
    await page.click('button:has-text("로그인")');
    await page.waitForURL('**/main', { timeout: 15000 });

    // 재고현황 이동
    await page.goto('https://mate.ourbox.co.kr/mate/page/wms_stock', { waitUntil: 'networkidle' });

    // 그리드 로드 대기
    await page.waitForFunction(() =>
      window.grid &&
      window.grid.modelManager &&
      window.grid.modelManager.dataModel &&
      window.grid.modelManager.dataModel.models.length > 0
    , { timeout: 30000 });

    // 데이터 추출
    const items = await page.evaluate(() => {
      const dm = window.grid.modelManager.dataModel;
      const rows = dm.models.map(m => m.attributes);
      const bakyak = rows.filter(r => JSON.stringify(r).includes('박약다식'));
      return bakyak.map(r => ({
        it_id: r.it_id,
        item_name: r.item_name,
        재고수량: parseInt(r.item_num) || 0,
        가용수량: parseInt(r.item_ass_num) || 0,
        할당수량: parseInt(r.item_set_num) || 0,
        유통기한: r.item_life_date || ''
      }));
    });

    if (!items.length) throw new Error('데이터 없음');
    process.stdout.write(JSON.stringify(items));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
