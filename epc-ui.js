/*global $, document, window, localStorage*/
/*global generateOddsTable, drawPowerGraph*/
/*global makeEternalCardLibrary, makeEternalDeck, makeEternalDeckFromString*/
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

'use strict';


/*
    Hook up all user interface behavior.  The parameter is used 
    to determine the visual appearance of the graph.
*/
function buildEpcUI(
    graphStyle
) {
    var cardlist, cardLibrary, currentDeck, modifyCardCount;

    cardlist = $("#card-list").html();
    cardLibrary = makeEternalCardLibrary(cardlist);

    /*
        Add the rows to the editable deck, one for each card,
        with -/+ buttons for modifying the card count.
    */
    function buildDeckRows(
        deck
    ) {
        var deckEditDiv, row;

        deckEditDiv = $("#deck-edit-rows");
        deckEditDiv.empty();

        $.each(deck.cardlist, function (index, cardcount) {
            var name, cardid, count, countstr, addButton, subButton;

            name = cardcount.name;
            cardid = cardcount.id;
            count = cardcount.count;
            countstr = String(count);

            row = $("<div>").addClass("card-count-edit")
                .appendTo(deckEditDiv);
            $("<div>").addClass("card-name").text(name).appendTo(row);
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
        });
    }

    /*
        When the deck changes, store the new deck in local storage
        and regenerate the user interface components which depend
        on the contents of the deck.
    */
    function onDeckChange(
        deck
    ) {
        var decklist;
        currentDeck = deck;

        decklist = currentDeck.generateDecklist(false);
        try {
            localStorage.setItem("decklist", decklist);
        } catch (ignore) {
        }

        generateOddsTable(
            $("#power-table-div"),
            $("#power-table-sources"),
            $("#deck-validation-result"),
            cardLibrary,
            deck
        );
        drawPowerGraph($("#power-graph-container"), graphStyle, deck);
        buildDeckRows(deck);
    }

    /*
        Given a list of cardcount objects, change the count associated
        with a particular card id.  Return the full list, including
        the modified cardcount.
    */
    modifyCardCount = function (
        deck,
        cardid,
        count
    ) {
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

        modifiedDeck = makeEternalDeck(cardLibrary, modifiedList);
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

    /*  Copy the current decklist to the clipboard  */
    function onDeckExport() {
        var decklist, input;

        decklist = currentDeck.generateDecklist(true);
        input = $("<textarea>").appendTo($("body")).val(decklist).select();
        document.execCommand("copy");
        input.remove();
    }

    /*
        Add a new card to the current deck upon confirmation from the
        add card dialog.
    */
    function onAddCard(
        dropdownOption
    ) {
        var cards, deck, cardid;

        cardid = dropdownOption.val();
        if (!cardid.length) {
            return;
        }

        cards = currentDeck.cardlist.slice();
        cards.push({
            id: cardid,
            name: dropdownOption.text(),
            count: 1
        });

        deck = makeEternalDeck(cardLibrary, cards);
        onDeckChange(deck);
    }

    /*  Perform final UI steps after the entire page loads  */
    function onLoad() {
        var importButton, importPopupActive;

        /*
            When page loading finishes, report any syntax error in the
            card library by showing an error dialog.
        */
        if (cardLibrary.makeError) {
            $("#card-list-error-text").text(cardLibrary.makeError);
            $("#card-list-error-modal").modal("show");
            return;
        }

        /*
            If there is no deck loaded, show a pop-up indicating
            that importing a deck is a good first step
        */
        if (!currentDeck.cards.length) {
            importPopupActive = true;
            importButton = $("#import-button");
            importButton.popup("toggle");

            $(window).bind("click", function () {
                if (importPopupActive) {
                    importButton.popup("toggle");
                    importPopupActive = false;
                }
            });
        }
    }

    /*  Bind all buttons to their behavior handlers  */
    function bindButtons() {
        $(window).bind("load", onLoad);

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

        $("#about-button").bind("click", function () {
            $("#about-modal").modal("show");
        });

        $("#add-card-button").bind("click", function () {
            $("#add-card-dropdown").dropdown("clear");
            $("#add-card-modal").modal("show");
        });

        $("#import-modal-import-button").bind("click", function () {
            onDeckImport();
        });

        $("#add-card-modal-add-button").bind("click", function () {
            onAddCard($("#add-card-dropdown option:selected"));
        });

        $("#table-and-sources").css("display", "none");

        $("#graph-menu-item").bind("click", function () {
            $("#power-graph-container").css("display", "inline");
            $("#table-and-sources").css("display", "none");

            $("#graph-menu-item").addClass("active");
            $("#table-menu-item").removeClass("active");
        });

        $("#table-menu-item").bind("click", function () {
            $("#power-graph-container").css("display", "none");
            $("#table-and-sources").css("display", "inline");

            $("#graph-menu-item").removeClass("active");
            $("#table-menu-item").addClass("active");
        });
    }

    /*
        Add all the cards from the card library to the dropdown
        selector in the add card dialog.
    */
    function gatherCards() {
        var dropdown, cardnames, cardids;

        $(".ui.dropdown").dropdown();

        dropdown = $("#add-card-dropdown");

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
        });
    }

    /*
        Check browser local storage for a decklist saved from a 
        previous visit to the page.  If one is found, load that
        decklist as the active deck.
    */
    function getDeckFromStorage() {
        var decklist;

        decklist = "";
        /*
            Some browsers (Safari, Edge) throw exceptions when accessing
            local storage on a page with a file:... URL.  Behave as if
            there is no stored decklist in this case.
        */
        try {
            if (localStorage) {
                decklist = localStorage.getItem("decklist");
            }
        } catch (ignore) {
        }

        if (!decklist) {
            decklist = "";
        }

        currentDeck = makeEternalDeckFromString(cardLibrary, decklist);
        if (currentDeck.makeError) {
            currentDeck = makeEternalDeckFromString(cardLibrary, "");
        }
    }

    getDeckFromStorage();
    onDeckChange(currentDeck);
    bindButtons();
    gatherCards();
}
