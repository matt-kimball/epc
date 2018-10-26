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

describe("Deck add card", () => {
    beforeEach(async () => {
        await page.goto("http://localhost:8081");
        await page.click("#clear-button");
        await page.click("#clear-market-button");
    });

    it("add card button should open modal", async () => {
        await page.click("#add-card-button");
        await page.waitForSelector("#add-card-modal", { visible: true });
    });

    it("should be possible to add a card", async () => {
        await expect((await page.$$(".card-count-edit"))).toHaveLength(0);
        await page.click("#add-card-button");
        await page.waitForSelector("#add-card-modal .item:first-child", { visible: true });
        await page.click("#add-card-modal .item:first-child");
        await new Promise((resolve) => setTimeout(resolve, 100)); // animation confusing puppeteer?
        await page.click("#add-card-modal-add-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(1);
    });
});

describe("Markets", () => {
    beforeEach(async () => {
        await page.goto("http://localhost:8081");
        // clear import from previous test
        await page.click("#clear-button");
        await page.click("#clear-market-button");
    });
    it("market cards should appear in deck list after import", async () => {
        await expect((await page.$$(".card-count-edit"))).toHaveLength(0);
        await page.click("#import-button");
        await page.waitForSelector("#import-modal textarea", { visible: true });
        await expect(page).toFill("#import-modal textarea", oneCardOneMarket);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(2);
    });

    it("add card should not remove market", async () => {
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

    it("should clear the market when market clear button is clicked", async () => {
        await page.click("#import-button");
        await page.waitForSelector("#import-modal textarea", { visible: true });
        await expect(page).toFill("#import-modal textarea", oneCardOneMarket);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(2);
        await new Promise((resolve) => setTimeout(resolve, 500)); // animation confusing puppeteer?
        await page.click("#clear-market-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(1);
    });

    it("should add a card to the market when market add card button is clicked", async () => {
        await expect((await page.$$(".card-count-edit"))).toHaveLength(0);
        await page.click("#add-market-card-button");
        await page.waitForSelector("#add-market-card-modal .item:first-child", { visible: true });
        await page.click("#add-market-card-modal .item:first-child");
        await new Promise((resolve) => setTimeout(resolve, 100)); // animation confusing puppeteer?
        await page.click("#add-market-card-modal-add-button");
        await expect((await page.$$("#market-edit .card-count-edit"))).toHaveLength(1);
    });
});

describe("Misc", () => {
    beforeEach(async () => {
        await page.click("#clear-button");
        await page.click("#clear-market-button");
    });
    it("should disable the add market button when 5 market cards", async () => {
        await page.goto("http://localhost:8081/?d=CAABD_BBCsBBBuKBE5HBBnD");
        await expect((await page.$$("#market-edit .card-count-edit"))).toHaveLength(5);
        const isDisabled = await page.$eval("#add-market-card-button", el => el.disabled );
        expect( isDisabled ).toBeTruthy();
    });
});
