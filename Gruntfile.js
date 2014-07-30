/*global module:false*/
module.exports = function (grunt) {
    'use strict';
    require('load-grunt-tasks')(grunt);

    var buildConfig = require('./build.conf.js');
    var taskConfig = {
        // Metadata.
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
        // Task configuration.
        changelog: {
            options: {
                dest: 'CHANGELOG.md',
                template: 'changelog.tpl'
            }
        },

        bump: {
            options: {
                files: [
                    'package.json',
                    'bower.json'
                ],
                commit: true,
                commitMessage: 'chore(release): v%VERSION%',
                commitFiles: [
                    'package.json',
                    'bower.json',
                    'CHANGELOG.md',
                    'dist/*.*'
                ],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false,
                pushTo: 'origin'
            }
        },

        clean: {
            build: [
                '<%= build_dir %>',
                '<%= coverage_dir %>'
            ],
            compile: [
                '<%= compile_dir %>',
                '<%= coverage_dir %>'
            ]
        },

        concat: {
            options: {
                banner: '<%= banner %>',
            },
            dist: {
                src: [
                    'src/shared/module.prefix',
                    'src/shared/parse.js',
                    'src/amd/<%= pkg.name %>.js',
                    'src/shared/module.suffix',
                ],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },

        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            dist: {
                src: '<%= concat.dist.dest %>',
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },

        jsbeautifier: {
            modify: {
                src: [
                    '<%= app_files.amd %>',
                    '<%= test_files.amd %>',
                    'Gruntfile.js'
                ],
                options: {
                    config: '.jsbeautifyrc'
                }
            },
            verify: {
                src: [
                    '<%= app_files.amd %>',
                    '<%= test_files.amd %>',
                    'Gruntfile.js'
                ],
                options: {
                    mode: 'VERIFY_ONLY',
                    config: '.jsbeautifyrc'
                }
            }
        },

        jshint: {
            src: [
                '<%= app_files.amd %>'
            ],
            test: [
                '<%= test_files.amd %>'
            ],
            gruntfile: [
                'Gruntfile.js'
            ],
            options: {
                jshintrc: '.jshintrc'
            }
        },

        karma: {
            options: {
                configFile: 'karma.amd.conf.js'
            },
            unit: {
                singleRun: true,
                client: {
                    captureConsole: true
                }
            },
            continuous: {
                browsers: ['PhantomJS'],
                plugins: ['karma-jasmine', 'karma-phantomjs-launcher'],
                singleRun: true
            }
        },
        simplemocha: {
            options: {
                globals: ['describe', 'it', 'expect'],
                timeout: 3000,
                ignoreLeaks: false,
                ui: 'bdd',
                reporter: 'dot'
            },

            all: {
                src: [
                    'mocha.globals.js',
                    'src/compiler/*.js'
                ]
            }
        },
        delta: {
            gruntfile: {
                files: 'Gruntfile.js',
                tasks: ['jshint:gruntfile'],
                options: {
                    livereload: false
                }
            },
            jssrc: {
                files: [
                    '<%= app_files.shared %>',
                    '<%= app_files.amd %>'
                ],
                tasks: ['jshint:src', 'karma:unit', 'simplemocha']
            },
        }
    };

    grunt.initConfig(grunt.util._.extend(taskConfig, buildConfig));

    grunt.registerTask('cleanUpJs', [
        'jsbeautifier:modify'
    ]);

    grunt.registerTask('verifyJs', [
        'jsbeautifier:verify',
        'jshint'
    ]);

    grunt.registerTask('build', [
        'clean:build',
        'cleanUpJs',
        'verifyJs'
    ]);

    grunt.registerTask('test', ['karma:unit', 'simplemocha']);

    grunt.registerTask('compile', [
        'clean:compile', 'concat:dist', 'uglify'
    ]);

    grunt.registerTask('test-continuous', ['karma:continuous', 'simplemocha']);
    grunt.registerTask('build-continuous', ['build', 'test-continuous', 'compile']);

    grunt.registerTask('pre-commit', ['verifyJs', 'test']);

    grunt.renameTask('watch', 'delta');
    grunt.registerTask('watch', ['build', 'test', 'delta']);

    grunt.registerTask('default', ['build', 'test']);
};
