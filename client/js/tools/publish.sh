#!/bin/sh

# Check that code compiles https://developers.google.com/closure/compiler/
# Enable later: --compilation_level ADVANCED_OPTIMIZATIONS
echo ...Compiling using compiler.java
java -jar compiler.jar --js ../client.js --js_output_file client.js


#run jshint http://jshint.com/docs/
echo ...Running jshint
node_modules/jshint/bin/jshint ../client.js

#run diff checks
echo ...Running git diff --check
git diff --check

# Run unit tests using QUnit
echo
echo Do remember to check test/tests.html


