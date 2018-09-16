describe('Puppeteer works', () => {
  beforeAll(async () => {
    await page.goto('http://localhost:8080');
  });

  it('should display "eternal" text on page', async () => {
    await expect(page).toMatch('cards');
  });
});
