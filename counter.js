const https = require('https');
const request = require('request');
const fs = require('fs');
const natural = require('natural');

var wordCountIsDone = false;
var rootCount = {};
var wordToRoot = {};
var rootToWord = {};

module.exports.top = function (n) {
    if (wordCountIsDone) {
        showTop(n);
        return;
    }
    getWordCount(function (error) {
        if (!error) {
            wordCountIsDone = true;
            showTop(n);
        }
    });
};

module.exports.count = function (word) {
    if (wordCountIsDone) {
        showWordCount(word);
        return;
    }
    getWordCount(function (error) {
        if (!error) {
            wordCountIsDone = true;
            showWordCount(word);
        }
    });
};

function showTop(n) {
    var keys = Object.keys(rootCount);
    keys.sort(function (a, b) {
        return rootCount[b] - rootCount[a];
    });
    for (var i = 0; i < n; i++) {
        console.log(rootToWord[keys[i]] + ' ' + rootCount[keys[i]]);
    }
}

function showWordCount(word) {
    var stem = natural.PorterStemmerRu.stem(word);
    console.log(word + ' ' + rootCount[stem]);
}

var token = '';
var urlsToHandle = 0;
var notWord = {};

function getWordCount(callback) {
    readNotWords();
    readToken();
    data = fs.readFileSync('githuburls.txt');
    var urls = data.toString().split('\r\n');
    urlsToHandle = urls.length;
    urls.forEach(function (url) {
        getReadme(url, callback);
    });
}

function readNotWords() {
    var data = fs.readFileSync('notwords.txt');
    data.toString().split('\r\n').forEach(function (word) {
        notWord[word] = true;
    });
}

function readToken() {
    var data = fs.readFileSync('key.txt');
    token = data.toString();
}

function getReadme(url, callback) {
    var options = {
        url: 'https://api.github.com/repos/' + url + '/readme?access_token=' + token,
        headers: {
            'user-agent': 'request'
        }
    };
    request(options,
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                countWords((new Buffer(JSON.parse(body).content, 'base64')).toString(), callback);
            } else {
                urlsToHandle--;
                if (urlsToHandle === 0) {
                    callback();
                }
            }
        }
    );
}

function countWords(content, callback) {
    var tokenizer = new natural.AggressiveTokenizerRu();
    var words = tokenizer.tokenize(content);
    words.forEach(function (word) {
        word = word.toLowerCase();
        if (isRussian(word) && notWord[word] !== true) {
            var stem = natural.PorterStemmerRu.stem(word);
            if (rootCount[stem] === undefined) {
                rootCount[stem] = 0;
                rootToWord[stem] = word;
            }
            rootCount[stem]++;
        }
    });
    urlsToHandle--;
    if (urlsToHandle === 0) {
        callback();
    }
}

function isRussian(word) {
    return word.match(/^[а-я\-]+$/);
}
