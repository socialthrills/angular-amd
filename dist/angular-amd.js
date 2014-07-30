/*! angular-amd - v1.6.0 - 2014-03-31
* http://www.ef.com
* Copyright (c) 2014 EF Education First; Licensed ,  */
(function (window, angular) {
    

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

'use strict';

function createNode() {
    var node = window.document.createElement('script');
    node.type = 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    return node;
}

function hasModule(name) {
    var exists;
    try {
        angular.module(name);
        exists = true;
    } catch (err) {
        exists = null;
    }

    return exists;
}

function resolveAlreadyRegistredModule(module) {
    var ng;
    if (hasModule(module.alias) && angular.isFunction(modulesRegistry.get(module.alias).resolve)) {
        ng = angular.module(module.alias);
        modulesRegistry.get(module.alias).resolve(ng);
    }
}

function requestModule(module) {
    var node = createNode();

    node.addEventListener('load', function () {
        resolveAlreadyRegistredModule(module);
    }, false);

    node.addEventListener('error', function (err) {
        throw new Error('Error loading module "' + module.name + '" with src "' + err.srcElement.src + '"');
    }, false);

    node.src = angular.amd.basePath + module.name.replace(/\./g, '/').replace(/\.js$/, '') + '.js';
    window.document.body.appendChild(node);
}

function importDependencies(moduleName, dependencies) {
    // @todo: review this check
    var exists;

    dependencyMap[moduleName] = dependencies;
    dependencies.forEach(function (dependency) {
        exists = !! modulesRegistry.get(dependency.module.alias);
        modulesRegistry.add(dependency.module.alias);

        if (!hasModule(dependency.module.alias) && !exists) {
            requestModule(dependency.module);
        }

        resolveAlreadyRegistredModule(dependency.module);
    });
}

function modulesNamesForDependencies(dependencies) {
    var names = [];
    dependencies.forEach(function (dependency) {
        names.push(dependency.module.alias);
    });

    return names;
}

function deferredModule() {
    function invokeLater(provider, name, args) {
        defer.promise.then(function (module) {
            module[provider](name, args);
        });

        return defer.promise;
    }

    var deferredMethods = ['provider', 'controller', 'directive', 'service', 'factory', 'value', 'constant', 'config', 'run', 'animation', 'filter'],
        defer = $q.defer();

    deferredMethods.forEach(function (element) {
        defer.promise[element] = function (name, args) {
            return invokeLater(element, name, args);
        };
    });

    return defer;
}

function module(name, importStatements) {
    function doesSymbolExist(element) {
        if (importNames.indexOf(element.alias) !== -1) {
            throw new Error('Duplicate symbol alias: "' + element.alias + '"');
        }

        importNames.push(element.alias);
    }

    function injectDependencies(ngModule) {
        var imports = {},
            injector;

        dependencyMap[ngModule.name].forEach(function (module) {
            if (module.symbols.length) {
                injector = angular.injector([module.module.name]);
                module.symbols.forEach(function (symbol) {
                    imports[symbol.alias] = injector.get(symbol.name);
                    ngModule.constant(symbol.alias, injector.get(symbol.name));
                });
            } else {
                imports[module.module.alias] = modulesRegistry.get(module.module.alias);
                ngModule.constant(module.module.alias, imports[module.module.alias]);
            }
        });

        return imports;
    }

    function resolveModule(name, dependencies) {
        var ng = angular.module(name, modulesNamesForDependencies(dependencies)),
            module = modulesRegistry.get(name);

        ng._imports = injectDependencies(ng);
        if (module && !angular.isFunction(module.resolve)) {
            throw new Error('Module "' + name + '" is already resolved.');
        }

        module.resolve(ng);
    }

    var importNames = [],
        dependencies = [],
        registryEntry;

    if (importStatements === undefined) {
        return modulesRegistry.get(name);
    }

    registryEntry = modulesRegistry.get(name);
    if (registryEntry && !angular.isFunction(registryEntry.resolve)) {
        throw new Error('Duplicate module declaration: "' + name + '"');
    }

    importStatements.forEach(function (statement) {
        statement = parse.statement(statement);

        if (importNames.indexOf(statement.module.alias) !== -1) {
            throw new Error('Duplicate module alias: "' + statement.module.alias + '"');
        }

        importNames.push(statement.module.alias);

        if (statement.symbols.length) {
            statement.symbols.forEach(doesSymbolExist);
        }

        dependencies.push(statement);
    });

    modulesRegistry.add(name);
    importDependencies(name, dependencies);

    if (dependencies.length) {
        //console.log('moduleName', name, 'dependencies', modulesRegistry.getAllPromisesByNames(dependencies));
        $q.all(modulesRegistry.getAllPromisesByNames(dependencies)).then((function (name, dependencies) {
            return function () {
                resolveModule(name, dependencies);
            };
        }(name, dependencies)));
    } else {
        resolveModule(name, []);
    }

    return modulesRegistry.get(name).promise;
}

var $injector = angular.injector(['ng']),
    $q = $injector.get('$q'),
    $scope = $injector.get('$rootScope'),
    modulesRegistry = {},
    dependencyMap = {};

modulesRegistry = {
    registry: {},
    get: function (name) {
        return this.registry[name];
    },

    getAllPromisesByNames: function (modules) {
        var deffers = [];

        modules.forEach(angular.bind(this, function (module) {
            deffers.push(this.get(module.module.alias).promise);
        }));

        return deffers;
    },

    add: function (name) {
        if (this.registry.hasOwnProperty(name)) {
            return;
        }

        this.registry[name] = deferredModule();
        this.registry[name].promise.
        finally(angular.bind(this, function () {
            this.registry[name] = angular.module(name);
        }));
    },

    reset: function () {
        this.registry = {};
    }
};

window.name = 'NG_DEFER_BOOTSTRAP!';
angular.amd = {
    basePath: '/',
    module: module,
    // TODO: Remove, only here for tests
    $scope: $scope,
    registry: modulesRegistry
};


}(window, angular));
