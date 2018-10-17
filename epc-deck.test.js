const { makeEternalCardLibrary, makeEternalDeck, makeEternalDeckFromCode, makeEternalDeckFromString } = require("./epc-deck");

const cardLibrary = makeEternalCardLibrary(`
Set1 #130;; 1J; Finest Hour;
Set2 #236;; 3JS; Slay;
`);
const oneCard = "2 Finest Hour (Set1 #130)";
const oneCardOneMarket = `${oneCard}
--------------MARKET---------------
1 Slay (Set2 #236)`;

const deck = makeEternalDeckFromString(cardLibrary, oneCardOneMarket);

test("generateDeckCode works", () => {
    expect(deck.generateDeckCode()).toBe("CBiEBCsH");
});
