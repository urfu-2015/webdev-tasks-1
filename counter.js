const request = require('request');
const fs = require('fs');
const stream = require('stream');
const util = require('util');
const Promise = require('promise');
const natural = require('natural');
const reduce = require('stream-reduce');

var stopWords = require('./lib/stopWords');

try {
    var token = fs.readFileSync('./lib/key.txt');
} catch (e) {
    console.error(e.message);
}

const MIN_WORD_DISTANCE = 0.90;
const tagsRegExp = /<.+>/g;
const linksRegExp = /\[(.*)\]\(.+\)/g;
const codeRegExp = /^```.*\n((.*\n)+?)```$/gm;
const filenamesRegExp = /[a-zA-Z_]+\.(js|html|css)/g;
const emojiRegExp = /(:.+:)/g;

/**
 * Создание потока с преобразованием, разделяющего текст по словам
 *
 * @returns {Transform} поток, разделяющий текст по словам
 */
var createSplitTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        var words = chunk.toString().split(/\s+|-|\//);
        words.forEach(function (word) {
            this.push(word);
        }, this);
        cb();
    };
    return transform;
};

/**
 * Создание потока с преобразованием, удаляющего Markdown
 *
 * @returns {Transform} поток, удаляющий Markdown
 */
var createRemoveMarkdownTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        var text = chunk.toString()
            .replace(tagsRegExp, '')
            .replace(linksRegExp, '$1')
            .replace(codeRegExp, '')
            .replace(filenamesRegExp, '')
            .replace(emojiRegExp, '');
        this.push(text);
        cb();
    };
    return transform;
};

/**
 * Создание потока с преобразованием, удаляющего знаки препинания и цифры
 *
 * @returns {Transform} поток, удаляющий знаки препинания и цифры
 */
var createRemovePunctuationMarksTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        var text = chunk.toString().replace(/[^a-zа-яё]/g, '');
        this.push(text);
        cb();
    };
    return transform;
};

/**
 * Создание потока с преобразованием, приводящего текст к нижнему регистру
 *
 * @returns {Transform} поток, приводящий текст к нижнему регистру
 */
var createToLowerCaseTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        var text = chunk.toString().toLowerCase();
        this.push(text);
        cb();
    };
    return transform;
};

/**
 * Создание потока с преобразованием, удаляющего предлоги и союзы
 *
 * @returns {Transform} поток, удаляющий предлоги и союзы
 */
var createRemoveStopWordsTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        var word = chunk.toString();
        if (stopWords.indexOf(word) < 0) {
            this.push(word);
        }
        cb();
    };
    return transform;
};

/**
 * Создание потока с преобразованием, выделяющего корень слова
 *
 * @returns {Transform} поток, выделяющий корень слова
 */
var createStemmerTransform = function () {
    var transform = new stream.Transform();
    transform._transform = function (chunk, enc, cb) {
        this.push(natural.PorterStemmerRu.stem(chunk.toString()));
        cb();
    };
    return transform;
};

/**
 * Добавляет к transform потоки для очистки текста
 *
 * @param transform поток с преобразованием
 */
var addCleanTransforms = function (transform) {
    return transform.pipe(createSplitTransform())
        .pipe(createToLowerCaseTransform())
        .pipe(createRemovePunctuationMarksTransform())
        .pipe(createRemoveStopWordsTransform());
};

/**
 * Асинхронная загрузка файла по указанному url в stream
 *
 * @param url адрес файла
 * @param stream поток, в который будет записан файл
 * @returns {Promise} Promise, который будет выполнен, когда будет загружен файл
 */
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
                    console.error([res.statusCode, options.url, res.statusMessage].join(' '));
                    reject();
                }
            }
        );
    });
};

/**
 * Асинхронная загрузка всех файлов и завершение потока, когда все файлы загружены
 *
 * @param stream поток, в который будет записан файл
 */
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

/**
 * Возвращает число повторений данного слова
 *
 * @param word слово, число повторений которого нужно найти
 * @param callback функция, которая будет вызвана с результатом вычислений
 */
var count = function (word, callback) {
    var stem = natural.PorterStemmerRu.stem(word);
    var transform = createRemoveMarkdownTransform();
    addCleanTransforms(transform)
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

/**
 * Возвращает топ n слов
 *
 * @param n количество слов в топе
 * @param callback функция, которая будет вызвана с результатом вычислений
 */
var top = function (n, callback) {
    var transform = createRemoveMarkdownTransform();
    addCleanTransforms(transform)
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
            }).slice(0, n);

            callback(sortedStems);
        }));

    fetchFiles(transform);
};

module.exports = {count: count, top: top};
