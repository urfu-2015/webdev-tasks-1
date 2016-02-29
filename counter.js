'use strict';

var taskList = [];
const https = require('https');
const badWords = require('./badWords.js');

var httpClient = {
    requestsSent: 0,
    responsesReceived: 0,
    sendHttpReq: function (path, callback) {
        var json;
        var options = {
            hostname: 'api.github.com',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'My-Test-App',
                //Authorization:,
                Accept: 'application/vnd.github.v3+json'
            }
        };
        this.requestsSent++;
        var req = https.request(options, (res) => {
            res.setEncoding('utf8');
            var data = '';
            res.on('data', (d) => {
                data += d;
            });

            res.on('end', () => {
                var response = JSON.parse(data);
                if (res.statusCode !== 200) {
                    console.log('Ошибка: HTTP ' + res.statusCode);
                    console.log(response.message);
                    console.log(response.documentation_url);
                    return;
                }
                this.responsesReceived++;
                callback(response);
            });
        });
        req.end();
    }
};
Object.defineProperty(httpClient, 'areResponsesReceived', {
    get: function () {
        return this.requestsSent === this.responsesReceived;
    },
    enumerable: true
});

var WordFrequency = function (text) {
    Object.defineProperty(this, 'join', {
        value: function (wordFreq) {
            var newWordFreq = new WordFrequency();
            newWordFreq = Object.assign(newWordFreq, this);
            for (var word in wordFreq) {
                var isSameRootFound = false;
                for (var _word in newWordFreq) {
                    if (this.isSameRootWord(word, _word)) {
                        newWordFreq[_word] += wordFreq[word];
                        isSameRootFound = true;
                        break;
                    }
                }
                if (!isSameRootFound) {
                    newWordFreq[word] = 1;
                }
            }
            return newWordFreq;
        }
    });
    Object.defineProperty(this, 'top', {
        value: function (number) {
            var mostUsedWords = [];
            for (var _word in this) {
                for (var i = 0; i < number; i++) {
                    var word = mostUsedWords[i];
                    if (this[word] > this[_word]) {
                        mostUsedWords.splice(i, 0, _word);
                        break;
                    }
                    if (i === mostUsedWords.length - 1) {
                        mostUsedWords.push(_word);
                        break;
                    }
                    if (word === undefined) {
                        mostUsedWords[i] = _word;
                        break;
                    }
                }
                if (mostUsedWords.length > number) {
                    mostUsedWords = mostUsedWords.slice(
                        mostUsedWords.length - number, mostUsedWords.length
                    );
                }
            }
            mostUsedWords.forEach(word => {
                console.log(word + '  ' + this[word]);
            });
        }
    });
    Object.defineProperty(this, 'count', {
        value: function (word) {
            for (var _word in this) {
                if (this.isSameRootWord(word, _word)) {
                    console.log(this[_word]);
                    return;
                }
            }
            console.log('Нет совпадений!');
        }
    });
    Object.defineProperty(this, 'isSameRootWord', {
        value: function (firstWord, secondWord) {
            var rootWordLength = 3;
            var i = 0;
            var j = rootWordLength;
            while (
                j <= firstWord.length &&
                i < firstWord.length / 2
            ) {
                j = i + rootWordLength;
                var rootWord = firstWord.slice(i, j);
                while (
                    secondWord.indexOf(rootWord) !== -1 &&
                    secondWord.indexOf(rootWord) < secondWord.length / 2 &&
                    j <= firstWord.length
                ) {
                    if (
                        rootWord.length >= firstWord.length / 2 ||
                        rootWord.length >= secondWord.length / 2
                    ) {
                        return true;
                    }
                    j++;
                    rootWord = firstWord.slice(i, j);
                }
                i++;
            }
            return false;
        }
    });
    if (text) {
        var pattern = /(?:[A-zА-яё]+)|(?:\<.*\>)|(?:\\[A-z])|(?:\:[A-z]+\:)/g;
        var validWordPatt = /(?:^[А-Яа-яё]{2,}$)/;
        var allWords = text.match(pattern);
        allWords.forEach(word => {
            var word = word.toLowerCase();
            if (validWordPatt.test(word) && badWords.indexOf(word) === -1) {
                for (var _word in this) {
                    if (this.isSameRootWord(_word, word)) {
                        this[_word]++;
                        return;
                    }
                }
                this[word] = 1;
            }
        });
    }
};

var getTasks = function (response) {
    response.forEach(function (task) {
        if (
            task.name.indexOf('verstka-tasks-') !== -1 ||
            task.name.indexOf('javascript-tasks-') !== -1
        ) {
            var readmePath = '/repos/urfu-2015/' + task.name + '/contents/README.md?ref=master';
            httpClient.sendHttpReq(readmePath, function (response) {
                var taskText = (new Buffer(response.content, 'base64')).toString('utf-8');
                var taskWordFreq = new WordFrequency(taskText);
                overallWordFreq = overallWordFreq.join(taskWordFreq);
                if (httpClient.areResponsesReceived) {
                    taskList.forEach(func => {
                        func();
                    });
                }
            });
        }
    });
};

var overallWordFreq = new WordFrequency();
httpClient.sendHttpReq('/orgs/urfu-2015/repos', getTasks);

module.exports.count = function (word) {
    if (httpClient.areResponsesReceived) {
        overallWordFreq.count(word);
    } else {
        taskList.push(
            function () {
                overallWordFreq.count(word);
            }
        );
    }
};

module.exports.top = function (number) {
    if (httpClient.areResponsesReceived) {
        overallWordFreq.top(number);
    } else {
        taskList.push(
            function () {
                overallWordFreq.top(number);
            }
        );
    }
};
