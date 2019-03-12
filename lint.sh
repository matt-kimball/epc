#!/bin/sh
# If you pass arguments, this command will try to fix the lint
files="epc-deck.js epc-graph.js epc-table.js epc-test.js epc-ui.js epc-code.js epc-polyfill.js"
if [ $# -eq 0 ]
then
  eslint $files
else
  eslint --fix $files
fi