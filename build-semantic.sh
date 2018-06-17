#!/bin/sh

npm install semantic-ui --save
cp semantic-site.variables semantic/src/site/globals/site.variables
(cd semantic; gulp build)
cp semantic/semantic.min.css semantic/semantic.min.js .
