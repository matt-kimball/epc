# Overview

Eternal Power Calculator is a tool to assist the deckbuilding process
for Dire Wolf Digital's Eternal CCG.

See https://www.direwolfdigital.com/eternal/ for more about Eternal.

Given a decklist, the power calculator will compute the probability of
drawing the power and influence necessary to play cards from the deck
in a particular number of cards drawn.  It will generate an HTML table
of the odds of drawing those cards for each of set of influence
required by cards in the deck.

Eternal Power Calculator uses jQuery and Semantic-UI as a foundation.
See the following for more information:

* jQuery -- https://jquery.com/
* Semantic-UI -- https://semantic-ui.com/

# Usage

To use Eternal Power Calculator, see https://www.shiftstoned.com/epc/

# Development

Eternal Power Calculator contains the following Javascript code:

* `epc-deck.js` - Data structures relating to eternal cards and decks
* `epc-graph.js` - Graph drawing routines
* `epc-polyfill.js` - Polyfill from external sources, for older web browsers
* `epc-table.js` - Table generation routines
* `epc-test.js` - Tests for odds calculation
* `epc-ui.js` - Top level user interface logic

Additional content:

* `index.html` - HTML shell for the power calculator
* `epc.css` - CSS style sheet for `index.html`
* `jquery-1.12.4.min.js` - Standard jQuery
* `semantic.min.css` - Generated Semantic-UI CSS
* `semantic.min.js` - Generated Semantic-UI Javascript

## Building for production

To build epc for production, run `dist.sh`. This script will minify the scripts and bundle everything needed for shipment into the /dist folder. To deploy to shiftstoned.com, see the instructions on the [shiftstoned github page](https://github.com/shiftstoned/shiftstoned.github.io).

The build requires a few tools:

* perl
* bash
* uglify-js (if using npm, `npm install -g uglify-js@3.4`)


## Lint

To find style mistakes and inconsistencies, we use eslint. For convenience, you can use `lint.sh` to lint all files automatically. You will need `eslint-plugin-jest` to lint the tests. Run `lint.sh fix` to have eslint fix anything that is autofixable.

```
npm install -g eslint eslint-plugin-jest
./lint.sh
```

## Testing

Tests use jest and puppeteer as well as jquery. Tests are not required for pull requests, but if you feel comfortable writing them, we appreciate it. To run the tests, you will need a basic http server to serve the static files (I use [this one](https://www.npmjs.com/package/http-server)). Puppeteer will expect to find the site at http://localhost:8081. You will also need npm to install the other dependencies. Tests can take a while to run, around 30 seconds on this developer's machine.

Steps install http-server, jest, and puppeteer with npm:
```
npm install -g http-server
npm install
```

To start the http-server (in the epc directory). Test by opening localhost:8081 in your browser.
```
http-server -p 8081
```

To run the tests once:
```
npm test
```

To start a test server which automatically re-runs the tests when it detects changes:
```
npm run test:watch
```

## Misc

* `build-semantic.sh` - You will problably not need to run this ever. It generates semantic.min.css and semantic.min.js.
* `generate.sh` builds epc.min.js. Is used by dist.sh automatically.
* `semantic.json` - Configuration for Semantic-UI
* `semantic-site.variables` - Build variables for Semantic-UI

# License

Eternal Power Calculator is licensed under the GNU General Public License 2.0.
