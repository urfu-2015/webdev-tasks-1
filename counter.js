const request = require('request');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const Promise = require('promise');
const natural = require('natural');
const reduce = require('stream-reduce');

var commonWords = require('./commonWords.js');

const MIN_WORD_DISTANCE = 0.90;
const MAX_TOP_WORDS = 10;

var createSplitTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            var words = chunk.toString().split(/\s+|-|\//);
            words.forEach(function (word) {
                this.push(word);
            }, this);
            cb();
        }
    });
};

var createRemoveMarkdownTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            var text = chunk.toString()
                .replace(/<.+>/g, '') // теги
                .replace(/\[(.*)\]\(.+\)/g, '$1') // ссылки
                .replace(/^```.*\n((.*\n)+?)```$/gm, '') // код
                .replace(/[a-zA-Z_]+\.(js|html|css)/g, '') // имена файлов
                .replace(/(:.+:)/g, '');
            this.push(text);
            cb();
        }
    });
};

var createRemovePunctuationMarksTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            var text = chunk.toString().replace(/[\d«»–\[\].,№\/#\+!$%\^@&\*;"':{}|=\-_`~()]/g, '');
            this.push(text);
            cb();
        }
    });
};

var createToLowerCaseTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            var text = chunk.toString().toLowerCase();
            this.push(text);
            cb();
        }
    });
};

var createRemoveCommonWordsTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            var word = chunk.toString();
            if (commonWords.indexOf(word) < 0) {
                this.push(word);
            }
            cb();
        }
    });
};

var createStemmerTransform = function () {
    return new stream.Transform({
        transform: function (chunk, enc, cb) {
            this.push(natural.PorterStemmerRu.stem(chunk.toString()));
            cb();
        }
    });
};


var token = fs.readFileSync('key.txt');

var fetchFile = function (url, stream) {
    return new Promise(function (resolve, reject) {
        var options = {
            url: url,
            headers: {
                'User-Agent': 'request',
                Authorization: 'token ' + token
            }
        };

        request(options,
            function (err, res, body) {
                if (!err && res.statusCode === 200) {
                    const readme = JSON.parse(body);
                    stream.write(new Buffer(readme.content, 'base64').toString('utf-8'));
                    resolve();
                } else {
                    console.log(res.statusCode);
                    reject();
                }
            }
        );
    });
};

var fetchFiles = function (stream) {
    var promises = [];
    for (var i = 1; i <= 10; i++) {
        promises[i] = fetchFile('https://api.github.com/repos/urfu-2015/verstka-tasks-' +
            i + '/readme', stream);
    }
    Promise.all(promises).then(function () {
        stream.end();
    });
};

var count = function (word, callback) {
    var stem = natural.PorterStemmerRu.stem(word);
    var transform = createRemoveMarkdownTransform();
    transform.pipe(createSplitTransform())
        .pipe(createRemovePunctuationMarksTransform())
        .pipe(createToLowerCaseTransform())
        .pipe(createRemoveCommonWordsTransform())
        .pipe(createStemmerTransform())
        .pipe(reduce(function (acc, chunk) {
            var textWord = chunk.toString();
            if (natural.JaroWinklerDistance(textWord, stem) >= MIN_WORD_DISTANCE) {
                acc++;
            }
            return acc;
        }, 0).on('data', function (count) {
            callback(count);
        }));

    fetchFiles(transform);
};

var top = function (callback) {
    var transform = createRemoveMarkdownTransform();
    transform.pipe(createSplitTransform())
        .pipe(createRemovePunctuationMarksTransform())
        .pipe(createToLowerCaseTransform())
        .pipe(createRemoveCommonWordsTransform())
        .pipe(reduce(function (acc, chunk) {
            var word = chunk.toString();
            var stem = natural.PorterStemmerRu.stem(word);
            (acc[stem] || (acc[stem] = [])).push(word);
            return acc;
        }, {}).on('data', function (data) {

            var stems = Object.keys(data);

            for (var i = 0; i < stems.length; i++) {
                for (var j = i + 1; j < stems.length; j++) {
                    if (data[stems[i]] && data[stems[j]] &&
                        natural.JaroWinklerDistance(stems[i], stems[j]) >= MIN_WORD_DISTANCE) {
                        data[stems[i]] = data[stems[i]].concat(data[stems[j]]);
                        delete data[stems[j]];
                    }
                }
            }

            var sortedStems = Object.keys(data).map(function (stem) {
                return [data[stem].sort()[0], data[stem].length];
            }).sort(function (stemData1, stemData2) {
                return stemData2[1] - stemData1[1];
            }).slice(0, MAX_TOP_WORDS);

            callback(sortedStems);
        }));

    fetchFiles(transform);
};

module.exports.count = count;
module.exports.top = top;
