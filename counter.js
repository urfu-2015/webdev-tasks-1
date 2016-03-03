'use strict';
const rp = require('request-promise');
const fs = require('fs');
const natural = require('natural');
const url = require('url');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const frequencyDict = [];
const deferredAction = [];
const stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));
const GIT_URL = 'api.github.com';

/**
 * Возвращает Promise, который при завершении без ошибок возвращает топ n слов
 * @param {Number} n - количестов слов, которые нужно вернуть
 * @returns {Promis} promise
 */
exports.top = (n) => generatePromis(hiddenTop, n);

/**
 * Возвращает Promise, который при завершении без ошибок возвращает
 * количество однокоренных с word слов
 * @param {String} word - слово для поиска
 * @returns {Promis} promise
 */
exports.count = (word) => generatePromis(hiddenCount, word);

let address = url.format({
    protocol: 'https',
    host: GIT_URL,
    pathname: '/orgs/urfu-2015/repos',
    search: '?access_token=' + OAUTH_TOKEN
});
let options = {
    uri: address,
    headers: {
        'User-Agent': 'request'
    },
    transform: promisesFromBody
};

//главный промис, который завершается без ошибок только при успешной обработке всех данных,
//иначе вызывается handleError
let promise = rp(options).then(
    promises => Promise.all(promises).then(
        allTexts =>
            processingText(allTexts),
        handleError
    ),
    handleError
);

/**
 * Формируем и возвращает массив промисов,
 * каждый из промисов обрабатывает один запрос к README подходящего по имени репозитория.
 * @param {Json} body - список репозиториев полцченный
 * @returns {Array} promises - массив промисов
 */
function promisesFromBody(body) {
    let repos = JSON.parse(body);
    return repos.reduce((promises, rep) => {
        if (isAppropriateRepos(rep.name)) {
            promises.push(processingREADME(rep.name));
        }
        return promises;
    }, []);
}

/**
 * Обработчик ошибок
 * @param {error} error - ошибка
 */
function handleError(error) {
    console.log(error);
}

/**
 * Проверяет имеет ли репозиторий нужное название
 * @param {String} reposName - имя репозитория
 * @returns {bool} true если, имя репозитория подходит, иначе false
 */
function isAppropriateRepos(reposName) {
    return reposName.indexOf('verstka-tasks') !== -1 ||
        reposName.indexOf('javascript-tasks') !== -1;
}

/**
 * Формирует и возвращает промис внутри которого происходит запрос
 * к Readme репозитория с именем name
 * @param {String} name - имя репозитория
 * @returns {Promise} промис с запросом к README репозитория name
 */
function processingREADME(name) {
    let options = {
        uri: urlForReadme(name),
        headers: {
            'User-Agent': 'request'
        },
        transform: (body) =>
            JSON.parse(body).content
    };
    return rp(options);
}

/**
 * формирует url запроса для обращения к README репозитория с именем reposName
 * @param {String} reposName - имя репозитория
 * @returns {String} url
 */
function urlForReadme(reposName) {
    return url.format({
        protocol: 'https',
        host: GIT_URL,
        pathname: '/repos/urfu-2015/' + reposName + '/readme',
        search: '?access_token=' + OAUTH_TOKEN
    });
}

/**
 * Обрабатывет массив из закодированных текстов и заполняет по ним частотный словарь
 * @param {String} encodedTexts - массив закодированныйх в base64 текстов
 */
function processingText(encodedTexts) {
    let decodeText = encodedTexts.reduce((decodeText, text) => {
        return decodeText += new Buffer(text, 'base64').toString();
    }, '');
    decodeText = decodeText
        .replace(/[^ЁёА-я \n]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ');
    let cleanText = decodeText.reduce((cleanText, word) => {
        if (stopWords.indexOf(word) === -1) {
            cleanText.push(word);
        }
        return cleanText;
    }, []);
    addWordArrayToDict(cleanText);
}

/**
 * Создает экземпляр Word.
 * @constructor
 * @param {String} word слово
 * @this {Word}
 */
let Word = function (word) {
    this.root = natural.PorterStemmerRu.stem(word);
    this.fullWord = word;
    this.count = 1;
    this.toString = () => [this.fullWord, this.count].join(' ');
};

/**
 * Проверяет являются ли слова word1 и word2 однокоренными
 * @param {String} word1 - первое слово
 * @param {String} word1 - второе слово
 * @returns {bool} true если, слова однокоренные, иначе false
 */
function isCognates(word1, word2) {
    return natural.JaroWinklerDistance(word1, word2) > 0.85;
}

/**
 * Добавляет массив слов в частотный словарь
 * @param {Array} wordArray - массив слов
 */
function addWordArrayToDict(wordArray) {
    wordArray.forEach(addWordToDict);
}

/**
 * Добавляет слово в частотный словарь
 * @param {String} word - слово
 */
function addWordToDict(word) {
    for (let j = 0; j < frequencyDict.length; j++) {
        if (isCognates(word, frequencyDict[j].root)) {
            frequencyDict[j].count++;
            return;
        }
    };
    frequencyDict.push(new Word(word));
}

/**
 * Возвращает Promise, который при завершении без ошибок возвращает результат вызова callback
 * с аргументом arg
 * @param {Function} callback - функция для которая выполняется после сбора всех данных
 * @param {String|Number} arg - аргумент с которым вызывается callback
 * @returns {Promis} promise
 */
function generatePromis(callback, arg) {
    deferredAction.push(function (i) {
        return () => callback(i);
    }(arg));
    return promise.then(
        () => deferredAction.shift()(),
        error => console.log(error)
    );
}

/**
 * Возвращает топ n слов
 * @param {Number} n - количество слов, которые нужно вернуть
 * @returns {String} топ n слов в формате '[word] [numberOfWord]/n'
 */
function hiddenTop(n) {
    frequencyDict.sort(compare).reverse();
    let result = [];
    for (let i = 0, length = Math.min(n, frequencyDict.length); i < length; i++) {
        result.push(frequencyDict[i]);
    };
    return result.join('\n');
}

/**
 * Возвращает количество слов однокоренных с word
 * @param {String} word - слово для вывода статистики
 * @returns {String} найденное количесво однокоренных слов или сообщение, что таких не найдено
 */
function hiddenCount(word) {
    for (let i = 0; i < frequencyDict.length; i++) {
        if (isCognates(word, frequencyDict[i].root)) {
            return frequencyDict[i].count;
        }
    }
    return 'word is not found';
}

function compare(a, b) {
    return a.count - b.count;
};
