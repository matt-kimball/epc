/*global $, window*/
/*jslint unparam: true, regexp: true*/
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
    A straightforward implementation of factorial.

    We'll implement a cache below to speed up the results when needing
    to compute factorials many thousand times.
*/
function factorialSlow(
    n
) {
    var i, r;

    r = 1;
    for (i = n; i > 1; i -= 1) {
        r = r * i;
    }

    return r;
}

/*
    Build a table of factorial values for n < 100

    This is useful for speeding up computations of draw odds, because
    we will be needing to compute thousands of cases.
*/
var factorialLookup = {};
function buildFactorialLookup() {
    var i;

    for (i = 0; i < 100; i += 1) {
        factorialLookup[i] = factorialSlow(i);
    }
}
buildFactorialLookup();

/*  Compute factorial, using the result cache if available  */
function factorial(
    n
) {
    if (n < 100) {
        return factorialLookup[n];
    }

    return factorialSlow(n);
}

/*
    A standard binomial distribution

    https://en.wikipedia.org/wiki/Binomial_distribution
*/
function binomial(
    n,
    k
) {
    if (k > n) {
        return 0;
    }

    return factorial(n) / factorial(k) / factorial(n - k);
}

/*
    Construct an object tracking a set of influence requirements

    We will want to track the casting cost of cards, as well as the
    influence provided by cards and influence requirements effects
    in the card text.  This object tracks the power requirement, as
    well as the faction influence required.  A "wild" influence
    value is used to represent influence which can be of any 
    type.  (i.e. Diplomatic Seal)
*/
function makeInfluence(
    influenceString
) {
    var i,
        chr,
        digit,
        influence = {
            power: 0,
            fire: 0,
            justice: 0,
            primal: 0,
            shadow: 0,
            time: 0,
            wild: 0  /*  influence of any type  */
        };

    /*
        Decode the input string representing influence.

        For example, '2FF' would represent two power, and
        two fire influence.
    */
    for (i = 0; i < influenceString.length; i += 1) {
        chr = influenceString[i];

        if (chr.charCodeAt(0) >= '0'.charCodeAt(0)
                && chr.charCodeAt(0) <= '9'.charCodeAt(0)) {

            digit = Number(chr);
            if (influence.power > 0) {
                influence.power = influence.power * 10 + digit;
            } else {
                influence.power = digit;
            }
        } else if (chr === 'F') {
            influence.fire += 1;
        } else if (chr === 'J') {
            influence.justice += 1;
        } else if (chr === 'P') {
            influence.primal += 1;
        } else if (chr === 'S') {
            influence.shadow += 1;
        } else if (chr === 'T') {
            influence.time += 1;
        } else if (chr === 'X') {
            influence.wild += 1;
        } else {
            influence.makeError =
                'Invalid influence: "' + influenceString + '"';
        }
    }

    /*  Zero out the values in this influence object  */
    influence.zero = function () {
        influence.power = 0;
        influence.fire = 0;
        influence.justice = 0;
        influence.primal = 0;
        influence.time = 0;
        influence.shadow = 0;
        influence.wild = 0;
    };

    /*  Returns true if all the influence values are zeroed  */
    influence.isEmpty = function () {
        if (influence.power > 0) {
            return false;
        }

        if (influence.fire > 0 || influence.justice > 0 ||
                influence.primal > 0 || influence.time > 0 ||
                influence.shadow > 0 || influence.wild > 0) {
            return false;
        }

        return true;
    };

    /*  Return a string which represents these influence requirements  */
    influence.toString = function () {
        var str;

        if (influence.power > 0) {
            str = String(influence.power);
        } else {
            str = "";
        }

        str = str + 'F'.repeat(influence.fire);
        str = str + 'T'.repeat(influence.time);
        str = str + 'J'.repeat(influence.justice);
        str = str + 'P'.repeat(influence.primal);
        str = str + 'S'.repeat(influence.shadow);
        str = str + 'X'.repeat(influence.wild);

        return str;
    };

    /*
        Returns true if the influence of this object is relevant to
        casting a card with target influence.

        For example, 'FF' would be relevant to a '1F' card,
        but 'PS' would not be.

        Power is considered, so, unlike 'PS', a '1PS' influence
        source would be relevant to a '1F' target.
    */
    influence.relevantTo = function (target) {
        if (influence.power > 0 && target.power > 0) {
            return true;
        }

        if (influence.fire > 0 && target.fire > 0) {
            return true;
        }

        if (influence.justice > 0 && target.justice > 0) {
            return true;
        }

        if (influence.primal > 0 && target.primal > 0) {
            return true;
        }

        if (influence.shadow > 0 && target.shadow > 0) {
            return true;
        }

        if (influence.time > 0 && target.time > 0) {
            return true;
        }

        if (influence.wild > 0) {
            if (target.fire > 0 || target.justice > 0
                    || target.primal > 0 || target.shadow > 0
                    || target.time > 0) {
                return true;
            }
        }

        return false;
    };

    /*
        Add multiple copies of the influence from another
        influence object to this influence.
    */
    influence.add = function (count, other) {
        influence.power += count * other.power;
        influence.fire += count * other.fire;
        influence.justice += count * other.justice;
        influence.primal += count * other.primal;
        influence.shadow += count * other.shadow;
        influence.time += count * other.time;
        influence.wild += count * other.wild;
    };

    /*
        Mask out the influence of this object to only the
        types of influence required to cast the target card
        requirements.

        For example, '2PS' masked by '3FP' would result in
        '2P', since the shadow influence is irrelevant to
        casting, but the power and primal influence are still
        relevant.
    */
    influence.mask = function (target) {
        var masked = makeInfluence("");

        if (target.power > 0) {
            masked.power = influence.power;
        }

        if (target.fire > 0) {
            masked.fire = influence.fire;
        }

        if (target.justice > 0) {
            masked.justice = influence.justice;
        }

        if (target.primal > 0) {
            masked.primal = influence.primal;
        }

        if (target.shadow > 0) {
            masked.shadow = influence.shadow;
        }

        if (target.time > 0) {
            masked.time = influence.time;
        }

        if (target.fire > 0 ||
                target.justice > 0 ||
                target.primal > 0 ||
                target.shadow > 0 ||
                target.time > 0 ||
                target.wild > 0) {

            masked.wild = influence.wild;
        }

        return masked;
    };

    /*
        Returns true if our influence requirements are equivalent
        to another influence object.
    */
    influence.equals = function (other) {
        return (other.power === influence.power &&
            other.fire === influence.fire &&
            other.justice === influence.justice &&
            other.primal === influence.primal &&
            other.shadow === influence.shadow &&
            other.time === influence.time &&
            other.wild === influence.wild);
    };

    /*
        Returns true if the influence we represent fully satisfies
        the casting cost of the target influence requirements.
    */
    influence.satisfies = function (target) {
        var unsatisfied = 0;

        if (influence.power < target.power) {
            return false;
        }

        if (influence.fire < target.fire) {
            unsatisfied += target.fire - influence.fire;
        }

        if (influence.justice < target.justice) {
            unsatisfied += target.justice - influence.justice;
        }

        if (influence.primal < target.primal) {
            unsatisfied += target.primal - influence.primal;
        }

        if (influence.shadow < target.shadow) {
            unsatisfied += target.shadow - influence.shadow;
        }

        if (influence.time < target.time) {
            unsatisfied += target.time - influence.time;
        }

        if (influence.wild < unsatisfied) {
            return false;
        }

        return true;
    };

    return influence;
}

