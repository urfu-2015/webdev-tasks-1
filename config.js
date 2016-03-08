/**
 * Created by savi on 27.02.16.
 */

const fsLogic = require('./fsLogic');

const configObj = {
    gitHubApi: 'https://api.github.com',
    key: fsLogic.readFile('key.txt'),
    mainRepo: 'urfu-2015',
    jsTasksPrefix: 'javascript-tasks-',
    verstkaTasksPrefix: 'verstka-tasks-',
    numberTasks: 1,

    onlineDictHost: 'http://vnutrislova.net',
    onlineDictPath: '/разбор/по-составу/',
    rootRegExp: /корень \\[(.*?)\\]/,

    unions: 'unions.txt',
    prepositions: 'prepositions.txt',
    punctuationMarks: 'punctuationMarks.txt'
};

module.exports.configObj = configObj;
