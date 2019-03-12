#!/bin/sh
# If you pass arguments, this command will try to fix the lint
if [ $# -eq 0 ]
then
eslint epc-deck.js epc-graph.js epc-table.js epc-test.js epc-ui.js epc-code.js
else
eslint --fix epc-deck.js epc-graph.js epc-table.js epc-test.js epc-ui.js epc-code.js
fi
