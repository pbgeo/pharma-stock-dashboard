const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://mate.ourbox.co.kr/login', { waitUntil: 'networkidle', timeout: 30000 });

    // 클릭 전 login_kind
    const before = await page.evaluate(() => ({
      loginKind: document.querySelector('input[name="login_kind"]')?.value,
      tabs: Array.from(document.querySelectorAll('[class*="tab"], a, button, li')).filter(e => e.textContent.trim().match(/^(OMS|WMS)$/)).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent.trim() }))
    }));
    console.error('클릭 전:', JSON.stringify(before));

    // OMS 탭 클릭 (여러 방법 시도)
    await page.click('text=OMS');
    await page.waitForTimeout(1000);

    const after = await page.evaluate(() => ({
      loginKind: document.querySelector('input[name="login_kind"]')?.value,
      allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, value: i.type !== 'password' ? i.value : '***' }))
    }));
    console.error('클릭 후:', JSON.stringify(after));

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
