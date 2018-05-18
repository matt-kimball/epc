# Overview

Eternal Power Calculator is a tool to assist the deckbuilding process
for Dire Wolf Digital's Eternal CCG.

See https://www.direwolfdigital.com/eternal/ for more about Eternal.

Given a decklist, the power calculator will compute the probability of
drawing the power and influence necessary to play cards from the deck
in a particular number of cards drawn.  It will generate an HTML table
of the odds of drawing those cards for each of set of influence
required by cards in the deck.

# Contents

Eternal Power Calculator has the following components:

* `index.html` - HTML shell for the power calculator
* `epc.js` - Javascript for odds calculation and table generation
* `epc-polyfill.js` - Polyfill from external sources, for older web browsers
* `epc.css` - CSS style sheet for `index.html`
* `jquery-1.12.4.min.js` - Standard jQuery  --  http://jquery.com/
* `lint.sh` - Shell script for linting Javascript source

# Usage

To use Eternal Power Calculator, see http://matt-kimball.github.io/epc/

# License

Eternal Power Calculator is licensed under the GNU General Public License 2.0.
