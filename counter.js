const fs = require('fs');
const http = require('http');
const syncRequest = require("sync-request");
const request = require("request");
const cheerio = require("cheerio");
const LINQ = require('node-linq').LINQ;
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
    try{
        $ = cheerio.load(res.getBody());
        var root = $('.root').text();
        ROOTS_CACHE.set(word, root);
        return root;
    } catch (e){
        return word;
    }
}

function downloadTaskReadmes() {
    const JS_TASKS = 'javascript-tasks-';
    const VERSTKA_TASKS = 'verstka-tasks-';
    var tasks = [];
    for (var i = 1; i <= 1; i++) {
        console.log("Downloading... " + i);
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
function getWordsByRoot() {
    var tasks = downloadTaskReadmes();
    var roots = new Map();
    tasks.forEach((taskText) => {
        var words = getWordsFromText(taskText);
        console.log(words.length)
        words.forEach((word) => {
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
function buildWordsByRootAsync(roots) {
    var tasks = downloadTaskReadmes();
    var wordsCount = 0;
    var allWords = [];
    tasks.forEach((taskText) => {
        var words = getWordsFromText(taskText);
        words.forEach((word, i) => {
            allWords.concat(words);
            wordsCount += words.length;
            buildRootsAsync(word, roots, i);
        });
    });
    console.log("Все таски в очереди");

    var intervalId = setInterval(() => {
        if (allWords.length == wordsCount) {
            clearInterval(intervalId);
        }
        if (allWords.length > 0) {
            console.log(allWords.length)
        }
    }, 200);
    return roots;
}
function buildRootsAsync(word, roots, i)
{
    if (ROOTS_CACHE.has(word)){
        return ROOTS_CACHE.get(word);
    }
    var url = MORPHEME_ONLINE + word[0] + '/' + word;

    request(encodeURI(url), function (error, response, body) {
        var $;
        var root;
        try {
            $ = cheerio.load(body);
            root = $('.root').text();
            ROOTS_CACHE.set(word, root);
        } catch (e) {
            root = word;
            console.log()
        }
        if (roots.has(root)) {
            roots.get(root).push(word);
        } else {
            roots.set(root, [word]);
        }
        console.log("word " + word + " " + i);
    });
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
        .first()
        .key();

module.exports.count = word =>
    Enum
        .from(getWordsByRoot().get(getWordRoot(word)))
        .count(curWord => curWord == word);
top = n =>
    Enum
        .from(getWordsByRoot().values())
        //.from(buildWordsByRootAsync(new Map()).values())
        .orderBy(words => words.length)
        .take(n)
        .select(words => getMostOccurringElement(words))
        .toArray();
module.exports.top = top;

console.log(top(2));
//console.log(getWordsFromText(getReadme('javascript-tasks-', 3).toLocaleLowerCase()));
