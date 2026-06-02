const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 로그인 페이지
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: 'debug_1_login.png' });
    console.error('1. 로그인 페이지 로드 완료');

    // OMS 탭 클릭
    const oms = await page.$('text=OMS');
    if (oms) { await oms.click(); await page.waitForTimeout(1500); }
    await page.screenshot({ path: 'debug_2_oms.png' });
    console.error('2. OMS 탭 클릭');

    // 입력 필드 확인
    const allInputs = await page.$$('input');
    console.error('입력 필드 수:', allInputs.length);
    for (const inp of allInputs) {
      const type = await inp.getAttribute('type');
      const name = await inp.getAttribute('name');
      console.error('  input type=' + type + ' name=' + name);
    }

    // ID 입력
    const textInput = await page.$('input[type="text"], input:not([type="password"]):not([type="hidden"]):not([type="checkbox"])');
    if (textInput) await textInput.fill(process.env.WMS_ID);

    // PW 입력
    const pwInput = await page.$('input[type="password"]');
    if (pwInput) await pwInput.fill(process.env.WMS_PW);

    await page.screenshot({ path: 'debug_3_filled.png' });
    console.error('3. 입력 완료');

    // Enter로 로그인
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'debug_4_after_enter.png' });
    console.error('4. Enter 후 URL:', page.url());

    // 로그인 성공 확인 (URL 또는 페이지 요소로)
    const currentUrl = page.url();
    if (!currentUrl.includes('main') && !currentUrl.includes('wms')) {
      // 버튼 직접 클릭 시도
      const btn = await page.$('button, input[type="submit"]');
      if (btn) { await btn.click(); await page.waitForTimeout(3000); }
      console.error('5. 버튼 클릭 후 URL:', page.url());
    }

    await page.screenshot({ path: 'debug_5_final.png' });

    // 재고현황 이동
    await page.goto('https://mate.ourbox.co.kr/mate/page/wms_stock', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() =>
      window.grid && window.grid.modelManager && window.grid.modelManager.dataModel && window.grid.modelManager.dataModel.models.length > 0
    , { timeout: 30000 });

    const items = await page.evaluate(() => {
      const dm = window.grid.modelManager.dataModel;
      const rows = dm.models.map(m => m.attributes);
      const bakyak = rows.filter(r => JSON.stringify(r).includes('박약다식'));
      return bakyak.map(r => ({
        it_id: r.it_id, item_name: r.item_name,
        "재고수량": parseInt(r.item_num)||0, "가용수량": parseInt(r.item_ass_num)||0,
        "할당수량": parseInt(r.item_set_num)||0, "유통기한": r.item_life_date||''
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
