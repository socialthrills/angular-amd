describe('angular-amd', function () {
    'use strict';

    function hasModule(name) {
        var exists;
        try {
            exists = angular.module(name);
        } catch (err) {
            exists = null;
        }

        return exists;
    }

    var amd = angular.amd;

    beforeEach(function () {
        amd.registry.reset();
    });

    it('q playground', inject(function ($q, $rootScope) {
        var d = $q.defer(),
            a = 1;

        $q.all([d.promise]).then(function () {
            a = 2;
        });

        d.resolve();
        $rootScope.$apply();
        expect(a).toBe(2);

        $q.all([d.promise]).then(function () {
            a = 3;
        });

        $rootScope.$apply();
        expect(a).toBe(3);
    }));

    it('should create an angular module', function () {
        amd.module('moduleZ', []).then(function (module) {
            expect(angular.module('moduleZ') === module).toBe(true);
        });

        amd.$scope.$digest();

        expect(amd.module('moduleZ')).not.toBe(null);
    });

    it('should create an angular module with a provider', function () {
        amd.module('moduleA', []).provider('MainProvider', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleA')._invokeQueue[0][2]['0']).toBe('MainProvider');
    });

    it('should create an angular module with a controller', function () {
        amd.module('moduleB', []).controller('MainCtrl', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleB')._invokeQueue[0][2]['0']).toBe('MainCtrl');
    });

    it('should create an angular module with a service', function () {
        amd.module('moduleC', []).service('MainService', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleC')._invokeQueue[0][2]['0']).toBe('MainService');
    });

    it('should create an angular module with a factory', function () {
        amd.module('moduleD', []).factory('MainFactory', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleD')._invokeQueue[0][2]['0']).toBe('MainFactory');
    });

    it('should create an angular module with a value', function () {
        amd.module('moduleE', []).value('MainValue', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleE')._invokeQueue[0][2]['0']).toBe('MainValue');
    });

    it('should create an angular module with a constant', function () {
        amd.module('moduleF', []).constant('MainConstant', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleF')._invokeQueue[0][2]['0']).toBe('MainConstant');
    });

    it('should create an angular module with a animation', function () {
        amd.module('moduleG', []).animation('MainAnimation', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleG')._invokeQueue[0][2]['0']).toBe('MainAnimation');
    });

    it('should create an angular module with a filter', function () {
        amd.module('moduleH', []).filter('MainFilter', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleH')._invokeQueue[0][2]['0']).toBe('MainFilter');
    });

    it('should create an angular module with a config', function () {
        var a = function () {};
        amd.module('moduleI', []).config(a);
        amd.$scope.$digest();

        expect(amd.module('moduleI')._invokeQueue[0][2]['0']).toBe(a);
    });

    it('should create an angular module with a run', function () {
        var a = function () {};
        amd.module('moduleJ', []).run(a);
        amd.$scope.$digest();

        expect(amd.module('moduleJ')._runBlocks[0]).toBe(a);
    });

    it('should create an angular module with a constant and a value', function () {
        amd.module('moduleK', []).constant('MainConstant', function () {}).value('MainValue', function () {});
        amd.$scope.$digest();

        expect(amd.module('moduleK')._invokeQueue[0][2]['0']).toBe('MainConstant');
        expect(amd.module('moduleK')._invokeQueue[1][2]['0']).toBe('MainValue');
    });

    it('should import module dependencies', function () {
        var moduleC;
        amd.module('moduleDependencies', []).then(function (module) {
            moduleC = module;
            expect(angular.module('moduleDependencies')).toEqual(module);
        });

        amd.module('moduleB', ['moduleDependencies']).then(function (module) {
            expect(module._imports.moduleDependencies === moduleC).toBe(true);
        });

        amd.$scope.$digest();

        expect(hasModule('moduleB')).not.toBe(null);
    });

    it('should import already instanciated angular.module dependencies', function () {
        var moduleC = angular.module('moduleC', []);

        amd.module('moduleB', ['moduleC']).then(function (module) {
            expect(module._imports.moduleC === moduleC).toBe(true);
        });

        amd.$scope.$digest();

        expect(hasModule('moduleB')).not.toBe(null);
    });

    it('should load module dependencies before module is created', function () {
        var first = true,
            spy = spyOn(window.document.body, 'appendChild');

        spy.and.callFake(function () {
            amd.module('module1', []).then(function (module) {
                expect(angular.module('module1') === module).toBe(true);
                expect(first).toBe(true);
                first = false;
            });
        });

        amd.module('module2', ['module1']).then(function (module) {
            expect(angular.module('module2') === module).toBe(true);
            expect(first).toBe(false);
        });

        amd.$scope.$digest();
        expect(hasModule('module2')).not.toBe(null);
    });

    it('should have access to _imports from ctrl, factory etc', function () {
        var mc,
            $controller;

        amd.module('module4', []).then(function (module) {
            mc = module;
        });

        amd.module('module3', ['module4']).controller('MainCtrl', function (module4) {
            expect(module4 === mc).toBe(true);
        });

        amd.$scope.$digest();
        expect(hasModule('module3')).not.toBe(null);

        $controller = angular.injector(['ng', 'module3', 'module4']).get('$controller');

        $controller('MainCtrl', {});
    });

    describe('ES6 import statments', function () {

        it('should import module dependencies with ES6 statments', function () {
            var module5;
            amd.module('module5', []).then(function (module) {
                module5 = module;

                expect(angular.module('module5') === module).toBe(true);
            });

            amd.module('module15', [
                'module module5 from "module5"'
            ]).then(function (module) {
                expect(module._imports.module5 === module5).toBe(true);
            });

            amd.module('module16', [
                'module module5 from "module5"'
            ]).then(function (module) {
                expect(module._imports.module5 === module5).toBe(true);
            });

            amd.$scope.$digest();
            expect(hasModule('module15')).not.toBe(null);
            expect(hasModule('module16')).not.toBe(null);
        });

        it('bower: should import module dependencies with ES6 statments', function () {
            var external;
            amd.module('ext', []).then(function (module) {
                external = module;

                expect(angular.module('ext') === module).toBe(true);
            });

            amd.module('module15', [
                'module ext from "bower:external"'
            ]).then(function (module) {
                expect(module._imports.external === external).toBe(true);
            });

            amd.module('module16', [
                'module ext from "bower:external"'
            ]).then(function (module) {
                expect(module._imports.external === external).toBe(true);
            });

            amd.$scope.$digest();
            expect(hasModule('module15')).not.toBe(null);
            expect(hasModule('module16')).not.toBe(null);
        });

        it('should import symbols from modules', function () {
            amd.module('module7', []).value('name', 'Scrooge');
            amd.module('module6', []).value('version', 'six').value('type', 'A');

            amd.module('moduleZ', [
                'import {version,type} from "module6"',
                'import name from "module7"'
            ]).then(function (module) {
                expect(module._imports.name).toBe('Scrooge');
                expect(module._imports.version).toBe('six');
                expect(module._imports.type).toBe('A');
            });

            amd.$scope.$digest();
            expect(hasModule('moduleZ')).not.toBe(null);
        });

        it('should not be able to import symbols with same name from modules', function () {
            var thrown = false,
                thrown2 = false;

            amd.module('module8', []).value('name', 'Scrooge');
            amd.module('module9', []).value('name', 'six');

            try {
                amd.module('module11', [
                    'import name from "module8"',
                    'import name from "module9"'
                ]);
            } catch (e) {
                thrown = true;
            }

            try {
                amd.module('module10', [
                    'import {name,name} from "module8"'
                ]);
            } catch (e) {
                thrown2 = true;
            }

            amd.$scope.$digest();

            expect(thrown).toBe(true);
            expect(thrown2).toBe(true);
        });

        it('should import symbols saving them as aliases from modules', function () {
            amd.module('module12', []).value('name', 'Scrooge').value('type', 'A');
            amd.module('module13', []).value('version', 'six').value('type', 'A').value('b', 'B');

            amd.module('module14', [
                'import {name as moduleAName} from "module12"'
            ]).then(function (module) {
                expect(module._imports.moduleAName).toBe('Scrooge');
            });

            amd.module('moduleY', [
                'import {name as a, type} from "module12"',
                'import {type as b, b as c} from "module13"'
            ]).then(function (module) {
                expect(module._imports.a).toBe('Scrooge');
                expect(module._imports.b).toBe('A');
                expect(module._imports.c).toBe('B');

            });

            amd.$scope.$digest();
            expect(hasModule('module14')).not.toBe(null);
        });
    });
});
