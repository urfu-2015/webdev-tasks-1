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

function downloadTaskReadmes() {
    const JS_TASKS = 'javascript-tasks-';
    const VERSTKA_TASKS = 'verstka-tasks-';
    var tasks = "";
    for (var i = 1; i <= TASK_COUNT; i++) {
        tasks += ' ' + getReadme(JS_TASKS, i);
        tasks += ' ' + getReadme(VERSTKA_TASKS, i);
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
    return Buffer(json['content'], json['encoding'])
        .toString('utf-8')
        .toLocaleLowerCase();
}
function getWordsByRoot() {
    var tasks = downloadTaskReadmes();
    var roots = new Map();
    tasks.forEach(taskText => {
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

function fillWordsByRootAsync(roots) {
    var tasks = downloadTaskReadmes(TASK_COUNT);
    var words = getWordsFromText(tasks);
    console.log("Total words count: " + words.length);
    return Promise.all(words.map(w => fillRootsAsync(w, roots)));
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

function fillRootsAsync(word, roots, host) {
    return new Promise(resolve => {
        host = host || VNUTRI_SLOVA;
        if (ROOTS_CACHE.has(natural.PorterStemmer.stem(word))) {
            resolve();
            return ROOTS_CACHE.get(natural.PorterStemmer.stem(word));
        }
        var url = urlBuilders[host](word);
        request(encodeURI(url), function (error, response, body) {
            var root;
            try {
                root = siteParsers[host](body);
                if (body.indexOf('Нет такой страницы') > 0 || root === '')
                    root = natural.PorterStemmer.stem(word);
            } catch (e) {
                root = natural.PorterStemmer.stem(word);
            }
            ROOTS_CACHE.set(natural.PorterStemmer.stem(word), root);
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
        if (root === '')
            root = natural.PorterStemmer.stem(word);
        ROOTS_CACHE.set(word, root);
        return root;
    } catch (e) {
        return word;
    }
}

getWordsFromText = text =>
    text
        .split(/[^а-яё]/)
        .filter(item => item !== '')
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
        .count(curWord => curWord === word);

top = n =>
    linq
        .from(list(getWordsByRoot(TASK_COUNT).values()))
        .orderByDescending(pair => pair[1].length)
        .take(n)
        .select(pair => [pair[1][0], pair[1].length])
        .toArray();

countAsync = (word, cb) => {
    var roots = new Map();
    var root = getWordRoot(word, VNUTRI_SLOVA);
    fillWordsByRootAsync(roots, TASK_COUNT).then(() => {
        var ans = roots.get(root) || 0;
        cb(ans);
        console.log(new Date());
    });
};

topAsync = (n, cb) => {
    var roots = new Map();
    fillWordsByRootAsync(roots, TASK_COUNT).then(() => {
        cb(linq
            .from(list(roots.entries()))
            .orderByDescending(pair => pair[1].length)
            .take(n)
            .select(pair => pair[0] + ": " + pair[1].length)
            .toArray()
        );
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

const TASK_COUNT = 1; // с 10 долго :(

console.log(new Date());
//topAsync(10, data => data.forEach(d => console.log(d)));
countAsync("kek", ans => console.log(ans));
//countAsync("пользователь", ans => console.log(ans));
//countAsync("скрипт");
//countAsync("задание");