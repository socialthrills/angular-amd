describe('compiler', function () {

    var compiler = require('./amd-compiler'),
        mocks = require('mocks'),
        fsMock;

    describe('start()', function () {

        it('should throw an error if "sourceFolder" option is not provided', function () {
            expect(function() {
                compiler.start({});
            }).to.throw('Option "sourceFolder" must be provided.');
        });

    });

    describe('parseDependencies()', function () {

        it('should parse dependencies strArray and return list of module path', function () {

                var dir = 'src/';

                var moduleStr1 = 'pluto,' +
                    'module hello from "hello.world";,' +
                    'module moonPie from "moon";';
                var dependencies1 = [{
                    file: '',
                    expression: 'pluto',
                    name: 'pluto',
                    isAmd: false,
                },{
                    file: 'src/hello/world.js',
                    expression: 'module hello from "hello.world";',
                    name: 'hello',
                    isAmd: true,
                },{
                    file: 'src/moon.js',
                    expression: 'module moonPie from "moon";',
                    name: 'moonPie',
                    isAmd: true,
                }];

                var moduleStr2 = 'module planet from "save.planet.index";,';
                var dependencies2 = [{
                    file: 'src/save/planet/index.js',
                    expression: 'module planet from "save.planet.index";',
                    name: 'planet',
                    isAmd: true
                }];

                var moduleStr3 = '\'module hello from "hello"\'';
                var dependencies3 = [{
                    file: '',
                    expression: '\'module hello from "hello"\'',
                    name: 'hello',
                    isAmd: false,
                }];

                expect(compiler.parseDependencies(dir, moduleStr1)).to.deep.equal(dependencies1);
                expect(compiler.parseDependencies(dir, moduleStr2)).to.deep.equal(dependencies2);
                expect(compiler.parseDependencies(dir, moduleStr3)).to.deep.equal(dependencies3);
        });

    });

    describe('compileLoadOrder()', function () {

        it('should throw an error if a module depends on a module that does not exist', function () {

            fsMock = mocks.fs.create({
                src: {
                    // dependency name has a typo
                    'abc.js': mocks.fs.file(0, 'angular.amd.module(\'abc\', [\'module palnet from "app.planet";\'])'),
                    'app': {
                        'planet.js': mocks.fs.file(0, 'angular.amd.module(\'planet\', [])')
                    }
                }
            });

            var jsFiles = ['/src/abc.js', '/src/app/planet.js']

            expect(function() {
                compiler.compileLoadOrder(fsMock, '/src/', jsFiles);
            }).to.throw('Dependency "palnet" of module "abc" is amd, but that module does not exist.');
        });

        it('should throw an error if a module depends on a file that does not exist', function () {

            fsMock = mocks.fs.create({
                src: {
                    // dependency file name has a typo
                    'abc.js': mocks.fs.file(0, 'angular.amd.module(\'abc\', [\'module planet from "app.palnet";\'])'),
                    'app': {
                        'planet.js': mocks.fs.file(0, 'angular.amd.module(\'planet\', [])')
                    }
                }
            });

            var jsFiles = ['/src/abc.js', '/src/app/planet.js']

            expect(function() {
                compiler.compileLoadOrder(fsMock, '/src/', jsFiles);
            }).to.throw('Dependency "planet" of module "abc" is amd, but file "/src/app/palnet.js" does not exist.');
        });

        it('should throw an error if circular dependencies are detected', function () {

            fsMock = mocks.fs.create({
                src: {
                    'abc.js': mocks.fs.file(0, 'angular.amd.module(\'abc\', [\'module planet from "app.planet";\'])'),
                    'app': {
                        // planet depends on moon
                        'planet.js': mocks.fs.file(0, 'angular.amd.module(\'planet\', [\'module moon from "app.moon";\'])'),
                        // moon depends on planet
                        'moon.js': mocks.fs.file(0, 'angular.amd.module(\'moon\', [\'module planet from "app.planet";\'])')
                    }
                }
            });

            var jsFiles = ['/src/abc.js', '/src/app/planet.js', '/src/app/moon.js']

            var errMsg = "Some (3) files failed to find their place:\n" +
                         "Module \"abc\" in file \"/src/abc.js\"\n" +
                         " + Missing 'module planet from \"app.planet\";'\n" +
                         "Module \"planet\" in file \"/src/app/planet.js\"\n" +
                         " + Missing 'module moon from \"app.moon\";'\n" +
                         "Module \"moon\" in file \"/src/app/moon.js\"\n" +
                         " + Missing 'module planet from \"app.planet\";'";

            expect(function() {
                compiler.compileLoadOrder(fsMock, '/src/', jsFiles);
            }).to.throw(errMsg);
        });

        it('should compile load order for files', function () {

            fsMock = mocks.fs.create({
                src: {
                    'abc.js': mocks.fs.file(0, 'angular.amd.module(\'abc\', [\'module planet from "app.planet";\'])'),
                    'app': {
                        'planet.js': mocks.fs.file(0, 'angular.amd.module(\'planet\', [])')
                    }
                }
            });

            var jsFiles = ['/src/abc.js', '/src/app/planet.js'],
                expected = ['/src/app/planet.js', '/src/abc.js'];

            expect(compiler.compileLoadOrder(fsMock, '/src/', jsFiles)).to.deep.equal(expected);
        });

        it('should ignore external dependencies not defined with import syntax', function () {

            fsMock = mocks.fs.create({
                src: {
                    'abc.js': mocks.fs.file(0, 'angular.amd.module(\'abc\', [\'module planet from "app.planet";\'])'),
                    'app': {
                        // note planet depends on base64
                        'planet.js': mocks.fs.file(0, 'angular.amd.module(\'planet\', [\`base64\`])')
                    }
                }
            });

            var jsFiles = ['/src/abc.js', '/src/app/planet.js'],
                expected = ['/src/app/planet.js', '/src/abc.js'];

            expect(compiler.compileLoadOrder(fsMock, '/src/', jsFiles)).to.deep.equal(expected);
        });

    });

});
