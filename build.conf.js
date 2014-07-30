module.exports = {
    build_dir: 'build',
    compile_dir: 'dist',
    coverage_dir: 'coverage',
    app_files: {
        amd: [ 'src/amd/angular-amd.js'],
        compiler: [ 'src/compiler/angular-amd-compiler.js'],
        shared: [ 'src/shared/parse.js']
    },
    test_files: {
        amd: [ 'src/amd/*.spec.js' ],
        compiler: [ 'src/compiler/*.spec.js' ],
        shared: [ 'src/shared/*.js'],
        mocks: [
            'vendor/angular-mocks/angular-mocks.js'
        ]
    },
    vendor_files: {
        js: [
            'vendor/angular/angular.js'
        ],
        css: [
        ],
        assets: [
        ],
        publish: [
        ]
    },
};
