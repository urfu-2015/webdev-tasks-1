const fs = require('fs');
const http = require('http');
const request = require("request");
const cheerio = require("cheerio");

const GITHUB = 'https://api.github.com';
const KEY = fs.readFileSync('key.txt', 'utf-8');
const MORPHEMEONLINE = 'http://www.morphemeonline.ru/';
const BLACKLIST = new Set(fs.readFileSync('blacklist.txt'));

function getWordRoot(word) {
    //var url = MORPHEMEONLINE + 'б/бабушка';
    var url = MORPHEMEONLINE + word[0] + '/' + word;
    request(encodeURI(url), function (err, res, body) {
        $ = cheerio.load(body);
        return $('.root').text();
    });
}

module.exports.count = function (word) {

};
module.exports.top = function (n) {

};

function downloadTaskReadmes() {
    const JS_TASKS = 'javascript-tasks-';
    const VERSTKA_TASKS = 'verstka-tasks-';
    for (var i = 1; i <= 10; i++) {
        var js_readme = getReadme(JS_TASKS, i);
        var verstka_readme = getReadme(VERSTKA_TASKS, i);
    }
}

function getReadme(courseType, taskIndex) {
    var url = GITHUB + '/repos/urfu-2015/' + courseType + taskIndex + '/readme' +
        '?access_token=' + KEY;
    var gitRequest = {
        url: encodeURI(url),
        headers: {
            'User-Agent': 'request'
        }
    };
    return request(gitRequest, function (err, res, body) {
        var json = JSON.parse(body);
        console.log(Buffer(json['content'], json['encoding']).toString('utf-8'));
    });
}
function getWordsFromReadme() {

}
function replaceAllOccurrences(str, search, replacement) {
    return str.replace(new RegExp(search, 'g'), replacement);
}
console.log(getReadme('javascript-tasks-', 10));
//console.log(replaceAllOccurrences(, '.', ''));