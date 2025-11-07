const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Get the absolute path to the HTML file
  const path = require('path');
  const filePath = path.resolve(__dirname, 'test.html');

  await page.goto(`file://${filePath}`);

  // Wait for fonts and styles to load
  await page.waitForLoadState('networkidle');

  // Take a screenshot
  await page.screenshot({ path: 'devices-screenshot.png' });

  await browser.close();

  console.log('Screenshot taken successfully!');
})();
