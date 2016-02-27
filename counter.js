const request = require('request');
const syncRequest = require('sync-request');
const fs = require('fs');
const stemmer = require('natural').PorterStemmerRu;
const cheerio = require('cheerio');
const token = fs.readFileSync('./key.txt', 'utf-8');
var reqURL = 'https://api.github.com/users/urfu-2015/repos';
var bannedWords = JSON.parse(fs.readFileSync('./stop_words.json', 'utf-8')).words;

exports.top = function (n) {
    GitRequest(getOptions(reqURL), function (dict) {
        printTopWords(dict, n);
    });
};

exports.count = function (word) {
    GitRequest(getOptions(reqURL), function (dict) {
        printCountOfWord(dict, word);
    });
};

function getOptions(reqURL) {
    return {
        url: reqURL + token,
        headers: {
            'User-Agent': 'request'
        }
    };
}

function GitRequest(options, callback) {
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var ans = JSON.parse(body);
            var repos = [];
            for (var i = 0; i < ans.length; i++) {
                if (ans[i].name.indexOf('tasks') != -1) {
                    repos.push(ans[i].name);
                }
            }
            getREADMEFromReps(repos, callback);
        }
    });
}

function getREADMEFromReps(repNames, callback) {
    var words = [];
    var index = 0;
    for (var i = 0; i < repNames.length; i++) {
        var url = 'https://api.github.com/repos/urfu-2015' + '/' + repNames[i] + '/readme';
        request(getOptions(url), function (error, response, body) {
            if (!error && response.statusCode == 200) {
                index += 1;
                var encodedREADME = JSON.parse(body).content;
                var newWords = parseText(encodedREADME);
                words = words.concat(newWords);
                if (index === repNames.length) {
                    var dict = createDictionary(words);
                    callback(dict);
                }
            }
        });
    }
}

function getRootFromURL(word) {
    var res = syncRequest('GET', encodeURI('http://morphemeonline.ru/К/' + word));
    var $ = cheerio.load(res.getBody('utf-8'));
    var root = $('span.root').text();
    if (root !== '') {
        return root;
    } else {
        return word;
    }
}

function getRoot(word) {
    return stemmer.stem(word);
}

function createDictionary(words) {
    var dict = {};
    var roots = [];
    for (var i = 0; i < words.length; i++) {
        var root = getRoot(words[i]);
        if (roots.indexOf(root) === -1) {
            roots.push(root);
            dict[root] = {};
            dict[root][words[i]] = 1;
        } else {
            if (dict[root][words[i]] === undefined) {
                dict[root][words[i]] = 1;
            } else {
                dict[root][words[i]] += 1;
            }
        }
    }
    return dict;
}

function parseText(encodedText) {
    var text = new Buffer(encodedText, 'base64').toString();
    return text
        .toLowerCase()
        .replace(/[^А-Яа-яЁё]/g, ' ')
        .replace(/\s+/, ' ')
        .split(' ')
        .filter(filterFunction);
}

function filterFunction(word) {
    return (word.length > 1 && bannedWords.indexOf(word) === -1);
}

function printTopWords(dict, n) {
    var top = Object.keys(dict).sort(function (a, b) {
        return getCountOfWordsWithRoot(dict, a) > getCountOfWordsWithRoot(dict, b);
    });
    for (var i = 0; i < n; i++) {
        console.log(Object.keys(dict[top[i]]).pop() + ' ' +
            getCountOfWordsWithRoot(dict, top[i]));
    }
}

function getCountOfWordsWithRoot(dict, root) {
    var count = 0;
    for (var i in dict[root]) {
        count += dict[root][i];
    }
    return count;
}

function printCountOfWord(dict, word) {
    var root = getRoot(word);
    try {
        console.log(dict[root][word]);
    } catch (e) {
        console.log('There is no such word');
    }
}
