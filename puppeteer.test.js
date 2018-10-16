const oneCard = "2 Finest Hour (Set1 #130)";
const oneCardOneMarket = `${oneCard}

--------------MARKET---------------

1 Slay (Set2 #236)`;

describe("Deck import", () => {
    beforeEach(async () => {
        await page.goto("http://localhost:8081");
    });

    it("import deck button should open modal", async () => {
        await page.click("#import-button");
        await page.waitForSelector("#import-modal", { visible: true });
    });

    it("should be possible to import a deck", async () => {
        await expect((await page.$$(".card-count-edit"))).toHaveLength(0);
        await page.click("#import-button");
        await page.waitForSelector("#import-modal textarea", { visible: true });
        await expect(page).toFill("#import-modal textarea", oneCard);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(1);
    });
});

describe("Markets", () => {
    beforeEach(async () => {
        await page.goto("http://localhost:8081");
    });
    it("market cards should appear in deck list after import", async () => {
        // clear import from previous test
        await page.click("#clear-button");

        await expect((await page.$$(".card-count-edit"))).toHaveLength(0);
        await page.click("#import-button");
        await page.waitForSelector("#import-modal textarea", { visible: true });
        await expect(page).toFill("#import-modal textarea", oneCardOneMarket);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(2);
    });

    it("add card should not remove market", async () => {
        // clear import from previous test
        await page.click("#clear-button");

        await page.click("#import-button");
        await page.waitForSelector("#import-modal textarea", { visible: true });
        await expect(page).toFill("#import-modal textarea", oneCardOneMarket);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(2);
        await new Promise((resolve) => setTimeout(resolve, 500)); // animation confusing puppeteer?
        await page.click("#add-card-button");
        await page.waitForSelector("#add-card-modal .item:first-child", { visible: true });
        await page.click("#add-card-modal .item:first-child");
        await new Promise((resolve) => setTimeout(resolve, 100)); // animation confusing puppeteer?
        await page.click("#add-card-modal-add-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(3);
    });
});