/*
    Construct an object representing an eternal card

    We will track the influence required to cast the card, the
    influence provided by the card, as well as any influence
    required for particular card effects.

    For example, the cycle of Champions have influence card effects
    in addition to the casting cost.  (i.e. Champion of Glory has
    FF and JJ effects in the body of the card.)
*/
function makeEternalCardInfo(
    id,
    influenceGenerated,
    influenceRequired
) {
    var card = {
        id: id,  //  "SetN #XXX"
        influenceRequirements: []  // both casting cost and card effects
    };

    card.influenceGenerated = makeInfluence(influenceGenerated);
    if (card.influenceGenerated && card.influenceGenerated.makeError) {
        card.makeError = card.influenceGenerated.makeError;
    }

    /*
        The influence required string passed has both the casting
        cost and card effects, separated by commas.

        i.e. "2FP,FF,PP"
    */
    $.each(influenceRequired.split(','), function (index, str) {
        var influence = makeInfluence(str);

        if (influence) {
            if (influence.makeError) {
                card.makeError = influence.makeError;
            } else if (!influence.isEmpty()) {
                card.influenceRequirements.push(influence);
            }
        }
    });

    return card;
}

/*
    Construct a library of card information.

    This represents all cards which we know about.  A string with
    the ids and influence information about all cards in the
    library is passed in, which we break down into an object
    representation of those cards.

    The input string is formatted like this:

        Set1 #1; 1F;
        Set1 #2;; 2FFF
        Set1 #3;; 2FF
        ...

    Each line has the value for one card, separated by semicolons.
    First we have the card identifier, with the set the card is
    from and the card number.  Next we have the influence provided
    by that card.  Finally we have the influence required by that
    card.  The influence required can have multiple influence
    values, separated by commas.  (i.e. "2FP,FF,PP")  The first
    value is the casting cost, followed by influence effect
    requirements.

*/
function makeEternalCardLibrary(
    cards
) {
    var library = {
        cards: {}  // indexed by card id
    };

    /*
        Break an individual line in the card library input
        into the representation of an individual card.
    */
    function addCardInfo(
        line
    ) {
        var re, match, card, id, influenceGenerated, influenceRequired;

        line = line.trim();
        if (line.length <= 0) {
            return;
        }

        re = /^(Set[0-9]+ #[0-9]+);(.*);(.*)$/;
        match = line.match(re);

        if (!match) {
            library.makeError = 'Invalid card info: "' + line + '"';
            return;
        }

        id = match[1];
        influenceGenerated = match[2].trim();
        influenceRequired = match[3].trim();

        card = makeEternalCardInfo(id, influenceGenerated, influenceRequired);
        if (card.makeError) {
            library.makeError = card.makeError + ' in "' + line + '"';
        }

        library.cards[id] = card;
    }

    /*  Iterate over all lines in the input, constructing cards  */
    $.each(cards.split("\n"), function (index, line) {
        if (library.makeError) {
            return library;
        }

        addCardInfo(line);
    });

    return library;
}

/*
    Construct an iterator over all possible combination of draw values
    which satisfy an influence requirement.

    'cardGroups' is a list of lists of equivalent cards.  Each sublist
    in contains cards which are equivalent for the purposes of casting
    the target influence.  (For example, Seat of Fury and Skycrag Banner
    are considered equivalent, because they both provide "1FP".)

    This whole thing seems complicated, and it is, but not unnecessarily
    so.  In an earlier implementation, I simply constructed a list of 
    all possible card combinations, rather than using an iterator,
    and didn't group equivalent cards, but rather considered each card
    individually.  This computed the correct probability result, but the
    performance was horrible, stalling out the UI for a minute or more
    on complicated decklists.

    In the pursuit of speeding things up, this complicated
    iterator thing was born.  It reduced both the memory consumption
    and the time required for computation by more than a factor of
    a thousand.
*/
function makeDrawCombinationIterator(
    deck,
    cardGroups,
    maxCards,
    influence
) {
    var iter, workingInfluence;

    iter = {
        cardGroups: cardGroups,  // list of lists of cards
        cardGroupCount: [],  // per group, number of cards in the deck
        cardGroupInfluence: [],  // per group, influence provided
        current: [],  // Current draw counts (i.e. [1, 0, 2])
        done: false  // Have all values been returned?
    };
    workingInfluence = makeInfluence("");

    /*
        Increment the iterator to the next draw combination.
        We will start by simply increasing the number of the
        last card group in the list.  If this now exceeds the
        total count of cards of that group in the deck, we
        will reset that count to zero and then increment the
        count on the previous group in the list.
    */
    function incrementCurrent() {
        var index, count;

        index = iter.current.length - 1;

        while (index >= 0) {
            count = iter.cardGroupCount[index];

            iter.current[index] += 1;
            if (iter.current[index] <= count) {
                return;
            }

            iter.current[index] = 0;
            index -= 1;
        }

        iter.done = true;
    }

    /*
        Returns true if the current value of the iterator
        satisifies the influence requirements we are targeting.

        We add up the influence from all the individual card
        groups, along with the current count of cards in that
        group, to determine the total influence provided, and
        then compare against the target influence.
    */
    function drawSatisfiesInfluence() {
        var i, groupInfluence, count;

        workingInfluence.zero();
        for (i = 0; i < cardGroups.length; i += 1) {
            groupInfluence = iter.cardGroupInfluence[i];
            count = iter.current[i];

            workingInfluence.add(count, groupInfluence);
        }

        return workingInfluence.satisfies(influence);
    }

    /*
        Return the total count of cards represented by the 
        current iterator value.
    */
    function currentCount() {
        var i, count;

        count = 0;
        for (i = 0; i < cardGroups.length; i += 1) {
            count += iter.current[i];
        }

        return count;
    }

    /*
        Return an object with the next value of the iterator
        and a flag indicating whether the iterator has completed.

        This conforms to the iterator protocol suggested by
        ECMAScript 2015.
    */
    iter.next = function () {
        while (!iter.done) {
            incrementCurrent();

            if (currentCount() <= maxCards && drawSatisfiesInfluence()) {
                break;
            }
        }

        if (iter.done) {
            return { done: true };
        }

        return { value: iter.current.slice(), done: false };
    };

    /*
        Extract the card count and influence requirement for
        each card group.
    */
    $.each(cardGroups, function (index, value) {
        var groupInfluence, count;

        iter.current.push(0);

        count = 0;
        $.each(cardGroups[index], function (cardIndex, card) {
            groupInfluence = card.influenceGenerated;
            count += deck.cardCount[card.id];
        });
        iter.cardGroupCount.push(count);
        iter.cardGroupInfluence.push(groupInfluence);
    });

    return iter;
}

/*
    Construct a collection of cards in a particular deck, as specified by
    an exported decklist string.

    The decklist string is of this format:

        2 Grenadin Drone (Set1 #5)
        4 Oni Ronin (Set1 #13)
        ...

    The card id ("Set1 #5") is used to determine the card tracked.
    The name of the card is ignored.

*/
function makeEternalDeck(
    cardlibrary,
    decklist
) {
    var deck = {
        cardlibrary: cardlibrary,
        cards: [],  // all distinct cards in the deck
        cardCount: {}  // indexed by card.id
    };

    /*  Decode an individual line in the decklist input  */
    function addCardLine(
        line
    ) {
        var re, match, count, cardid, card, i;

        line = line.trim();
        if (line.length <= 0) {
            return;
        }

        re = /^([0-9]+) .+ \((Set[0-9]+ #[0-9]+)\)$/;
        match = line.match(re);

        if (!match) {
            deck.makeError = 'malformed line: "' + line + '"';
            return;
        }

        count = Number(match[1]);
        cardid = match[2];

        if (count > 100) {
            deck.makeError = 'too many cards: "' + line + '"';
            return;
        }

        card = cardlibrary.cards[cardid];
        if (!card) {
            deck.makeError = 'unknown card: "' + cardid + '"';
            return;
        }

        for (i = 0; i < count; i += 1) {

            deck.cards.push(card);
        }

        if (deck.cardCount[card.id]) {
            count += deck.cardCount[card.id];
        }
        deck.cardCount[card.id] = count;
    }

    /*
        Return a list of all distinct influence requirement values
        for all cards in the deck.  The returned list is of pairs,
        with each pair containing the influence object and a list of
        the cards requiring that influence amount.
    */
    deck.listInfluenceRequirements = function () {
        var influenceDict, influenceList, cards;

        cards = deck.cards.slice();

        /*
            Sort cards by the number of power in their primary
            influence requirement.
        */
        cards.sort(function (a, b) {
            var infA, infB;

            infA = a.influenceRequirements[0];
            infB = b.influenceRequirements[0];

            if (!infA && !infB) {
                return 0;
            }
            if (!infA) {
                return -1;
            }
            if (!infB) {
                return 1;
            }

            return infA.power - infB.power;
        });

        influenceList = [];
        influenceDict = {};
        $.each(cards, function (index, card) {
            $.each(card.influenceRequirements, function (index, influence) {
                var influenceStr, influencePair;

                influenceStr = influence.toString();

                influencePair = influenceDict[influenceStr];
                if (influencePair) {
                    influencePair[1].push(card);
                    return;
                }

                influencePair = [influence, [card]];
                influenceList.push(influencePair);
                influenceDict[influenceStr] = influencePair;
            });
        });

        return influenceList;
    };

    /*
        Return an iterator for all possible combinations of drawn cards
        which can satisfy the influence target.
    */
    function listDrawCombinations(
        influence,
        maxCards
    ) {
        var relevantCards, cardGroups;

        /*  Find all cards with relevant influence provided  */
        relevantCards = [];
        $.each(Object.getOwnPropertyNames(deck.cardCount),
            function (index, id) {
                var card;

                card = deck.cardlibrary.cards[id];
                if (card.influenceGenerated &&
                        card.influenceGenerated.relevantTo(influence)) {
                    relevantCards.push(card);
                }
            });

        /*  Group relevant cards by equivalent influence  */
        cardGroups = [];
        $.each(relevantCards, function (index, card) {
            var foundGroup = false;

            $.each(cardGroups, function (index, group) {
                var groupCard, groupInfluence, cardInfluence;

                if (foundGroup) {
                    return;
                }

                /*
                    By masking by the target influence, we can determine
                    whether two influence sources are equivalent.
                */
                groupCard = group[0];
                groupInfluence = groupCard.influenceGenerated.mask(influence);
                cardInfluence = card.influenceGenerated.mask(influence);

                if (groupInfluence.equals(cardInfluence)) {
                    group.push(card);
                    foundGroup = true;
                }
            });

            if (!foundGroup) {
                cardGroups.push([ card ]);
            }
        });

        /*
            Now that we have equivalent card groups, we can iterate
            over the draw values for those groups.
        */
        return makeDrawCombinationIterator(
            deck,
            cardGroups,
            maxCards,
            influence
        );
    }

    /*
        Compute the odds for drawing a particular combination of
        cards.

        `cardGroupCount` and `combination` are parallel lists 
        with numbers of cards.  For example:

            cardGroupCount = [2, 4]
            combination = [2, 3]

        would indicate we want the odds of drawing both copies of
        a two-of card, and three copies of a 4-of card from the
        deck.

    */
    function oddsForCombination(
        cardGroupCount,  // count of cards in the deck per group
        combination,  // number of cards drawn per group
        drawCount  // total cards drawn to get combination
    ) {
        var odds, count, totalMatch, totalDeckMatch, deckCount, i;

        /*
            This is a generalization of a hypergeomtic distribution

            https://en.wikipedia.org/wiki/Hypergeometric_distribution

            A standard hypergeometric distribution computes the odds
            of drawing one success type from a group, but we want
            the odds of drawing multiple success types.  (Each
            success type is a card group.)
        */
        odds = 1;
        totalMatch = 0;
        totalDeckMatch = 0;
        for (i = 0; i < combination.length; i += 1) {
            count = combination[i];
            deckCount = cardGroupCount[i];

            odds = odds * binomial(deckCount, count);
            totalDeckMatch += deckCount;
            totalMatch += count;
        }

        odds = odds * binomial(
            deck.cards.length - totalDeckMatch,
            drawCount - totalMatch
        );
        odds = odds / binomial(deck.cards.length, drawCount);

        return odds;
    }

    /*
        Return the probably of drawing a hand which can satisfy
        a target influence requirement, given that we have drawn
        a particular number of cards.
    */
    deck.drawOdds = function (
        drawCount,
        influence
    ) {
        var drawCombinations, combinationIter, odds;

        if (drawCount >= deck.cards.length) {
            return 1;
        }

        drawCombinations = listDrawCombinations(influence, drawCount);

        /*
            Iterate over all possible combinations of drawn cards
            which satisfy the target influence, and add up the
            probability of drawing each.
        */
        odds = 0;
        while (true) {
            combinationIter = drawCombinations.next();
            if (combinationIter.done) {
                break;
            }

            odds = odds + oddsForCombination(
                drawCombinations.cardGroupCount,
                combinationIter.value,
                drawCount
            );
        }

        return odds;
    };

    /*  For each line in the decklist input, decode the card and count  */
    $.each(decklist.split("\n"), function (index, line) {
        if (deck.makeError) {
            return;
        }

        addCardLine(line);
    });

    return deck;
}

/*  Draw a graph of influence component odds on a canvas element  */
function drawPowerGraph(
    canvas,
    mousePos,
    deck,
    totalInfluence
) {
    var ctx,
        w,
        h,
        margin,
        graphCoord,
        fontSize,
        componentInfluences,
        minValue,
        minDraws,
        maxDraws,
        labels;

    minDraws = 7;
    maxDraws = 20;
    margin = 96;
    fontSize = 20;
    labels = [];

    /*  Set the back buffer size to be the same as the CSS size  */
    w = canvas.width();
    h = canvas.height();
    canvas.attr("width", w);
    canvas.attr("height", h);

    ctx = canvas.get(0).getContext("2d");
    ctx.clearRect(0, 0, w, h);

    /*
        We'll need space around the edge for label text, so
        the actual graph will be drawn within these coordinates.
    */
    graphCoord = {
        left: margin,
        top: fontSize / 2,
        right: w - margin,
        bottom: h - margin
    };

    /*
        Break down influence requirements into a set of component
        parts, and return a list of influences, one for each
        component present in the original influence.
    */
    function listComponentInfluences(
        influence
    ) {
        var part, components = [];

        if (influence.power > 0) {
            part = makeInfluence("");
            part.power = influence.power;
            components.push(part);
        }

        if (influence.fire > 0) {
            part = makeInfluence("");
            part.fire = influence.fire;
            components.push(part);
        }

        if (influence.justice > 0) {
            part = makeInfluence("");
            part.justice = influence.justice;
            components.push(part);
        }

        if (influence.primal > 0) {
            part = makeInfluence("");
            part.primal = influence.primal;
            components.push(part);
        }

        if (influence.shadow > 0) {
            part = makeInfluence("");
            part.shadow = influence.shadow;
            components.push(part);
        }

        if (influence.time > 0) {
            part = makeInfluence("");
            part.time = influence.time;
            components.push(part);
        }

        return components;
    }

    /*  Returns true if a pair of one-dimensional spans overlap  */
    function areSpansOverlapping(
        a,
        aLen,
        b,
        bLen
    ) {
        if (a + aLen < b) {
            return false;
        }

        if (b + bLen < a) {
            return false;
        }

        return true;
    }

    /*  Returns true if the text for two labels overlap  */
    function areLabelsOverlapping(
        a,
        b
    ) {
        var aMeasure, bMeasure;

        aMeasure = ctx.measureText(a.label);
        bMeasure = ctx.measureText(b.label);

        if (!areSpansOverlapping(
                a.x,
                aMeasure.width,
                b.x,
                bMeasure.width
            )) {

            return false;
        }

        if (!areSpansOverlapping(
                a.y,
                fontSize,
                b.y,
                fontSize
            )) {

            return false;
        }

        return true;
    }

    /*
        Add a label to be drawn if it doesn't overlap with any
        existing labels.
    */
    function addLabel(
        label,
        x,
        y
    ) {
        var overlap, newLabelPos;

        newLabelPos = {
            label: label,
            x: x,
            y: y
        };

        overlap = false;
        $.each(labels, function (index, labelPos) {
            if (areLabelsOverlapping(labelPos, newLabelPos)) {
                overlap = true;
            }
        });

        if (!overlap) {
            labels.push(newLabelPos);
        }
    }

    /*  Draw all labels previosly added to the label list  */
    function drawLabels() {
        $.each(labels, function (index, labelPos) {
            ctx.fillText(labelPos.label, labelPos.x, labelPos.y);
        });

        labels = [];
    }

    /*  Draw a label along the left side of the graph  */
    function drawLeftLabel(
        label,
        y
    ) {
        var drawX, drawY, textSize;

        textSize = ctx.measureText(label);
        drawX = graphCoord.left - textSize.width - fontSize;
        drawY = y + fontSize / 2;
        addLabel(label, drawX, drawY);
    }

    /*  Draw a label along the bottom of the graph  */
    function drawBottomLabel(
        label,
        x
    ) {
        var drawX, drawY, textSize;

        textSize = ctx.measureText(label);
        drawX = x - textSize.width / 2;
        drawY = graphCoord.bottom + 2 * fontSize;
        addLabel(label, drawX, drawY);
    }

    /*  Draw the graph outline  */
    function drawOutline() {
        ctx.save();
        ctx.fillStyle = "#f0f0e0";
        ctx.beginPath();
        ctx.moveTo(graphCoord.left, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.top);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    /*  Add the labels for the extents of the graph  */
    function addGraphLabels() {
        var minLabel, bottomLabel;

        drawLeftLabel("100%", graphCoord.top);
        minLabel = String(Math.floor(100 * minValue)) + "%";
        drawLeftLabel(minLabel, graphCoord.bottom);

        bottomLabel = String(minDraws) + " draws";
        drawBottomLabel(bottomLabel, graphCoord.left);
        bottomLabel = String(maxDraws) + " draws";
        drawBottomLabel(bottomLabel, graphCoord.right);
    }

    /*  Graph the odds for one influence requirement  */
    function drawInfluence(
        influence,
        labelPos
    ) {
        var odds, oddsY, mid, draws, x, y, fx, text, textSize;

        /*  Draw the curve  */
        ctx.beginPath();
        for (draws = minDraws; draws <= maxDraws; draws += 1) {
            odds = deck.drawOdds(draws, influence);
            oddsY = (odds - minValue) / (1.0 - minValue);

            fx = (draws - minDraws) / (maxDraws - minDraws);
            x = graphCoord.left +
                fx * (graphCoord.right - graphCoord.left);
            y = graphCoord.bottom +
                oddsY * (graphCoord.top - graphCoord.bottom);

            if (draws === minDraws) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        /*  Compute the coordinates for the label  */
        mid = Math.floor(minDraws + labelPos * (maxDraws - minDraws));
        odds = deck.drawOdds(mid, influence);
        oddsY = (odds - minValue) / (1.0 - minValue);
        fx = (mid - minDraws) / (maxDraws - minDraws);
        x = graphCoord.left + fx * (graphCoord.right - graphCoord.left);
        y = graphCoord.bottom + oddsY * (graphCoord.top - graphCoord.bottom);

        /*  Adjust for the text size  */
        text = influence.toString();
        textSize = ctx.measureText(text);
        x = x - textSize.width / 2;
        if (odds < 0.75) {
            y -= fontSize;
        } else {
            y += fontSize;
        }
        ctx.fillText(text, x, y);
    }

    /*  Draw all of the influence components  */
    function drawComponents() {
        var influences = componentInfluences.slice();

        influences.sort(function (a, b) {
            return deck.drawOdds(minDraws, b) - deck.drawOdds(minDraws, a);
        });

        $.each(influences, function (index, influence) {
            var pos;

            if (influences.length > 1) {
                pos = 0.25 + 0.5 * index / (influences.length - 1);
            } else {
                pos = 0.5;
            }

            drawInfluence(influence, pos);
        });
    }

    /*
        Find the minimum probability of any of the component influences,
        and use that for the bottom value of the vertical axis
    */
    function findGraphMinimum() {
        var odds;

        minValue = 1;
        $.each(componentInfluences, function (index, influence) {
            odds = deck.drawOdds(minDraws, influence);
            if (odds < minValue) {
                minValue = odds;
            }
        });
    }

    /*
        Draw the horizontal track which follows the mouse cursor,
        and draw labels along the edge of the graph indicating
        the draw count and percentages.
    */
    function drawTrack() {
        var draw, fx, drawX, drawText;

        if (!mousePos) {
            return;
        }

        if (mousePos.x <= graphCoord.left || mousePos.x >= graphCoord.right) {
            return;
        }

        fx = (mousePos.x - graphCoord.left) /
            (graphCoord.right - graphCoord.left);
        draw = Math.floor(minDraws + fx * (maxDraws - minDraws) + 0.5);
        fx = (draw - minDraws) / (maxDraws - minDraws);
        drawX = graphCoord.left + fx * (graphCoord.right - graphCoord.left);

        ctx.save();
        ctx.strokeStyle = "#808060";
        ctx.beginPath();
        ctx.moveTo(drawX, graphCoord.top);
        ctx.lineTo(drawX, graphCoord.bottom);
        ctx.stroke();
        ctx.restore();

        drawText = String(draw) + " draws";
        drawBottomLabel(drawText, drawX);

        $.each(componentInfluences, function (index, influence) {
            var odds, fy, drawY;

            odds = deck.drawOdds(draw, influence);
            fy = (odds - minValue) / (1.0 - minValue);
            drawY = graphCoord.bottom +
                fy * (graphCoord.top - graphCoord.bottom);

            drawText = String(Math.floor(100 * odds)) + "%";
            drawLeftLabel(drawText, drawY);
        });
    }

    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.font = String(fontSize) + "px sans-serif";
    ctx.lineWidth = 2;

    componentInfluences = listComponentInfluences(totalInfluence);
    findGraphMinimum();
    drawOutline();
    drawTrack();
    addGraphLabels();
    drawLabels();

    drawComponents();
}

/*
    Construct an object which can generate HTML tables with odds of
    drawing cards from a deck.

    We need a text list of all possible cards to get started.
*/
function makeEternalPowerCalculator(
    params
) {
    var calculator = {
        tableContainer: params.tableContainer,
        tableDiv: params.tableDiv,
        validationDiv: params.validationDiv,
        graphDiv: params.graphDiv,
        cardlist: params.cardlist,  // all cards available

        minDraws: 7,
        maxDraws: 20,
        cardlibrary: makeEternalCardLibrary(params.cardlist)
    };

    calculator.graphDiv.css("display", "none");

    /*  Hide the power table and replace it with the power graph  */
    function showGraph(
        deck,
        influence
    ) {
        var canvas;

        calculator.graphDiv.empty();

        canvas = $("<canvas>").addClass("power-graph-canvas")
            .appendTo(calculator.graphDiv);
        drawPowerGraph(canvas, undefined, deck, influence);

        calculator.showingGraph = true;
        calculator.graphInfluence = influence;

        calculator.tableContainer.css("display", "none");
        calculator.graphDiv.css("display", "inline");

        canvas.bind("click", function () {
            calculator.showingGraph = false;

            calculator.tableContainer.css("display", "inline");
            calculator.graphDiv.css("display", "none");
        });

        function redrawWithMouse(event) {
            var clientRect, mousePos;

            clientRect = canvas.get(0).getBoundingClientRect();
            mousePos = {
                x: event.clientX - clientRect.left,
                y: event.clientY - clientRect.top
            };
            drawPowerGraph(canvas, mousePos, deck, influence);
        }

        canvas.bind("mouseenter", redrawWithMouse);
        canvas.bind("mousemove", redrawWithMouse);
    }

    /*
        Add event handlers to a table cell to switch to the graph
        when clicked.
    */
    function addGraphHook(
        tableElement,
        deck,
        influence
    ) {
        tableElement.bind("click", function () {
            showGraph(deck, influence);
        });
    }

    /*
        Compute the odds for each draw count in the range, 
        for each influence requirement from the deck, and 
        fill out the table with those values.
    */
    function generateTableRows(
        table,
        deck
    ) {
        var drawCount, row, influenceCards;

        influenceCards = deck.listInfluenceRequirements();

        row = $("<tr>").addClass("power-table-row-head").appendTo(table);
        $("<th>").addClass("power-table-head-draws").
            text("Draws").appendTo(row);

        /*  Add the heading cells  */
        for (drawCount = calculator.minDraws;
                drawCount <= calculator.maxDraws;
                drawCount += 1) {

            $("<th>").addClass("power-table-head-draw-count").
                text(drawCount).appendTo(row);
        }

        /*  Add the body cells  */
        $.each(influenceCards, function (index, influenceCard) {
            var odds, oddsText, influence, cardList, cardPower, th, td;

            influence = influenceCard[0];
            cardList = influenceCard[1];
            cardPower = cardList[0].influenceRequirements[0].power;

            row = $("<tr>").addClass("power-table-row-body").appendTo(table);
            th = $("<th>").addClass("power-table-influence").
                text(influence.toString()).appendTo(row);
            addGraphHook(th, deck, influence);

            for (drawCount = calculator.minDraws;
                    drawCount <= calculator.maxDraws;
                    drawCount += 1) {

                odds = 0;
                odds = deck.drawOdds(drawCount, influence);
                oddsText = Math.floor(odds * 100) + "%";
                td = $("<td>").addClass("power-table-odds").
                    text(oddsText).appendTo(row);
                addGraphHook(td, deck, influence);

                /*
                    Darken the cells where we typically won't have enough
                    draws for the power requirements.
                */
                if (drawCount - calculator.minDraws + 1 < cardPower) {
                    td.addClass("power-table-odds-shaded");
                }
            }
        });
    }

    /*
        Generate the odds table from a new decklist.
        Report the status of the table generation in the
        'validationDiv' region.
    */
    calculator.generateTable = function (
        decklist
    ) {
        var deck, table, validText;

        if (calculator.cardlibrary.makeError) {
            calculator.validationDiv
                .text(calculator.cardlibrary.makeError)
                .attr("class", "validation-error");

            return;
        }

        deck = makeEternalDeck(calculator.cardlibrary, decklist);
        if (deck.makeError) {
            calculator.validationDiv
                .text(deck.makeError)
                .attr("class", "validation-error");

            return;
        }

        table = $("<table>").addClass("power-table");
        generateTableRows(table, deck);

        calculator.tableDiv.empty();
        calculator.tableDiv.append(table);

        validText = deck.cards.length + " cards";
        calculator.validationDiv
            .text(validText)
            .attr("class", "validation-success");

        if (calculator.showingGraph) {
            showGraph(deck, calculator.graphInfluence);
        }
    };

    return calculator;
}

/*  A test of basic functionality provided by this module  */
function testEPC() {
    var cardsstr, deckstr, library, deck, influence, odds, start, stop, i;

    cardsstr = "\
        Set0 #1;;2F\n\
        Set0 #2;1F;\n\
        Set0 #3;1F;\n\
        Set0 #4;1F;\n\
        Set0 #5;1F;\n\
        Set0 #6;1F;\n\
        Set0 #7;1F;\n\
        Set0 #8;1F;\n\
        Set0 #9;1F;\n\
        Set0 #10;1F;\n\
        Set0 #11;1F;\n\
        Set0 #12;1F;\n\
        Set0 #13;1F;\n\
        ";

    /*  Check that we can do simple probabilities correctly  */
    deckstr = "\
        50 Creature (Set0 #1)\n\
        25 Power (Set0 #2)\n\
        ";

    library = makeEternalCardLibrary(cardsstr);
    deck = makeEternalDeck(library, deckstr);

    influence = library.cards["Set0 #1"].influenceRequirements[0];
    console.assert(influence.power === 2);
    console.assert(influence.fire === 1);
    console.assert(influence.shadow === 0);

    odds = deck.drawOdds(7, influence);
    console.assert(odds > 0.749 && odds < 0.750);


    /*  Check that we can handle multiple equivalent influence sources  */
    deckstr = "\
        50 Creature (Set0 #1)\n\
        12 Power (Set0 #2)\n\
        13 Power (Set0 #3)\n\
    ";

    deck = makeEternalDeck(library, deckstr);

    odds = deck.drawOdds(7, influence);
    console.assert(odds > 0.749 && odds < 0.750);


    /*  Check the performance when there are many equivalent sources  */
    deckstr = "\
        50 Creature (Set0 #1)\n\
        2 Power (Set0 #2)\n\
        2 Power (Set0 #3)\n\
        2 Power (Set0 #4)\n\
        2 Power (Set0 #5)\n\
        2 Power (Set0 #6)\n\
        2 Power (Set0 #7)\n\
        2 Power (Set0 #8)\n\
        2 Power (Set0 #9)\n\
        2 Power (Set0 #10)\n\
        2 Power (Set0 #11)\n\
        2 Power (Set0 #12)\n\
        3 Power (Set0 #13)\n\
    ";

    deck = makeEternalDeck(library, deckstr);

    odds = deck.drawOdds(7, influence);
    console.assert(odds > 0.749 && odds < 0.750);

    for (i = 0; i < 5; i += 1) {
        start = window.performance.now();
        odds = deck.drawOdds(20, influence);
        stop = window.performance.now();
        console.log('odds time: ' + (stop - start));
    }


    /*  Test that multiple lines referencing the same card are additive  */
    deckstr = "\
        10 Creature (Set0 #1)\n\
        10 Creature (Set0 #1)\n\
        10 Creature (Set0 #1)\n\
        10 Creature (Set0 #1)\n\
    ";

    deck = makeEternalDeck(library, deckstr);
    console.assert(deck.cards.length === 40);
    console.assert(deck.cardCount["Set0 #1"] === 40);
}
