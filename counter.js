const fs = require('fs');
const http = require('http');
const syncRequest = require("sync-request");
const request = require("request");
const cheerio = require("cheerio");
const linq = require('linq');
const natural = require('natural');

const GITHUB = 'https://api.github.com';
const KEY = fs.readFileSync('key.txt', 'utf-8');
const MORPHEME_ONLINE = 'http://www.morphemeonline.ru/';
const VNUTRI_SLOVA = 'http://vnutrislova.net/разбор/по-составу/';
const BLACKLIST = new Set(JSON.parse(fs.readFileSync('blacklist.json')));
const ROOTS_CACHE = new Map();
const TASK_COUNT = 10;

function downloadTaskReadmes(taskCount) {
    const JS_TASKS = 'javascript-tasks-';
    const VERSTKA_TASKS = 'verstka-tasks-';
    var tasks = "";
    for (var i = 1; i <= taskCount; i++) {
        tasks += ' ' + getReadme(JS_TASKS, i).toLocaleLowerCase();
        tasks += ' ' + getReadme(VERSTKA_TASKS, i).toLocaleLowerCase();
    }
    return tasks;
}

function getReadme(courseType, taskIndex) {
    var url = GITHUB + '/repos/urfu-2015/' + courseType + taskIndex + '/readme' +
        '?access_token=' + KEY;
    var options = {
        headers: {
            'User-Agent': 'request'
        }
    };
    var res = syncRequest('GET', encodeURI(url), options);
    var json = JSON.parse(res.getBody());
    return Buffer(json['content'], json['encoding']).toString('utf-8');
}
function getWordsByRoot(taskCount) {
    var tasks = downloadTaskReadmes(taskCount);
    var roots = new Map();
    tasks.forEach((taskText) => {
        var words = getWordsFromText(taskText);
        words.forEach(word => {
            var root = getWordRoot(word);
            if (roots.has(root)) {
                roots.get(root).push(word);
            } else {
                roots.set(root, [word]);
            }
        });
    });
    return roots;
}

function buildWordsByRootAsync(roots, tasksCount) {
    var tasks = downloadTaskReadmes(tasksCount);
    var words = getWordsFromText(tasks);
    console.log("Total words count: " + words.length);
    return Promise.all(words.map(w => buildRootsAsync(w, roots)));
}

var urlBuilders = {};
urlBuilders[MORPHEME_ONLINE] = word => MORPHEME_ONLINE + word[0] + '/' + word;
urlBuilders[VNUTRI_SLOVA] = word => VNUTRI_SLOVA + word;
var siteParsers = {};
siteParsers[MORPHEME_ONLINE] = body => {
    var $ = cheerio.load(body);
    return $('.root').text();
};

siteParsers[VNUTRI_SLOVA] = body => {
    var $ = cheerio.load(body);
    var root = $('.most-rated > p > span').text();
    root = root.substring(root.indexOf('корень ') + 8);
    root = root.substring(0, root.indexOf(']'));
    return root;
};

function buildRootsAsync(word, roots, host) {
    return new Promise(resolve => {
        host = host || VNUTRI_SLOVA;
        if (ROOTS_CACHE.has(word)) {
            return ROOTS_CACHE.get(word);
        }
        var url = urlBuilders[host](word);
        request(encodeURI(url), function (error, response, body) {
            var root;
            try {
                root = siteParsers[host](body);
                if (body.indexOf('Нет такой страницы') > 0) {
                    root = getWordRoot(word, roots, MORPHEME_ONLINE);
                }
                if (root == '')
                    root = word;
                ROOTS_CACHE.set(word, root);
            } catch (e) {
                root = natural.PorterStemmer.stem(word);
            }
            if (roots.has(root)) {
                roots.get(root).push(word);
            } else {
                roots.set(root, [word]);
            }
            resolve();
        });
    });
}

function getWordRoot(word, host) {
    host = host || MORPHEME_ONLINE;
    var url = urlBuilders[host](word);
    var res = syncRequest('GET', encodeURI(url));
    try {
        var root = siteParsers[host](res.getBody());
        if (root == '')
            root = natural.PorterStemmer.stem(word);
        ROOTS_CACHE.set(word, root);
        return root;
    } catch (e) {
        return word;
    }
}

getWordsFromText = text =>
    text
        .split(/[ A-Za-z!`–.│#№«\\»{}?|,—+-_\*1234567890'"\[\]<>\(\)\n\r]/)
        .filter(item => item != '')
        .filter(item => !BLACKLIST.has(item));

getMostOccurringElement = array =>
    linq
        .from(array)
        .groupBy(w => w)
        .orderByDescending(g => g.count())
        .select(g => [g.key(), g.count()])
        .first();

count = word =>
    linq
        .from(getWordsByRoot(TASK_COUNT).get(getWordRoot(word)))
        .count(curWord => curWord == word);

top = n =>
    linq
        .from(list(getWordsByRoot(TASK_COUNT).values()))
        .orderByDescending(pair => pair[1].length)
        .take(n)
        .select(pair => [pair[1][0], pair[1].length])
        //.select(pair => getMostOccurringElement(pair[1]))
        .toArray();

countAsync = word => {
    var roots = new Map();
    buildWordsByRootAsync(roots, TASK_COUNT).then(() => {
        console.log(roots.get(getWordRoot(word)).length);
        console.log(new Date());
    });
};
topAsync = n => {
    var roots = new Map();
    buildWordsByRootAsync(roots, TASK_COUNT).then(() => {
        linq
            .from(list(roots.entries()))
            .orderByDescending(pair => pair[1].length)
            .take(n)
            .select(pair => [pair[1][0], pair[1].length])
            //.select(pair => getMostOccurringElement(pair[1]))
            .toArray()
            .forEach(pair => console.log(pair[0] + ": " + pair[1]));
        console.log(new Date());
    })
};
module.exports.top = topAsync;
module.exports.count = countAsync;

function list(iterator) {
    var res = [];
    while (true) {
        var current = iterator.next();
        if (current.done) {
            break;
        }
        res.push(current.value);
    }
    return res;
}

console.log(new Date());
//topAsync(10);
countAsync("задание");