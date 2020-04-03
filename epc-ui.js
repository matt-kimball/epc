/*global $, document, window, localStorage, URL, URLSearchParams*/
/*global generateOddsTable, drawPowerGraph, makeGraphPopupTracker*/
/*global makeEternalCardLibrary, makeEternalDeck*/
/*global makeEternalDeckFromString, makeEternalDeckFromCode*/
/*jslint unparam: true*/
/*

    Eternal Power Calculator
    Copyright (C) 2018  Matt Kimball

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

*/

"use strict";

var MAX_MARKET_SIZE = 5;

/*
    Hook up all user interface behavior.  The parameter is used
    to determine the visual appearance of the graph.
*/
function buildEpcUI(graphStyle) {
    var cardlist,
        cardLibrary,
        currentDeck,
        modifyCardCount,
        modifyMarketCardCount,
        oddsWorker,
        graphPopupTracker,
        deckFromURL;

    cardlist = $("#card-list").html();
    cardLibrary = makeEternalCardLibrary(cardlist);

    /*
        Get the CSS class name for a card in the deck edit list,
        based on the influence colors it provides.
    */
    function getCardNameClass(
        card
    ) {
        var influence;

        if (card.flags.power) {
            return "card-name";
        }

        influence = card.influenceGenerated;
        if (!influence || influence.isEmpty()) {
            return "card-name";
        }

        if (influence.fire > 0 &&
                influence.time === 0 && influence.justice === 0 &&
                influence.primal === 0 && influence.shadow === 0 &&
                influence.wild === 0) {
            return "card-name fire";
        }

        if (influence.time > 0 &&
                influence.fire === 0 && influence.justice === 0 &&
                influence.primal === 0 && influence.shadow === 0 &&
                influence.wild === 0) {
            return "card-name time";
        }

        if (influence.justice > 0 &&
                influence.time === 0 && influence.fire === 0 &&
                influence.primal === 0 && influence.shadow === 0 &&
                influence.wild === 0) {
            return "card-name justice";
        }

        if (influence.primal > 0 &&
                influence.time === 0 && influence.justice === 0 &&
                influence.fire === 0 && influence.shadow === 0 &&
                influence.wild === 0) {
            return "card-name primal";
        }

        if (influence.shadow > 0 &&
                influence.time === 0 && influence.justice === 0 &&
                influence.primal === 0 && influence.fire === 0 &&
                influence.wild === 0) {
            return "card-name shadow";
        }

        return "card-name multi";
    }

    function convertNameToImage(name) {
        return name.replace(/ /g, '_') + '.png';
    }

    /*
        Build a row corresponding to an individual card in the decklist
        editing panel.
    */
    function buildDeckRow(row, deck, card, cardcount) {
        var name, nameClass, count, countstr, cardid, addButton, subButton;

        name = cardcount.name;
        count = cardcount.count;
        countstr = String(count);
        cardid = cardcount.id;

        nameClass = getCardNameClass(card);

        $("<div>").addClass(nameClass).text(name).appendTo(row);
        $("<div>").addClass("card-count").text(countstr).appendTo(row);
        subButton = $("<button>").addClass("ui compact button")
            .text("-").appendTo(row);
        addButton = $("<button>").addClass("ui compact button")
            .text("+").appendTo(row);

        addButton.bind("click", function () {
            modifyCardCount(deck, cardid, count + 1);
        });
        subButton.bind("click", function () {
            modifyCardCount(deck, cardid, count - 1);
        });
    }

    /*
     Same as buildDeckRow but for markets
    */
    function buildDeckMarketRow(row, deck, card, cardcount) {
        var name, nameClass, count, countstr, cardid, subButton;

        name = cardcount.name;
        count = cardcount.count;
        countstr = String(count);
        cardid = cardcount.id;

        nameClass = getCardNameClass(card);

        $("<div>").addClass(nameClass).text(name).appendTo(row);
        $("<div>").addClass("card-count").text(countstr).appendTo(row);
        subButton = $("<button>").addClass("ui compact button")
            .text("-").appendTo(row);

        subButton.bind("click", function () {
            modifyMarketCardCount(deck, cardid, count - 1);
        });
    }

    /*
        Add the rows to the editable deck, one for each card,
    */
    function buildDeckRows(deck) {
        var powerRows, nonpowerRows, row, marketRows;

        powerRows = $("#deck-edit-power-rows");
        powerRows.empty();

        nonpowerRows = $("#deck-edit-nonpower-rows");
        nonpowerRows.empty();

        marketRows = $("#deck-edit-market-rows");
        marketRows.empty();

        $.each(deck.cardlist, function (index, cardcount) {
            var card, cardid;

            cardid = cardcount.id;
            card = cardLibrary.cards[cardid];

            row = $('<div>')
              .addClass('card-count-edit')
              .attr('data-position', 'right center')
              .attr('data-variation', 'transparent')
              .attr('data-html', '<img width="220" height="350" src="/images/cards/' + encodeURIComponent(convertNameToImage(cardcount.name)) + '">');
            if (card && card.flags.power) {
                row.appendTo(powerRows);
            } else {
                row.appendTo(nonpowerRows);
            }
            buildDeckRow(row, deck, card, cardcount);
        });

        // addCardsToDecklistSection(deck.marketlist, function() { return marketRows; });
        $.each(deck.marketlist, function (index, cardcount) {
            var card, cardid;

            cardid = cardcount.id;
            card = cardLibrary.cards[cardid];

            row = $('<div>')
              .addClass('card-count-edit')
              .attr('data-position', 'right center')
              .attr('data-variation', 'transparent')
              .attr('data-html', '<img width="220" height="350" src="/images/cards/' + encodeURIComponent(convertNameToImage(cardcount.name)) + '">');
            row.appendTo(marketRows);
            buildDeckMarketRow(row, deck, card, cardcount);
        });

        $('.card-count-edit').popup({ on: "hover", lastResort: 'right center', boundary: '.card-count-edit' });

        if (powerRows.children().length) {
            $("#deck-edit-power-title").css("display", "block");
        } else {
            $("#deck-edit-power-title").css("display", "none");
        }

        if (marketRows.children().length) {
            if (deck.marketlist.reduce(function(acc, c) {
                return acc + c.count;
            }, 0) === MAX_MARKET_SIZE) {
                $("#add-market-card-button").prop("disabled", true);
            } else {
                $("#add-market-card-button").prop("disabled", false);
            }
        } else {
            $("#add-market-card-button").prop("disabled", false);
        }
    }

    var deckTitleNode;
    function addDeckTitle(options) {
        var title = options.title;
        // potential xss attack vector here. Be careful
        deckTitleNode = deckTitleNode || document.getElementById("deck-title");
        while(deckTitleNode.firstChild){
            deckTitleNode.removeChild(deckTitleNode.firstChild);
        }
        var titleTextNode = document.createTextNode(title);
        deckTitleNode.appendChild(titleTextNode);
    }

    function gatherOptions() {
        deckTitleNode = deckTitleNode || document.getElementById("deck-title");
        var title = deckTitleNode.innerText;
        return { title: title };
    }

    /*
        Set the influence count for a type in the influence panel
        Add the 'zero' class if the value is zeroed.
    */
    function setInfluenceCount(
        numberDiv,
        count
    ) {
        numberDiv.text(count);
        if (count) {
            numberDiv.removeClass("zero");
        } else {
            numberDiv.addClass("zero");
        }
    }

    /*
        Count the sources of power and influence in the deck and
        update the counts in the influence panel.
    */
    function generateInfluencePanel(
        deck
    ) {
        var count, power, fire, time, justice, primal, shadow, wild;

        count = deck.cards.length;
        power = 0;
        fire = 0;
        time = 0;
        justice = 0;
        primal = 0;
        shadow = 0;
        wild = 0;

        $.each(deck.cards, function (index, card) {
            var influence;

            influence = card.influenceGenerated;

            power += influence.power;
            fire += influence.fire;
            time += influence.time;
            justice += influence.justice;
            primal += influence.primal;
            shadow += influence.shadow;
            wild += influence.wild;
        });

        if (fire) {
            fire += wild;
        }
        if (time) {
            time += wild;
        }
        if (justice) {
            justice += wild;
        }
        if (primal) {
            primal += wild;
        }
        if (shadow) {
            shadow += wild;
        }

        $("#card-count-number").text(String(count));
        $("#power-sources-number").text(String(power));

        setInfluenceCount($("#fire-sources-number"), fire);
        setInfluenceCount($("#time-sources-number"), time);
        setInfluenceCount($("#justice-sources-number"), justice);
        setInfluenceCount($("#primal-sources-number"), primal);
        setInfluenceCount($("#shadow-sources-number"), shadow);
    }

    /*
        Fill in card type counts for each element of class
        "power-type-count" in the document.
    */
    function generatePowerTypeCounts(
        deck
    ) {
        $(".power-type-count").each(function (index, div) {
            var flag, count;

            count = 0;
            flag = $(div).attr("tag");
            $.each(deck.cards, function (cardIndex, card) {
                if (card.flags[flag]) {
                    count += 1;
                }
            });

            $(div).text(String(count));
        });
    }

    /*
        When the deck changes, store the new deck in local storage
        and regenerate the user interface components which depend
        on the contents of the deck.
    */
    function onDeckChange(deck) {
        var dots;
        currentDeck = deck;

        saveDeck();

        if (oddsWorker) {
            oddsWorker.cancel();
        }
        oddsWorker = generateOddsTable(
            $("#power-table-cost-div"),
            $("#power-table-odds-div"),
            cardLibrary,
            deck
        );

        dots = drawPowerGraph($("#power-graph-div"), graphStyle, deck);
        graphPopupTracker.setGraphDots(dots);

        generateInfluencePanel(deck);
        generatePowerTypeCounts(deck);
        buildDeckRows(deck);
        addDeckTitle(deck);
    }

    function saveDeck() {
        var decklist = currentDeck.generateDecklist(false);

        try {
            /*
                If the deck has been loaded from a URL, we'll
                assume changes are temporary and shouldn't be
                saved as the most recent deck.
            */
            if (!deckFromURL) {
                localStorage.setItem("decklist", decklist);
                localStorage.setItem("decktitle", currentDeck.title);
            }
        } catch (ignore) {
            // do nothing
        }
    }

    /*
        Given a list of cardcount objects, change the count associated
        with a particular card id.  Return the full list, including
        the modified cardcount.
    */
    modifyCardCount = function (deck, cardid, count) {
        var modifiedList, modifiedDeck;

        modifiedList = [];

        $.each(deck.cardlist, function (index, cardcount) {
            if (cardcount.id === cardid) {
                if (count >= 0) {
                    modifiedList.push({
                        id: cardcount.id,
                        name: cardcount.name,
                        count: count
                    });
                }
            } else {
                modifiedList.push(cardcount);
            }
        });

        modifiedDeck = makeEternalDeck(cardLibrary, modifiedList, deck.marketlist.slice(),
            gatherOptions());
        onDeckChange(modifiedDeck);
    };


    /*
        Given a list of cardcount objects, change the count associated
        with a particular card id.  Return the full list, including
        the modified cardcount. (Markets only)
    */
    modifyMarketCardCount = function (deck, cardid, count) {
        var modifiedList, modifiedDeck;

        modifiedList = [];

        if (count > 1) {
            return;
        }

        $.each(deck.marketlist, function (index, cardcount) {
            if (cardcount.id === cardid) {
                if (count >= 0) {
                    modifiedList.push({
                        id: cardcount.id,
                        name: cardcount.name,
                        count: count
                    });
                }
            } else {
                modifiedList.push(cardcount);
            }
        });

        modifiedDeck = makeEternalDeck(cardLibrary, deck.cardlist.slice(), modifiedList,
            gatherOptions());
        onDeckChange(modifiedDeck);
    };

    /*
        When the import textarea changes, check whether the decklist
        is valid, and enable or disable the import button.  Report
        any syntax error in the user interface.
    */
    function validateImportDeck() {
        var deck;

        deck = makeEternalDeckFromString(
            cardLibrary,
            $("#import-modal-deck").val()
        );

        if (deck.makeError) {
            $("#import-validation-result").text(deck.makeError);
            $("#import-modal-import-button").addClass("disabled");
        } else {
            $("#import-validation-result").text("");
            $("#import-modal-import-button").removeClass("disabled");
        }
    }

    /*  When deck import is confirmed, switch to the new deck  */
    function onDeckImport() {
        var deck;

        deck = makeEternalDeckFromString(
            cardLibrary,
            $("#import-modal-deck").val()
        );
        onDeckChange(deck);
    }

    /*  Copy text to the system clipboard  */
    function copyToClipboard(content) {
        var input, scrollLeft, scrollTop;

        scrollLeft = document.body.scrollLeft;
        scrollTop = document.body.scrollTop;

        input = $("<textarea contenteditable=\"true\">");
        input.appendTo($("body")).val(content);

        var isiOSDevice = navigator.userAgent.match(/ipad|iphone/i);

        if (isiOSDevice) {
            iosCopyToClipboard(input[0]);
        } else {
            input.select();
            document.execCommand("copy");
        }

        input.remove();
        document.body.scrollLeft = scrollLeft;
        document.body.scrollTop = scrollTop;
    }

    function iosCopyToClipboard(el) {
        var oldContentEditable = el.contentEditable,
            oldReadOnly = el.readOnly,
            range = document.createRange();

        el.contentEditable = true;
        el.readOnly = false;
        range.selectNodeContents(el);

        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(range);

        el.setSelectionRange(0, 999999);

        el.contentEditable = oldContentEditable;
        el.readOnly = oldReadOnly;

        document.execCommand("copy");
    }

    /*  Copy the current decklist to the clipboard  */
    function onDeckExport() {
        var decklist;

        decklist = currentDeck.generateDecklist(true);
        copyToClipboard(decklist);
    }

    /*  Generate a link to the current deck  */
    function onGenerateLink() {
        var code, link, index;

        code = currentDeck.generateDeckCode();

        link = String(document.location);

        index = link.indexOf("?");
        if (index >= 0) {
            link = link.substring(0, index);
        }

        link = link + "?d=" + code;

        var options = gatherOptions();
        link = options.title ? link + "&t=" + encodeURIComponent(options.title) : link;

        copyToClipboard(link);
    }

    /*  Generate a link to EWC deck builder for the current deck  */
    function onGenerateEwcLink() {
        var main, market, win, idRegex = /^Set([0-9]+) #([0-9]+)/, link = 'https://eternalwarcry.com/deck-builder';

        var processCard = function (cardcount) {
            var match = cardcount.id.match(idRegex);

            if (!match) {
                return null;
            }

            return match[1] + '-' + match[2] + ':' + cardcount.count;
        };

        main = $.map(currentDeck.cardlist, processCard).join(';');

        link += "?main=" + main;

        if (currentDeck.marketlist && currentDeck.marketlist.length) {
            market = $.map(currentDeck.marketlist, processCard).join(';');

            link += "&market=" + market;
        }

        win = window.open(link);
        win.focus();
    }



    /*  Reset the deck to an empty deck  */
    function onDeckClear() {
        var deck, market, options;

        market = currentDeck.marketlist.slice();

        options = gatherOptions();
        options.title = "Untitled";
        deck = makeEternalDeck(cardLibrary, [], market, options);
        onDeckChange(deck);
    }


    /*  Reset the deck to an empty deck  */
    function onMarketClear() {
        var deck, cards;

        cards = currentDeck.cardlist.slice();
        deck = makeEternalDeck(cardLibrary, cards, [], gatherOptions());
        onDeckChange(deck);
    }

    /*
        Add a new card to the current deck upon confirmation from the
        add card dialog.
    */
    function onAddCard(dropdownOption, toMarket) {
        var cards, market, deck, cardid;

        cardid = dropdownOption.val();
        if (!cardid.length) {
            return;
        }

        cards = currentDeck.cardlist.slice();
        market = currentDeck.marketlist.slice();
        var card = {
            id: cardid,
            name: dropdownOption.text(),
            count: 1
        };
        if (toMarket) {
            market.push(card);
        } else {
            cards.push(card);
        }

        deck = makeEternalDeck(cardLibrary, cards, market, gatherOptions());
        onDeckChange(deck);
    }

    /*  Report an error with a modal dialog  */
    function showError(
        title,
        content
    ) {
        $("#error-title").text(title);
        $("#error-text").text(content);
        $("#error-modal").modal("show");
    }

    /*  Perform final UI steps after the entire page loads  */
    function onLoad() {
        var importButton, importPopupActive;

        /*
            When page loading finishes, report any syntax error in the
            card library by showing an error dialog.
        */
        if (cardLibrary.makeError) {
            showError("Card list error", cardLibrary.makeError);
            return;
        }

        /*
            If there is no deck loaded, show a pop-up indicating
            that importing a deck is a good first step
        */
        if (!currentDeck.cards.length) {
            importPopupActive = true;
            importButton = $("#import-button");
            importButton.popup("show");

            $(window).bind("click", function () {
                if (importPopupActive) {
                    importButton.popup("hide");
                    importPopupActive = false;
                }
            });
        }

        /*
            Fonts may have been loaded, which means we should redraw
            the graph.
        */
        onDeckChange(currentDeck);
    }

    /*  Bind all buttons to their behavior handlers  */
    function bindButtons() {
        $(window).bind("load", onLoad);
        $(".help").popup({
            position: "top center",
            offset: 6
        });

        $("#import-button").popup({ on: "" });
        $("#import-button").bind("click", function () {
            $("#import-modal-deck").val("").select();
            $("#import-modal").modal("show");
        });

        $("#import-modal-deck").bind("input", function () {
            validateImportDeck();
        });

        $("#export-button").popup({ on: "click" });
        $("#export-button").bind("click", function () {
            onDeckExport();
        });

        $("#link-button").popup({ on: "click" });
        $("#link-button").bind("click", function () {
            onGenerateLink();
        });

        $("#ewc-button").popup({ on: "hover" });
        $("#ewc-button").bind("click", function () {
            onGenerateEwcLink();
        });

        $("#about-heading").bind("click", function () {
            $("#about-modal").modal("show");
        });

        $("#add-card-button").bind("click", function () {
            $("#add-card-dropdown").dropdown("clear");
            $("#add-card-modal").modal("show");
        });

        $("#add-market-card-button").bind("click", function () {
            $("#add-market-card-dropdown").dropdown("clear");
            $("#add-market-card-modal").modal("show");
        });

        $("#clear-button").popup({ on: "click" });
        $("#clear-button").bind("click", function () {
            onDeckClear();
            $("#clear-button").popup("reposition");
        });

        $("#clear-market-button").popup({ on: "click" });
        $("#clear-market-button").bind("click", function () {
            onMarketClear();
            $("#clear-market-button").popup("reposition");
        });

        $("#import-modal-import-button").bind("click", function () {
            onDeckImport();
        });

        $("#add-card-modal-add-button").bind("click", function () {
            onAddCard($("#add-card-dropdown option:selected"));
        });

        $("#add-market-card-modal-add-button").bind("click", function () {
            onAddCard($("#add-market-card-dropdown option:selected"), true);
        });

        $("#power-table-container").css("display", "none");

        $("#graph-menu-item").bind("click", function () {
            $("#power-graph-container").css("display", "inline");
            $("#power-table-container").css("display", "none");

            $("#graph-menu-item").addClass("active");
            $("#table-menu-item").removeClass("active");
        });

        $("#table-menu-item").bind("click", function () {
            $("#power-graph-container").css("display", "none");
            $("#power-table-container").css("display", "inline");

            $("#graph-menu-item").removeClass("active");
            $("#table-menu-item").addClass("active");
        });
    }

    function bindOther() {
        var KEYCODE_ENTER = 13;
        document.getElementById("deck-title").addEventListener("keydown", function(e) {
            if (e.keyCode === KEYCODE_ENTER) {
                e.preventDefault();
                e.target.blur();
            }
        });
        document.getElementById("deck-title").addEventListener("input", function(e) {
            // This would only happen after a copy/paste, text drag-drop, etc, because
            // we prevent the enter key from being typed. Doing this replace all of the time breaks
            // fluid typing, unfortunately, so both measures are necessary (as far as I know)
            if (e.target.innerText.indexOf("\n") > -1) {
                e.target.innerText = e.target.innerText.replace("\n", " ");
            }
            currentDeck.title = e.target.innerText;
            saveDeck();
        });
    }

    /*
        Add all the cards from the card library to the dropdown
        selector in the add card dialog.
    */
    function gatherCards() {
        var dropdown, cardnames, cardids, marketDropdown;

        $(".ui.dropdown").dropdown();

        dropdown = $("#add-card-dropdown");
        marketDropdown = $("#add-market-card-dropdown");

        cardnames = [];
        cardids = {};
        $.each(Object.values(cardLibrary.cards), function (index, card) {
            cardnames.push(card.name);
            cardids[card.name] = card.id;
        });

        cardnames.sort();

        $.each(cardnames, function (index, name) {
            var cardid;

            cardid = cardids[name];
            $("<option>").val(cardid).text(name).appendTo(dropdown);
            $("<option>").val(cardid).text(name).appendTo(marketDropdown);
        });
    }

    /*
        Load a deck from the code in the URL.
        Returns true if a valid deck code is present, false otherwise.
    */
    function getDeckFromURL() {
        var params;

        params = new URLSearchParams(document.location.search);

        if (!params.has("d")) {
            return false;
        }

        var title = params.get("t");

        currentDeck = makeEternalDeckFromCode(cardLibrary, params.get("d"), { title: title });
        if (currentDeck.makeError) {
            showError("Deck code error", currentDeck.makeError);

            currentDeck = null;
            return false;
        }

        return true;
    }

    /*
        Check browser local storage for a decklist saved from a
        previous visit to the page.  If one is found, load that
        decklist as the active deck.
    */
    function getDeckFromStorage() {
        var decklist, options = {};

        decklist = "";
        /*
            Some browsers (Safari, Edge) throw exceptions when accessing
            local storage on a page with a file:... URL.  Behave as if
            there is no stored decklist in this case.
        */
        try {
            if (localStorage) {
                decklist = localStorage.getItem("decklist");
                options.title = localStorage.getItem("decktitle");
            }
        } catch (ignore) {
        }

        if (!decklist) {
            decklist = "";
        }

        currentDeck = makeEternalDeckFromString(cardLibrary, decklist, options);
        if (currentDeck.makeError) {
            currentDeck = makeEternalDeckFromString(cardLibrary, "");
        }
    }

    graphPopupTracker = makeGraphPopupTracker();

    deckFromURL = getDeckFromURL();
    if (!deckFromURL) {
        getDeckFromStorage();
    }

    onDeckChange(currentDeck);
    bindButtons();
    bindOther();
    gatherCards();
}
