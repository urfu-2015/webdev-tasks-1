'use strict';
var request = require('request');
var fs = require('fs');
var natural = require('natural');
var OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
var FREQUENCY_DICT = [];
var DATA_ANALYZED = false;
var deferredAction = [];
var stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));

var promise = new Promise(function (resolve, reject) {
    console.log('data is processed...');
    var mainRequest = {
        url: 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + OAUTH_TOKEN,
        headers: {
            'User-Agent': 'request'
        }
    };
    request(mainRequest, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            reject('ERROR');
        }
        var repos = JSON.parse(body);
        var names = [];
        for (var i = 0; i < repos.length; i++) {
            if (repos[i].name.indexOf('verstka-tasks') !== -1 ||
                repos[i].name.indexOf('javascript-tasks') !== -1) {
                names.push(repos[i].name);
            }
        }
        var calls = 0;
        for (var i = 0; i < names.length; i++) {
            processingREADME(names[i], function (error) {
                if (error) {
                    reject(error);
                }
                if (++calls === names.length) {
                    resolve();
                }
            });
        }
    });
});



function processingREADME(name, callback) {
    var getRequest = {
        url: 'https://api.github.com/repos/urfu-2015/' + name +
         '/readme?access_token=' + OAUTH_TOKEN,
        headers: {
            'User-Agent': 'request'
        }
    };
    request(getRequest, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            processingText(JSON.parse(body).content);
            callback(null);
        } else {
            callback('ERROR');
        }
    });
}

function processingText(encodedText) {
    var decodeText = new Buffer(encodedText, 'base64').toString();
    decodeText = decodeText
        .replace(/[^ЁёА-я \n]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    var tokenizer = new natural.AggressiveTokenizerRu();
    var cleanText = [];
    decodeText = tokenizer.tokenize(decodeText);
    decodeText.forEach(function (word) {
        if (stopWords.indexOf(word) === -1) {
            cleanText.push(word);
        }
    });
    addToFrequencyArray(cleanText);
}

function addToFrequencyArray(wordArray) {
    for (var i = 0; i < wordArray.length; i++) {
        var added = false;
        var fullWord = wordArray[i];
        var stemWord = natural.PorterStemmerRu.stem(fullWord);
        for (var j = 0; j < FREQUENCY_DICT.length; j++) {
            if (natural.JaroWinklerDistance(fullWord, FREQUENCY_DICT[j].key) > 0.85) {
                FREQUENCY_DICT[j].count += 1;
                if (FREQUENCY_DICT[j].fullWords.indexOf(fullWord) === -1) {
                    FREQUENCY_DICT[j].fullWords.push(fullWord);
                }
                added = true;
                break;
            }
        }
        if (added) {
            continue;
        }
        FREQUENCY_DICT.push({});
        FREQUENCY_DICT[FREQUENCY_DICT.length - 1].key = stemWord;
        FREQUENCY_DICT[FREQUENCY_DICT.length - 1].count = 1;
        FREQUENCY_DICT[FREQUENCY_DICT.length - 1].fullWords = [fullWord];
    }
}

module.exports.top = function (n) {
    if (DATA_ANALYZED) {
        return new Promise(function (resolve, reject) {
            resolve(hiddenTop(n));
        });
    }
    deferredAction.push(function (i) {
        return function () {
            return hiddenTop(i);
        };
    }(n));
    return promise.then(
    result => {
        DATA_ANALYZED = true;
        while (deferredAction.length !== 0) {
            var action = deferredAction.shift();
            return action();
        }
    },
    error => console.log(error)
    );
};

module.exports.count = function (word) {
    if (DATA_ANALYZED) {
        return new Promise(function (resolve, reject) {
            resolve(hiddenCount(word));
        });
    }
    deferredAction.push(function (i) {
        return function () {
            return hiddenCount(i);
        };
    }(word));
    return promise.then(
    result => {
        DATA_ANALYZED = true;
        while (deferredAction.length !== 0) {
            var action = deferredAction.shift();
            return action();
        }
    },
    error => console.log(error)
    );
};

function hiddenTop(n) {
    FREQUENCY_DICT.sort(compare);
    FREQUENCY_DICT.reverse();
    var result = [];
    for (var i = 0; i < Math.min(n, FREQUENCY_DICT.length); i++) {
        result.push(FREQUENCY_DICT[i].fullWords[0] + ' ' + FREQUENCY_DICT[i].count);
    };
    return result.join('\n');
}

function hiddenCount(word) {
    for (var i = 0; i < FREQUENCY_DICT.length; i++) {
        if (natural.JaroWinklerDistance(word, FREQUENCY_DICT[i].key) > 0.85) {
            return FREQUENCY_DICT[i].count;
        }
    }
    return 'word is not found';
}

function compare(a, b) {
    if (a.count < b.count) {
        return -1;
    } else if (a.count > b.count) {
        return 1;
    } else {
        return 0;
    }
};
