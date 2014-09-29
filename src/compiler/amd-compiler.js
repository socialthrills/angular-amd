/* jshint loopfunc:true */
/* global exports: true */
'use strict';
var path = require('path'),
    argv = require('minimist'),
    process = require('process'),
    _ = require('lodash'),
    log = require('winston'),
    parse = require('../shared/parse'),
    moduleMatcher = /angular\.(amd\.)?module\(['"]([\w\-_\.]+)['"](,\s)?(\[([\s\S]*?)\])?\)/;


/**
 * scan for files in directory, recursively, applying the provided filter
 *
 * @param  {object}         fs      Node.fs module or mock.
 * @param  {string}         dir     Directory to look for files in.
 * @param  {array.<string>} jsFiles Collected files.
 * @param  {function}       matcher Filter function.
 *
 * @return {array.<string>} Files found.
 */
function scanDir(fs, dir, jsFiles, matcher) {
    var files = fs.readdirSync(dir),
        stat;

    files.forEach(function (file, index) {
        if (matcher(file)) {
            jsFiles.push(path.join(dir, file));
        } else {
            stat = fs.statSync(path.join(dir, file));
            if (stat.isDirectory()) {
                scanDir(fs, path.join(dir, file), jsFiles, matcher);
            }
        }
    });
}

/**
 * collect potential files form directory, applying the provided filter
 *
 * @param  {object}         fs      Node.fs module or mock.
 * @param  {string}         baseDir Directory to look for files in.
 * @param  {=function}      matcher Optional filter function, defaults to matching all '.js' files, excluding all '.spec.js'
 *
 * @return {array.<string>} Files found.
 */
function collectFiles(fs, baseDir, filter) {
    var jsFiles = [];

    if ('function' !== typeof filter) {
        filter = function (file) {
            return !/spec\.js$/.test(file) && /\.js$/.test(file);
        }
    }

    scanDir(fs, baseDir, jsFiles, filter);

    return jsFiles;
}

/**
 * parse dependencies of a module.
 *
 * @param  {string} dir       Base director, used to compose filename
 * @param  {string} depString Dependency string extracted from source code. Ex:
 *
 *     'ngCookies',
 *     'module foobar from "baz.foobar";'
 *
 * @return {Array.<object>}  Parsed dependencies. Ex:
 *
 *    [{
 *        name:  "ngCookies",
 *        file:  "",
 *        isAmd: false
 *    }{
 *        name:  "foobar",
 *        file:  "src/baz/foobar.js",
 *        isAmd: true
 *    }]
 *
 */
function parseDependencies(dir, dependencies) {
    var ary = [],
        dependencies,
        depString,
        dependency,
        isAmd;

    dependencies.split(',').forEach(function (depString) {
        if (depString) {
            dependency = parse.statement(depString.trim().replace(/^['"]/, '').replace(/['"]$/, ''));
            isAmd = (dependency.module.name !== dependency.module.alias);
            ary.push({
                expression: depString.replace(/^\s+/g, '').replace(/\s+$/g, ''),
                // identifiying dependency by the angular module name ("foobar" instead of "baz.foobar")
                name: dependency.module.alias,
                // tracks dependency file name
                file: isAmd ? dir + dependency.module.name.replace(/\./g, '/') + '.js' : '',
                // is dependency in ES6 format
                isAmd: isAmd
            });
        }
    });
    return ary;
}

/**
 * Compile order of given files
 *
 * @param  {object} fs      Node.fs module or mock.
 * @param  {string} baseDir Base directory.
 * @param  {array}  jsFiles List of potential files. Only the ones containgin module declarations will be used.
 * @return {array}          Ordered list of files.
 */
function compileLoadOrder(fs, baseDir, jsFiles) {
    var loadOrder = [], // result of this function
        modules = [], // tracks existing module names
        moduleMap = {}, // indexed module properties
        modulesLoaded = [], // tracks module names already loaded
        moduleName,
        someDependencyLoaded,
        moduleLoadable,
        error;

    // filters files, collect modules and indexes module properties (isAmd, parsed dependencies, file name)
    jsFiles.forEach(function (file) {
        console.log(file);
                    
        var data = fs.readFileSync(file, 'utf8'),
            module = data.toString().replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '$1').match(moduleMatcher),
            name;

        if (module && module.length > 1) {

            name = module[2];
            moduleMap[name] = {
                isAmd: !! module[1],
                dependencies: module[4] === '[]' || !module[5] ? [] : parseDependencies(baseDir, module[5]),
                file: file
            };

            modules.push(name);
            moduleMap[name].priority = !moduleMap[name].isAmd || !moduleMap[name].dependencies.length ? 1 : null;
        }
    });

    try {
        // until module map is empty (throws exception if stalled)
        do {
            someDependencyLoaded = false;

            // look at each remaining module and check if it can be loaded
            for (moduleName in moduleMap) {
                // module is not AMD (not declared as angular.amd.module)
                // it is loadable, let's have it at the head of the load order
                if (moduleMap[moduleName].priority === 1) {
                    loadOrder.unshift(moduleMap[moduleName].file);
                    someDependencyLoaded = true;
                    modulesLoaded.push(moduleName);
                    delete moduleMap[moduleName];
                    break;
                }

                // assume module is loadable
                moduleLoadable = true;

                // validates module and checks if all the dependencies are loaded
                moduleMap[moduleName].dependencies.forEach(function (dependency) {
                    // dependency is amd and module does not exist
                    if (dependency.isAmd && modules.indexOf(dependency.name) === -1) {
                        error = 'Dependency "' + dependency.name + '" of module "' + moduleName + '" is amd, but that module does not exist.';
                        throw new Error(error);
                    }

                    if(/\\/.test(process.cwd())) {
                        dependency.file = dependency.file.replace(/\//g, '\\');
                    }

                    // dependency is amd and file does not exist
                    if (dependency.isAmd && jsFiles.indexOf(dependency.file) === -1) {
                        error = 'Dependency "' + dependency.name + '" of module "' + moduleName + '" is amd, but file "' + dependency.file + '" does not exist.';
                        throw new Error(error);
                    }
                    // dependency is one of our modules and is not loaded yet
                    if (modules.indexOf(dependency.name) !== -1 && modulesLoaded.indexOf(dependency.name) === -1) {
                        moduleLoadable = false;
                    }
                });

                if (moduleLoadable) {
                    loadOrder.push(moduleMap[moduleName].file);
                    someDependencyLoaded = true;
                    modulesLoaded.push(moduleName);
                    delete moduleMap[moduleName];
                }
            };

            if (!someDependencyLoaded) {
                error = 'Some (' + (jsFiles.length - loadOrder.length) + ') files failed to find their place:' + "\n";
                for (moduleName in moduleMap) {
                    error += 'Module "' + moduleName + '" in file "' + moduleMap[moduleName].file + '"' + "\n";
                    moduleMap[moduleName].dependencies.forEach(function (dependency) {
                        if (modulesLoaded.indexOf(moduleName) === -1) {
                            error += ' + Missing ' + dependency.expression + "\n";
                        }
                    });
                };
                throw new Error(error);
            }
        }
        while (_.keys(moduleMap).length);
    }
    catch (error) {
        //log.info('Files found:', jsFiles);
        //log.info('Files loaded:', loadOrder);
        throw error;
    }

    return loadOrder;
}

/**
 * Resolve load order of module files and return concatenated, optionally uglified, source.
 *
 * @param  {object} options The following options:
 *
 *     sourceFolder [string]    Where to look for files and where to look for dependencies
 *     filter       [function]  Optional file filtering function. Defaults to: `function (file) { return !/spec\.js$/.test(file) && /\.js$/.test(file); }`
 *     sourceFiles  [array]     Use this list of files instead of scraping for files inside the sourceFolder
 *     uglify       [object]    UglifyJS options, if provided it will invoke uglifyJS, if not, files will be
 *
 * @return {array.<string>} Ordered list of module files.
 *
 * @todo add grunt task that wraps this script
 */
function start(options) {
    var fs = require('fs'),
        uglifyJS = require("uglify-js"),
        sourceFiles,
        loadOrder,
        res = '';

    if (!options.sourceFolder) {
        throw new Error('Option "sourceFolder" must be provided.');
    }

    // or use the provided list of files
    if ('array' === typeof options.sourceFiles) {
        sourceFiles = options.sourceFiles;
    }
    // or collect files from the source folder, using the optional filter function
    else {
        var cwd = process.cwd();
        options.sourceFolder = cwd + '/' + options.sourceFolder;

        // detect windows path and escape accordingly
        if(/\\/.test(cwd)) {
            options.sourceFolder = options.sourceFolder.replace(/\//g, '\\');
        }

        console.log('Loading files from sourceFolder: %s', options.sourceFolder)
        sourceFiles = collectFiles(fs, options.sourceFolder, options.filter);
    }

    // compile load order
    loadOrder = compileLoadOrder(fs, options.sourceFolder, sourceFiles);

    // minify with provided options
    if (options.uglify) {
        res = uglifyJS.minify(loadOrder, options.uglify).code;
    }
    // or just concatenate
    else {
        loadOrder.forEach(function(filePath) {
            res += fs.readFileSync(filePath);
        });
    }
    return res;
}

exports.parseDependencies = parseDependencies;
exports.compileLoadOrder = compileLoadOrder;
exports.start = start;

exports.run = function () {
    var args = argv(process.argv.slice(2)),
        sourceFolder = args._.shift();

    return start({
        sourceFolder: sourceFolder
    });
}
