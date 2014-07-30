#!/usr/bin/env node

var _ = require('lodash');
var log = require('winston');
var sh = require('execSync');
var util = require('util');

var DEFAULT_BUILD_TARGET = 'bin/',
    PACKAGE_MANAGERS = ['npm', 'bower'],
    BUILD_TOOLS = ['grunt', 'karma'];

function exit(message) {
    log.error(util.format('Halt minion!! A banana has been found in the machinery with the engraving: %s',  message));
    process.exit(1);
}

function command_exists(command) {
    exists = sh.exec(util.format('which %s', command));
    return !!exists.stdout;
}

function execCommand(command) {
    log.info(util.format('Executing "%s"', command));
    exec = sh.exec(command);
    if (exec.code) {
        exit(exec.stdout);
    } else {
        log.info(util.format('"%s": done.', command));
    }
}

function verify_build_tool_exists(tool) {
    exists = command_exists(tool)
    log.info(util.format('- Verifying %s......%s', tool, (exists ? 'OK!' : 'Not installed')));
    return exists
}

function run() {
    log.info('Verifying package managers:');

    var missing_pm = _.filter(PACKAGE_MANAGERS, function (tool) {
        return !verify_build_tool_exists(tool);
    });

    if (missing_pm.length) {
        log.error(util.format('Missing package managers %s',  missing_pm.join(', ')));
        process.exit(1);
    }

    var missing_tools = _.filter(BUILD_TOOLS, function (tool) {
        return !verify_build_tool_exists(tool);
    });

    if (missing_tools.length) {
        log.error(util.format('Missing commands %s',  missing_tools.join(', ')));
        process.exit(1);
    }

    execCommand('npm install');
    execCommand('bower install');
    execCommand('grunt build');
    execCommand('grunt test-continuous');
    execCommand('grunt compile');
    execCommand('grunt changelog');
    execCommand('git add dist/*.*');
    execCommand('grunt bump-commit');
    execCommand('git push --tags');
    execCommand('grunt bump-only:minor');
    execCommand('git commit -am "chore: new version"');
    execCommand('git push');
}

run();
