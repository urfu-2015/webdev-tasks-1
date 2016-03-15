'use strict';
const rp = require('request-promise');
const fs = require('fs');
const _ = require('lodash');
const natural = require('natural');
const url = require('url');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const freqDict = [];
const deferredAction = [];
const urljoin = require('url-join');
const config =  JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));

/**
 * Возвращает Promise, который при завершении без ошибок возвращает топ n слов
 * @param {Number} n - количестов слов, которые нужно вернуть
 * @returns {Promis} promise
 */
exports.top = (n) => generatePromise(hiddenTop, n);

/**
 * Возвращает Promise, который при завершении без ошибок возвращает
 * количество однокоренных с word слов
 * @param {String} word - слово для поиска
 * @returns {Promis} promise
 */
exports.count = (word) => generatePromise(hiddenCount, word);

let address = url.format({
    protocol: config.protocol,
    host: config.host,
    pathname: urljoin('orgs', config.repName, 'repos'),
    query: {
        [config.oauthQuery]: OAUTH_TOKEN 
    }
});
let options = {
    uri: address,
    headers: config.headers,
    transform: promisesFromBody
};

//главный промис, который завершается без ошибок только при успешной обработке всех данных,
//иначе вызывается handleError
let promise = rp(options).then(
    promises => Promise.all(promises).then(
        allTexts => processingText(allTexts),
        handleError
    ),
    handleError
);

/**
 * Формируем и возвращает массив промисов,
 * каждый из промисов обрабатывает один запрос к README подходящего по имени репозитория.
 * @param {Json} body - список репозиториев
 * @returns {Array} promises - массив промисов
 */
function promisesFromBody(body) {
    let repos = JSON.parse(body);
    return repos.reduce((promises, rep) => {
        if (isAppropriateRep(rep.name)) {
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
    console.error(error);
}

/**
 * Проверяет имеет ли репозиторий нужное название
 * @param {String} reposName - имя репозитория
 * @returns {bool} true если, имя репозитория подходит, иначе false
 */
function isAppropriateRep(reposName) {
    return /tasks/.test(reposName);
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
        headers: config.headers,
        transform: (body) =>
            JSON.parse(body).content
    };
    return rp(options);
}

/**
 * формирует url запроса для обращения к README репозитория с именем taskName
 * @param {String} taskName - имя репозитория
 * @returns {String} url
 */
function urlForReadme(taskName) {
    return url.format({
        protocol: config.protocol,
        host: config.host,
        pathname: urljoin('repos', config.repName, taskName, 'readme'),
        query: {
            [config.oauthQuery]: OAUTH_TOKEN 
        }
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
    let cleanText = _.filter(decodeText, word => stopWords.indexOf(word) === -1);
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
 * @returns {bool} true, если слова однокоренные, иначе false
 */
function areCognates(word1, word2) {
    return natural.JaroWinklerDistance(word1, word2) > 0.85;
}

/**
 * Возвращает объект Word из freqDict, который содержит слово однокоренное к word
 * @param {String} word - слово
 * @returns {Word|null} объект Word, если слово найдено, иначе null
 */
function takeCognate(word) {
    return _.find(freqDict, obj => areCognates(word, obj.fullWord)) || null;
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
    let cognate = takeCognate(word);
    cognate ? cognate.count++ : freqDict.push(new Word(word));
}

/**
 * Возвращает Promise, который при завершении без ошибок возвращает результат вызова callback
 * с аргументом arg
 * @param {Function} callback - функция для которая выполняется после сбора всех данных
 * @param {String|Number} arg - аргумент с которым вызывается callback
 * @returns {Promis} promise
 */
function generatePromise(callback, arg) {
    deferredAction.push(function (i) {
        return () => callback(i);
    }(arg));
    return promise.then(
        () => deferredAction.shift()(),
        handleError
    );
}

/**
 * Возвращает топ n слов
 * @param {Number} n - количество слов, которые нужно вернуть
 * @returns {String} топ n слов в формате '[word] [numberOfWord]/n'
 */
function hiddenTop(n) {
    return _(freqDict)
        .orderBy('count', 'desc')
        .take(n)
        .value()
        .join('\n');
}

/**
 * Возвращает количество слов однокоренных с word
 * @param {String} word - слово для вывода статистики
 * @returns {String} найденное количесво однокоренных слов или сообщение, что таких не найдено
 */
function hiddenCount(word) {
    let cognate = takeCognate(word);
    return cognate ? cognate.count : 'word is not found';
}
