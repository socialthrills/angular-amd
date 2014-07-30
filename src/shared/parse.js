var parse = (function () {
    'use strict';

    /**
     * Parse imports from an import statement
     * Does not support aliasing
     *
     * @param  {string} str the statement to parse
     * @return {object}     an array with imported sub-module names if any were found, undefined otherwise
     */
    function importsStr(str) {
        var execResult,
            importsMatch,
            imports = [],
            importsRegexp = new RegExp(/^\s*import\s+(\{[^\}]+\}|[^\s]+)\s+from.*$/),
            individualModuleRegexp = new RegExp(/[^\s,\{\}]+/g);

        if (importsRegexp.test(str)) {

            importsMatch = str.match(importsRegexp)[1];

            while ((execResult = individualModuleRegexp.exec(importsMatch)) !== null) {
                imports.push(execResult[0]);
            }
        }

        return imports;
    }

    /**
     * Parse a module from a 'module x from y' statement
     * Does not support aliasing
     *
     * @param  {string} str the statement to parse
     * @return {object}     the module name if found, undefined otherwise
     */
    function moduleStr(str) {
        var matches,
            moduleRegex = new RegExp(/(?:module\s+(\w+(?:[\.\-\_]\w+)*))?\s+from\s+["'](\w+(?:[\.\-\_]\w+)*)["'];?\s*$/);

        if (moduleRegex.test(str)) {
            matches = str.match(moduleRegex);

            return {
                name: matches[2],
                alias: matches[1] || matches[2]
            };
        }

        return {
            name: str,
            alias: str
        };
    }

    function statement(impStr) {
        var imports = null,
            importStatement = impStr.trim(),
            statement = {
                symbols: []
            },
            symbolName,
            symbolAlias;

        statement.module = moduleStr(importStatement);
        imports = importsStr(importStatement);

        while (imports.length) {
            symbolAlias = symbolName = imports.shift();

            if (imports.length >= 2 && imports[0] === 'as') {
                imports.shift();
                symbolAlias = imports.shift();
            }

            statement.symbols.push({
                name: symbolName,
                alias: symbolAlias
            });
        }

        return statement;
    }

    return {
        importsStr: importsStr,
        moduleStr: moduleStr,
        statement: statement
    };

}());

/**
* @TODO: Used both in node and browser. Is there a cleaner way to do this?
*/
if (typeof exports !== 'undefined') {
    var prop;
    for (prop in parse) {
        if (parse.hasOwnProperty(prop)) {
            exports[prop] = parse[prop];
        }
    }
}
