const fs = require('fs');
const syncRequest = require("sync-request");
const cheerio = require("cheerio");
const Enum = require('linq');

const GITHUB = 'https://api.github.com';
const KEY = fs.readFileSync('key.txt', 'utf-8');
const MORPHEME_ONLINE = 'http://www.morphemeonline.ru/';
const BLACKLIST = new Set(JSON.parse(fs.readFileSync('blacklist.json')));
const ROOTS_CACHE = new Map();

function getWordRoot(word) {
    var url = MORPHEME_ONLINE + word[0] + '/' + word;
    url = encodeURI(url);
    var res = syncRequest('GET', url);
    var $;
    try {
        $ = cheerio.load(res.getBody());
        var root = $('.root').text();
        if (root == '')
            root = word;
        ROOTS_CACHE.set(word, root);
        return root;
    } catch (e) {
        return word;
    }
}

function downloadTaskReadmes(count) {
    const JS_TASKS = 'javascript-tasks-';
    const VERSTKA_TASKS = 'verstka-tasks-';
    var tasks = [];
    for (var i = 1; i <= count; i++) {
        tasks.push(getReadme(JS_TASKS, i).toLocaleLowerCase());
        tasks.push(getReadme(VERSTKA_TASKS, i).toLocaleLowerCase());
    }
    return tasks;
}

function getReadme(courseType, taskIndex) {
    var url = GITHUB + '/repos/urfu-2015/' + courseType + taskIndex + '/readme' +
        '?access_token=' + KEY;
    var headers = {
        headers: {
            'User-Agent': 'request'
        }
    };
    var res = syncRequest('GET', encodeURI(url), headers);
    var json = JSON.parse(res.getBody());
    return Buffer(json['content'], json['encoding']).toString('utf-8');
}
function getWordsByRoot(taskCount) {
    var tasks = downloadTaskReadmes(taskCount);
    var roots = new Map();
    tasks.forEach((taskText) => {
        var words = getWordsFromText(taskText);
        words.forEach((word) => {
            var root = getWordRoot(word);
            console.log(word);
            if (roots.has(root)) {
                roots.get(root).push(word);
            } else {
                roots.set(root, [word]);
            }
        });
    });
    return roots;
}

getWordsFromText = text =>
    text
        .split(/[ A-Za-z!`–.#«\\»?,+-_\*1234567890'"\[\]<>\(\)\n\r]/)
        .filter(item => item != '')
        .filter(item => !BLACKLIST.has(item));

getMostOccurringElement = array =>
    Enum
        .from(array)
        .groupBy(w => w)
        .orderByDescending(g => g.count())
        .select(g => [g.key(), g.count()])
        .first();

module.exports.count = word =>
    Enum
        .from(getWordsByRoot().get(getWordRoot(word)))
        .count(curWord => curWord == word);
top = n =>
    Enum
        .from(list(getWordsByRoot(1).values()))
        .orderBy(words => words.length)
        .take(n)
        .select(words => getMostOccurringElement(words))
        .toArray();
module.exports.top = top;

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
top(2).forEach(pair => console.log(pair[0] + ": " + pair[1]));

