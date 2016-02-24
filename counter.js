const fs = require('fs'); // Модуль для работы с файловой системой
const syncRequest = require('sync-request'); // Модуль для синхронных запросов по http/https

const GIT_HUB_API = 'https://api.github.com'; // Название говорит само за себя
const KEY = readFile('key.txt');
const MAIN_REPO = 'urfu-2015'; // Сам репозиторий
const JS_TASKS_PREFIX = 'javascript-tasks-'; // Префикс для JS тасков
const VERSTKA_TASKS_PREFIX = 'verstka-tasks-'; // Префикс для верстка тасков

// Число тасков
const NUMBER_TASKS = 10;

var JSTasks;
var VerstkaTasks;
var tasks;
// Проверка - скачены ли таски
var downloaded = false;
// Кэш: слово - корень
var cache = {};
// Использованные корни
var usedRoots = [];

// С помощью этой супер штуки мы разберем слово и получим его корень
const ONLINE_DICT_HOST = 'http://vnutrislova.net';
const ONLINE_DICT_PATH = '/разбор/по-составу/';

// Регвыр для вытаскивания корня
const ROOT_REGEXP = new RegExp('корень \\[(.*?)\\]');

// Файл с союзами
const UNIONS = 'unions.txt';
// Файл с предлогами
const PREPOSITIONS = 'prepositions.txt';
// Файл со знаками препинания
const PUNCTUATION_MARKS = 'punctuationMarks.txt';

// Регулярка для англоязычных слов
const ENGLISH_LETTERS_REGEXP = new RegExp('[a-z]');
// Регулярка для цифр
const NUMBERS_REGEXP = new RegExp('[0-9]');
// Регулярка для русского алфавита, если есть что-то кроме, что мы забыли удалить
const RUSSIAN_LETTERS_REGEXP = new RegExp('[^а-я]');

/**
 * @author Savi
 * Метод, который синхронно читает файл и возвращает прочитанное.
 * @param {string} fileName
 * @return {string} content
 */
function readFile(fileName) {
    var content = undefined;

    try {
        content = fs.readFileSync(fileName, 'utf-8');
    } catch (err) {
        console.log(err);
    }

    return content;
}

/**
 * @author Savi
 * Метод, который синхронно делает запрос по протоколу http/https и возвращает тело странички.
 * @param {string} typeReq
 * @param {string} addr
 * @return {string} content
 */
