/**
 * Created by savi on 27.02.16.
 */

const fsLogic = require('./fsLogic');

const gitHubApi = 'https://api.github.com';
const key = fsLogic.readFile('key.txt');
const mainRepo = 'urfu-2015';
const jsTasksPrefix = 'javascript-tasks-';
const verstkaTasksPrefix = 'verstka-tasks-';
const numberTasks = 1;

const onlineDictHost = 'http://vnutrislova.net';
const onlineDictPath = '/разбор/по-составу/';
const rootRegExp = new RegExp('корень \\[(.*?)\\]');

const unions = 'unions.txt';
const prepositions = 'prepositions.txt';
const punctuationMarks = 'punctuationMarks.txt';

module.exports.gitHubApi = gitHubApi;
module.exports.key = key;
module.exports.mainRepo = mainRepo;
module.exports.jsTasksPrefix = jsTasksPrefix;
module.exports.verstkaTasksPrefix = verstkaTasksPrefix;
module.exports.numberTasks = numberTasks;
module.exports.onlineDictHost = onlineDictHost;
module.exports.onlineDictPath = onlineDictPath;
module.exports.rootRegExp = rootRegExp;
module.exports.unions = unions;
module.exports.prepositions = prepositions;
module.exports.punctuationMarks = punctuationMarks;

