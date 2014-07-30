### Angular asynchronous module definition [![Build Status](https://travis-ci.org/EFEdcuationFirstMobile/angular-amd.png?branch=master)](https://travis-ci.org/EFEdcuationFirstMobile/angular-amd)

This repository provides:
- Bower package, adds amd support to your angular project.
- Npm module, adds a compiler to generate concat/min files of your project.

## AMD Support

### TL;DR

The base principal is, one module === one file.

```javascript

// /feature/loader.js
angular.amd.module('feature.loader', [])
.service('Loader', function () {

});

// main app file (app.js)
angular.amd.module('myApp', [
    'feature.loader'
]).controller('MainCtrl', function () {
    angular.resumeBootstrap();
});
```

### Installation

If you are using [Bower](http://bower.io/) (you should) then all you need to do is:

- Add `"ng-amd": "latest"` to your project `bower.json`.
- run `bower install`.

#### Angular bootstrap process

By including angular-amd(.min?).js the bootstrap process will automatically halted (And your app will not start!) and needs to be resumed manually with ```angular.resumeBootstrap();```. This is due to we need to wait for all modules to load async, then start the application.


#### Module name patterns

A module name will translate in to a file path:

```javascript
'feature.loader' => /feature/loader.js
```

#### angular.amd.module

When you declare a module ```angular.amd.module``` it will return a ```$q.defer().promise``` that is extended with all methods the regular ```angular.module``` api. Hence you can go:

```javascript
angular.amd.module('myApp', [
    'feature.loader'
]).controller('MainCtrl', function () {
    // Ctrl stuff
}).then(function (module) {
    angular.resumeBootstrap();
});
```

#### ES6 module syntax

All import statements can also be written in ES6 syntax:

```javascript
'import Loader from "feature.loader"';          // import Loader from module "feature.loader" via $injector.get
'module fl from "feature.loader"';              // binding an external module to a variable
'import { encrypt, decrypt } from "crypto"';    // import encrypt, decryp from module "crypto" via $injector.get
'import { encrypt as enc } from "crypto"';      // binding and renaming encrypt to enc
```

Currently all modules will be passed as dependencies to ```angular.module``` and therefore is accessibly anyway. When using the ES6 syntax all symbols and aliases are set to the new module using ```angular.module().constant```. But it's fun to use ES6.


## Compiler

### TL;DR

Get the minified/uglified source in the *right order* for amd loading.

```javascript
    var amd = require('angular-amd');
    var options = {
        sourceFolder: '/src',
    };
    var concatenated = amd.start(options);
```

### How it works:

The compiler resolves the dependecies between all the modules collected from a single folder, returning the concatenated code, which you can further process or write to a file.

The critical role of the compiler is to guarantee that the *order of the source code* in the compiled output *satisties the dependency chain* load order.

It takes a `sourceFolder`, colects all the files, builds an ordered list of files and, optionally, relays that list to [uglifyJS](https://github.com/mishoo/UglifyJS2) in order to minify/uglify the code, or simply returns the concatenated source.


### Options

Mandatory:

- **sourceFolder** [string] - where to look for module files and dependencies.

Optional:

- **filter** [function] - File filtering function. Defaults to matching all `.js` files, excluding all `.spec.js`. Default implementation: `function (file) { return !/spec\.js$/.test(file) && /\.js$/.test(file); }`.
- **sourceFiles** [string] - Use this list of files instead of the files found in the `sourceFolder`.
- **uglify** [obbject] - If provided, triggers minification via uglifyJS with these options. See [uglifyJS options](https://github.com/mishoo/UglifyJS2).

### Using the compiler in Grunt

To use the compiler as grunt task, add this to your `Gruntfile.js`:

```javascript
    var amd = require('angular-amd');

    grunt.registerMultiTask('angularamd', 'Compile angular-amd', function (target) {
        var options = {};

        // Iterate over all src-dest file pairs.
        this.files.forEach(function (file) {
            // iterate over all src
            file.src.forEach(function (filePath) {
                options.sourceFolder = filePath;
                // compile each src in that order and concatenate
                output += amd.start(options);
            });

            grunt.file.write(file.dest, output);

            // Print a success message.
            grunt.log.writeln('File "' + file.dest + '" created.');
        });
    });

    var taskConfig = {
        angularamd: {
            compile: {
                // options relayed to uglifyJS
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true
                },
                src: [
                    // predetermine order (make sure no module in foo depends on a module in bar)
                    'src/foo', // the order of all the files in /foo will be resolved first
                    'src/bar'  // then the order of all the files in /bar
                ],

                dest: 'dist/lib-name.js'
            }
        }
    }
```

### Installation

If you are using [npm](http://npmjs.org/) (you should) then all you need to do is:

- Add `"angular-amd": "https://github.com/EFEdcuationFirstMobile/angular-amd/archive/v1.4.0.tar.gz"` to your project `package.json`.
- run `npm install`.

