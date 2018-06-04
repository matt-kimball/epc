/*global $, makeInfluence*/
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


/*  Draw a graph of influence component odds on a canvas element  */
function drawPowerGraph(
    canvas,
    deck
) {
    var ctx,
        canvasWidth,
        canvasHeight,
        margin,
        graphCoord,
        fontSize,
        imgSize,
        influenceTurns,
        minValue,
        minDraws,
        maxDraws,
        horizontalMidlineStep,
        verticalMidlineStep,
        labels;

    margin = 96;
    fontSize = 20;
    imgSize = 30;
    labels = [];

    /*  Set the back buffer size to be the same as the CSS size  */
    canvasWidth = canvas.width();
    canvasHeight = canvas.height();
    canvas.attr("width", canvasWidth);
    canvas.attr("height", canvasHeight);

    ctx = canvas.get(0).getContext("2d");
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    /*
        We'll need space around the edge for label text, so
        the actual graph will be drawn within these coordinates.
    */
    graphCoord = {
        left: margin,
        top: fontSize / 2,
        right: canvasWidth - margin,
        bottom: canvasHeight - margin
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

    /*
        Examine all cards in the decklist and list all unique influence
        amounts paired with the turns corresponding to the power value
        of their cards
    */
    function listAllInfluenceTurns() {
        var componentPairs, ret;

        componentPairs = {};
        ret = [];

        $.each(deck.cards, function (index, card) {
            var components, turn;

            if (card.influenceRequirements.length < 1) {
                return;
            }

            turn = card.influenceRequirements[0].power;
            if (turn < 1) {
                turn = 1;
            }

            components = listComponentInfluences(
                card.influenceRequirements[0]
            );

            $.each(components, function (index, component) {
                var componentStr, componentPair, influenceTurn;

                componentStr = component.toString();
                componentPair = componentStr + "," + String(turn);
                if (!componentPairs.hasOwnProperty(componentPair)) {
                    influenceTurn = {
                        influence: component,
                        turn: turn
                    };

                    componentPairs[componentPair] = influenceTurn;
                    ret.push(influenceTurn);
                }
            });
        });

        return ret;
    }

    /*
        Filter the list of influence-turns such that only the lowest
        turn for each influence is returned
    */
    function listInfluenceTurns() {
        var componentTurns, ret;

        componentTurns = {};

        $.each(listAllInfluenceTurns(), function (index, influenceTurn) {
            var influenceStr, turn;

            influenceStr = influenceTurn.influence.toString();
            turn = influenceTurn.turn;

            /*
                If the influence has already been encountered, only
                update the turn value if it is earlier.
            */
            if (componentTurns.hasOwnProperty(influenceStr)) {
                if (turn < componentTurns[influenceStr]) {
                    componentTurns[influenceStr] = turn;
                }
            } else {
                componentTurns[influenceStr] = turn;
            }
        });

        ret = [];
        $.each(Object.keys(componentTurns), function (index, componentStr) {
            var influenceTurn = {
                influence: makeInfluence(componentStr),
                turn: componentTurns[componentStr]
            };

            ret.push(influenceTurn);
        });

        return ret;
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
        ctx.fillText(label, drawX, drawY);
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
        ctx.fillText(label, drawX, drawY);
    }

    /*  Draw the graph outline  */
    function drawOutline() {
        var midline, frac, midpos;

        ctx.save();
        ctx.fillStyle = "#f0f0e0";
        ctx.beginPath();
        ctx.moveTo(graphCoord.left, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.top);
        ctx.fill();

        ctx.strokeStyle = "#b0b0a0";

        /*  Draw the horizontal intermediate lines  */
        midline = 1.0 - horizontalMidlineStep;
        while (midline > minValue) {
            frac = (midline - minValue) / (1.0 - minValue);
            midpos = graphCoord.bottom +
                frac * (graphCoord.top - graphCoord.bottom);

            ctx.beginPath();
            ctx.moveTo(graphCoord.left, midpos);
            ctx.lineTo(graphCoord.right, midpos);
            ctx.stroke();

            midline = midline - horizontalMidlineStep;
        }

        /*  Draw the vertical intermediate lines  */
        midline = minDraws + verticalMidlineStep;
        while (midline < maxDraws) {
            frac = (midline - minDraws) / (maxDraws - minDraws);
            midpos = graphCoord.left +
                frac * (graphCoord.right - graphCoord.left);

            ctx.beginPath();
            ctx.moveTo(midpos, graphCoord.top);
            ctx.lineTo(midpos, graphCoord.bottom);
            ctx.stroke();

            midline += verticalMidlineStep;
        }

        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(graphCoord.left, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.bottom);
        ctx.lineTo(graphCoord.right, graphCoord.top);
        ctx.lineTo(graphCoord.left, graphCoord.top);
        ctx.stroke();
    }

    /*  Add the labels for the extents of the graph  */
    function addGraphLabels() {
        var midline, percent, x, y;

        midline = 1.0;
        while (midline > minValue) {
            y = graphCoord.bottom +
                (midline - minValue) / (1.0 - minValue) *
                (graphCoord.top - graphCoord.bottom);
            percent = Math.round(100 * midline);
            drawLeftLabel(String(percent) + "%", y);

            midline = midline - horizontalMidlineStep;
        }

        midline = minDraws;
        while (midline <= maxDraws) {
            x = graphCoord.left +
                (midline - minDraws) / (maxDraws - minDraws) *
                (graphCoord.right - graphCoord.left);
            drawBottomLabel("Turn " + String(midline - 6), x);

            midline += verticalMidlineStep;
        }
    }

    /*  Draw the icons representing the influence requirements  */
    function drawInfluenceIcons(
        influence,
        x,
        y
    ) {
        var text, i, img;

        if (influence.power > 0) {
            text = String(influence.power);
            ctx.fillText(text, x, y);
            x += ctx.measureText(text).width;
        }

        img = $("#icon-fire").get(0);
        for (i = 0; i < influence.fire; i += 1) {
            ctx.drawImage(img, x, y - imgSize, imgSize, imgSize);
            x += imgSize;
        }

        img = $("#icon-time").get(0);
        for (i = 0; i < influence.time; i += 1) {
            ctx.drawImage(img, x, y - imgSize, imgSize, imgSize);
            x += imgSize;
        }

        img = $("#icon-justice").get(0);
        for (i = 0; i < influence.justice; i += 1) {
            ctx.drawImage(img, x, y - imgSize, imgSize, imgSize);
            x += imgSize;
        }

        img = $("#icon-primal").get(0);
        for (i = 0; i < influence.primal; i += 1) {
            ctx.drawImage(img, x, y - imgSize, imgSize, imgSize);
            x += imgSize;
        }

        img = $("#icon-shadow").get(0);
        for (i = 0; i < influence.shadow; i += 1) {
            ctx.drawImage(img, x, y - imgSize, imgSize, imgSize);
            x += imgSize;
        }
    }

    /*  Graph the graph curve for the odds of one influence component  */
    function drawInfluenceCurve(
        influence,
        startDraw
    ) {
        var odds,
            oddsY,
            draws,
            x,
            y,
            fx,
            solidColor,
            transparentColor,
            gradient;

        ctx.save();
        /*  Color the curve according to influence type  */
        if (influence.fire > 0) {
            solidColor = "rgb(140, 23, 33)";
            transparentColor = "rgba(140, 23, 33, 0)";
        } else if (influence.time > 0) {
            solidColor = "rgb(181, 110, 7)";
            transparentColor = "rgba(181, 110, 7, 0)";
        } else if (influence.justice > 0) {
            solidColor = "rgb(33, 132, 33)";
            transparentColor = "rgba(33, 132, 33, 0)";
        } else if (influence.primal > 0) {
            solidColor = "rgb(15, 54, 118)";
            transparentColor = "rgba(15, 54, 118, 0)";
        } else if (influence.shadow > 0) {
            solidColor = "rgb(93, 28, 154)";
            transparentColor = "rgba(93, 28, 154, 0)";
        }

        fx = (startDraw - minDraws) / (maxDraws - minDraws);
        x = graphCoord.left +
            fx * (graphCoord.right - graphCoord.left);
        gradient = ctx.createLinearGradient(x, 0, x + canvasWidth, 0);
        gradient.addColorStop(0, solidColor);
        gradient.addColorStop(1, transparentColor);
        ctx.strokeStyle = gradient;

        /*  Draw the curve  */
        ctx.beginPath();
        ctx.lineWidth = 5;
        for (draws = startDraw; draws <= maxDraws; draws += 1) {
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
        ctx.restore();
    }

    /*  Draw the icons or text next to the influence curve it represents  */
    function drawInfluenceLabel(
        influence,
        pos
    ) {
        var x, y, iconSize;

        /*  Adjust for the text size  */
        iconSize = imgSize * influence.toString().length;
        x = pos.x - iconSize / 2;
        y = pos.y + imgSize / 2;
        drawInfluenceIcons(influence, x, y);
    }

    /*  Draw all previously collected influence label icons  */
    function drawInfluenceLabels() {
        var prevX, prevY, minDist;

        minDist = 12;

        /*
            Sort the labels by screen position to provide a consistent
            appearance to overlapping labels.
        */
        labels.sort(function (a, b) {
            var aPos, bPos, dx, dy;

            aPos = a.pos;
            bPos = b.pos;

            dx = aPos.x - bPos.x;
            dy = aPos.y - bPos.y;

            if (dx) {
                return dx;
            }

            if (dy) {
                return dy;
            }
        });

        prevX = 0;
        prevY = 0;

        $.each(labels, function (index, label) {
            var x, y;

            x = label.pos.x;
            y = label.pos.y;

            /*
                If a label is very close to the previously drawn label,
                adjust its position to be a minimum distance away.
            */
            if (x === prevX && y - prevY < minDist) {
                y = prevY + minDist;
            }

            drawInfluenceLabel(label.influence, {
                x: x,
                y: y
            });

            prevX = x;
            prevY = y;
        });
    }

    /*  Queue an influence label to be drawn later  */
    function addInfluenceLabel(
        influence,
        pos
    ) {
        var mid, odds, oddsY, fx, x, y;

        /*  Compute the coordinates for the label  */
        mid = Math.floor(minDraws + pos * (maxDraws - minDraws));
        odds = deck.drawOdds(mid, influence);
        oddsY = (odds - minValue) / (1.0 - minValue);
        fx = (mid - minDraws) / (maxDraws - minDraws);
        x = graphCoord.left + fx * (graphCoord.right - graphCoord.left);
        y = graphCoord.bottom + oddsY * (graphCoord.top - graphCoord.bottom);

        labels.push({
            influence: influence,
            pos: {
                x: x,
                y: y
            }
        });
    }

    /*  Draw all of the influence component curves  */
    function drawComponentCurves() {
        var allInfluenceTurns;

        $.each(influenceTurns, function (index, influenceTurn) {
            drawInfluenceCurve(
                influenceTurn.influence,
                minDraws + influenceTurn.turn - 1
            );
        });

        allInfluenceTurns = listAllInfluenceTurns();
        $.each(allInfluenceTurns, function (index, influenceTurn) {
            var pos;

            pos = (influenceTurn.turn - 1) / (maxDraws - minDraws);

            addInfluenceLabel(influenceTurn.influence, pos);
        });
    }

    /*
        Find the minimum probability of any of the component influences,
        and use that for the bottom value of the vertical axis
    */
    function findGraphExtents() {
        var odds, maxMidLines;

        minValue = 0.75;
        minDraws = 7;
        maxDraws = 15;
        maxMidLines = 6;

        $.each(influenceTurns, function (index, influenceTurn) {
            var draws = influenceTurn.turn + minDraws - 1;

            odds = deck.drawOdds(draws, influenceTurn.influence);

            if (odds < minValue) {
                minValue = odds;
            }

            if (draws + 4 > maxDraws) {
                maxDraws = draws + 4;
            }
        });

        minValue = (Math.floor(minValue * 10) - 1) / 10;
        if (minValue < 0) {
            minValue = 0;
        }

        verticalMidlineStep = Math.ceil(
            (maxDraws - minDraws) / maxMidLines
        );
        horizontalMidlineStep = 0.1 * Math.ceil(
            (1.0 - minValue) * 10 / maxMidLines
        );
    }

    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#000000";
    ctx.font = String(fontSize) + "px sans-serif";
    ctx.lineWidth = 2;

    influenceTurns = listInfluenceTurns();
    findGraphExtents();
    drawOutline();
    addGraphLabels();

    drawComponentCurves();
    drawInfluenceLabels();
}