function doRequestSync(typeReq, addr) {
    var content = undefined;

    try {
        var res = syncRequest(typeReq, encodeURI(addr), {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        if (res['statusCode'] === 200) {
            content = res.getBody('utf-8');
        }
    } catch (err) {
        console.log(err);
    }

    return content;
}

/**
 * @author Savi
 * Метод просто парсит ответ от API GitHub в человеко-понятный вид.
 * @param {string} res
 * @return {string} parsedContent
 */
function parseAPIResponse(res) {
    var parsedContent = undefined;
    var parsedRes = JSON.parse(res);

    try {
        parsedContent = new Buffer(parsedRes['content'], parsedRes['encoding']).toString('utf-8');
    } catch (err) {
        console.log(err);
    }

    return parsedContent;
}

/**
 * @author Savi
 * Метод, который получает содержимое README.md из репозитория urfu-2015 для какой-либо папки.
 * @param {string} prefix
 * @param {string} number
 * @return {string} parsedContent
 */
function getReadme(prefix, number) {
    var content = doRequestSync('GET', GIT_HUB_API + '/repos/' + MAIN_REPO + '/' + prefix + number +
        '/readme' + '?access_token=' + KEY);

    return parseAPIResponse(content);
}

/**
 * @author Savi
 * Метод, который просто выкачивает нужные таски в зависимости от префикса и парсит их.
 * @param {string} prefix
 * @return {object} CourseTasks
 */
function getTasks(prefix) {
    var prepositionsList = readFile(PREPOSITIONS).split('\n');
    var unionsList = readFile(UNIONS).split('\n');
    var punctuationMarksList = readFile(PUNCTUATION_MARKS).split('\n');

    var CourseTasks = {};

    for (var i = 1; i <= NUMBER_TASKS; i++) {
        // Получаем таски
        CourseTasks[(i - 1).toString()] = getReadme(prefix, i.toString()).toLowerCase();
        CourseTasks[(i - 1).toString()] = removeSymbols(prepositionsList,
            CourseTasks[(i - 1).toString()], true);
        CourseTasks[(i - 1).toString()] = removeSymbols(unionsList,
            CourseTasks[(i - 1).toString()], true);
        CourseTasks[(i - 1).toString()] = removeSymbols(punctuationMarksList,
            CourseTasks[(i - 1).toString()]);
        CourseTasks[(i - 1).toString()] = smartAnalyzer(CourseTasks[(i - 1).toString()]);
    }

    return CourseTasks;
}

/**
 * @author Savi
 * Метод, который удаляет все ненужные нам символы из текста.
 * @param {array} list
 * @param {string} text
 * @param {boolean} word
 * @return {string} newText
 */
function removeSymbols(list, text, word) {
    var newText = text;
    list.forEach(function (item) {
        if (word) {
            if (item.length <= 3) {
                newText = newText.replace(new RegExp('\\s' + item + '\\s', 'g'), ' ');
            } else {
                newText = newText.replace(new RegExp(item + '\\s', 'g'), ' ');
            }
        } else {
            newText = newText.replace(new RegExp('\\' + item, 'g'), ' ');
        }
    });

    return newText;
}

/**
 * @author Savi
 * Метод, который анализирует текст и удаляет из него английские слова, цифры и то что не входит
 * в русской алфавит, либо то, что короче 3х символов.
 * @param {string} text
 * @return {array} newTextList
 */
function smartAnalyzer(text) {
    var newText = text.split(' ');
    var newTextList = [];
    newText.forEach(function (item) {
        item = item.replace(new RegExp('\n', 'g'), '');
        if ((item.length >= 3) && (!ENGLISH_LETTERS_REGEXP.test(item)) &&
            (!NUMBERS_REGEXP.test(item)) && (!RUSSIAN_LETTERS_REGEXP.test(item))) {
            newTextList.push(item);
        }
    });

    return newTextList;
}

/**
 * @author Savi
 * Метод, который делает (синхронный) запрос к онлайн словарю и возвращает корень слова.
 * @param {string} word
 * @return {string} root
 */
function getWordRoot(word) {
    var root = word;

    var res = doRequestSync('GET', ONLINE_DICT_HOST + ONLINE_DICT_PATH + word);

    if ((res !== undefined) && (ROOT_REGEXP.exec(res) !== null)) {
        root = ROOT_REGEXP.exec(res)[1];
    }

    return root;
}

/**
 * @author Savi
 * Метод, который получает на вход слово (возможно корень) и подсчитывает все его вхождения,
 * учитывая однокоренные слова.
 * @param {string} word
 * @param {string} argRoot
 * @param {boolean} top
 * @return {object} result
 */
module.exports.count = function (word, argRoot, top) {
    var LCWord = word.toLowerCase();
    var root;

    if (argRoot !== undefined) {
        root = argRoot;
        cache[LCWord] = root;
        usedRoots.push(root);
    } else {
        root = getWordRoot(LCWord);
        cache[LCWord] = root;
        usedRoots.push(root);
    }

    var tempRoot;

    var result = 0;

    if (!downloaded) {
        downloaded = true;
        JSTasks = getTasks(JS_TASKS_PREFIX);
        VerstkaTasks = getTasks(VERSTKA_TASKS_PREFIX);
        tasks = mergeDicts(JSTasks, VerstkaTasks);
    }

    for (var i = 0; i < Object.keys(tasks).length; i++) {
        tasks[i].forEach(function (item) {
            if (item in cache) {
                if (cache[item] === root) {
                    result++;
                }
            } else {
                tempRoot = getWordRoot(item);
                cache[item] = tempRoot;
                if (tempRoot === root) {
                    result++;
                }
            }
        });
    }

    if (!top) {
        console.log(result);
    }

    return result;
};

/**
 * @author Savi
 * Метод, который выводит top n слов.
 * @param {number} n
 */
module.exports.top = function (n) {
    if (!downloaded) {
        downloaded = true;
        JSTasks = getTasks(JS_TASKS_PREFIX);
        VerstkaTasks = getTasks(VERSTKA_TASKS_PREFIX);
        tasks = mergeDicts(JSTasks, VerstkaTasks);
    }

    var result = {};
    var tempRoot;

    for (var i = 0; i < Object.keys(tasks).length; i++) {
        tasks[i].forEach(function (item) {
            if (!(item in cache)) {
                tempRoot = getWordRoot(item);
            } else {
                tempRoot = cache[item];
            }
            if (usedRoots.indexOf(tempRoot) === -1) {
                result[item] = module.exports.count(item, tempRoot, true);
            }
        });
    }

    var sortableRes = [];
    for (var word in result) {
        sortableRes.push([word, result[word]]);
    }
    sortableRes.sort(function (a, b) {
        return a[1] - b[1];
    });

    prettyPrint(sortableRes.reverse().slice(0, n));
};

/**
 * @author Savi
 * Метод, который производит слияние двух словарей.
 * @param dictF
 * @param dictS
 * @returns {object} dict
 */
function mergeDicts(dictF, dictS) {
    var dict = {};
    var counter = 0;

    for (var keyF in dictF) {
        dict[counter] = dictF[keyF];
        counter++;
    }
    for (var keyS in dictS) {
        dict[counter] = dictS[keyS];
        counter++;
    }

    return dict;
}

/**
 * @author Savi
 * Просто красивый вывод.
 * @param {array} list
 */
function prettyPrint(list) {
    list.forEach(function (item) {
        console.log(item[0].toString() + ': ' + item[1].toString());
    });
}