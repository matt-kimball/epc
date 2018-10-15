const argenport = `2 Finest Hour (Set1 #130)
4 Sabotage (Set1 #252)
4 Crownwatch Paladin (Set1 #139)
4 Ripknife Assassin (Set1003 #13)
2 Vanquisher's Blade (Set4 #112)
2 Annihilate (Set1 #269)
4 Auric Interrogator (Set1002 #13)
4 Bloodletter (Set2 #235)
3 Slay (Set2 #236)
4 Unseen Commando (Set3 #122)
2 Valkyrie Enforcer (Set1 #151)
4 Winchest Merchant (Set4 #126)
2 Inquisitor's Blade (Set1003 #9)
4 Sheriff Marley (Set4 #131)
4 Tavrod, Auric Broker (Set1002 #18)
7 Justice Sigil (Set1 #126)
5 Shadow Sigil (Set1 #249)
3 Argenport Banner (Set2 #231)
1 Cabal Standard (Set4 #193)
4 Crest of Vengeance (Set3 #264)
2 Crownwatch Standard (Set4 #97)
4 Seat of Vengeance (Set0 #55)
`;

const market = `

--------------MARKET---------------

1 Slay (Set2 #236)
1 Valkyrie Enforcer (Set1 #151)
1 Vanquisher's Blade (Set4 #112)
1 Inquisitor Makto (Set2 #242)
1 Argenport Banner (Set2 #231)
`;

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
        await expect(page).toFill("#import-modal textarea", argenport);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(22);
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
        await expect(page).toFill("#import-modal textarea", `${argenport}${market}`);
        await page.click("#import-modal-import-button");
        await expect((await page.$$(".card-count-edit"))).toHaveLength(27);
    });
});
