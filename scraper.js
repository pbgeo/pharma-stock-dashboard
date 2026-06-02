const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 네트워크 요청 캡처
  const requests = [];
  page.on('request', req => {
    if (req.method() === 'POST') {
      requests.push({ url: req.url(), postData: req.postData() });
    }
  });

  try {
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle', timeout: 30000 });

    // OMS 탭
    await page.click('text=OMS');
    await page.waitForTimeout(1000);

    // form action 및 login_kind 확인
    const formInfo = await page.evaluate(() => ({
      action: document.querySelector('form')?.action,
      loginKind: document.querySelector('input[name="login_kind"]')?.value,
      csrf: document.querySelector('input[name="login_csrf_token"]')?.value
    }));
    console.error('폼 정보:', JSON.stringify(formInfo));

    // submit 버튼 click (evaluate 아닌 Playwright click)
    await page.fill('input[name="mb_id"]', process.env.WMS_ID);
    await page.fill('input[name="mb_password"]', process.env.WMS_PW);
    await page.click('input[type="submit"]');
    await page.waitForTimeout(3000);

    console.error('클릭 후 URL:', page.url());
    console.error('POST 요청들:', JSON.stringify(requests.slice(0, 3)));

    // URL 확인 (main이 아니어도 일단 계속)
    const url = page.url();
    if (!url.includes('main')) {
      console.error('로그인 실패, 현재 URL:', url);
      process.exit(1);
    }

    await page.goto('https://mate.ourbox.co.kr/mate/page/wms_stock', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.waitForFunction(() => window.grid?.modelManager?.dataModel?.models?.length > 0, { timeout: 30000 });

    const items = await page.evaluate(() => {
      const rows = window.grid.modelManager.dataModel.models.map(m => m.attributes);
      return rows.filter(r => JSON.stringify(r).includes('박약다식')).map(r => ({
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
