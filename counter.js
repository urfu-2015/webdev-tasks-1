'use strict';
const fs = require('fs');
const natural = require('natural');
const promise = require('promise');

const configs = {
    names: ['verstka-tasks-', 'javascript-tasks-'],
    count: 10,
    disallowedWords : ['при', 'на', 'в', 'к', 'без', 'до', 'из', 'по', 'о', 'от',
        'перед', 'через', 'с', 'у', 'за', 'над', 'об', 'под', 'про', 'для', 'и', 'но',
        'а', 'или', 'не', 'же', 'это', 'как', 'если', 'вы', 'он', 'они', 'я', 'мы']
};
try {
    var token = fs.readFileSync('key.txt', 'utf-8');
} catch (error) {
    console.log(error.message);
}

/**
 * Выводит n слов, наиболее часто встречающихся в тексте
 * @param n количество слов
 */
function top(n) {
    var readmes = [];
    var dictionary = {};
    promise.all(getReadmePromises(readmes)).then(() => {
        let readmeWords = removeDisallowedSymbols(readmes);
        fillDictionary(readmeWords, dictionary);
        let sortedWords;
        sortedWords = Object.keys(dictionary).sort((word1, word2) => {
            if (dictionary[word1] === dictionary[word2]) {
                return 0;
            }
            return dictionary[word1] < dictionary[word2] ? 1 : -1;
        });

        for (let i = 0; i < n; i++) {
            console.log(`${sortedWords[i]} ${dictionary[sortedWords[i]]}`);
        }
    },
    (err) => {
        console.log(err.message);
    });
}

/**
 * Выводит сколько раз слово word встретилось в тексте
 * @param word искомое слово
 */
function count(word) {
    var readmes = [];
    var wordCount = 0;
    promise.all(getReadmePromises(readmes)).then(() => {
        let readmeWords = removeDisallowedSymbols(readmes);
        readmeWords.forEach((readmeWord) => {
            let readmeWordStem = natural.PorterStemmerRu.stem(readmeWord);
            let wordStem = natural.PorterStemmerRu.stem(word);

            if (readmeWordStem === wordStem) {
                wordCount++;
            }
        });
        console.log(wordCount);
    },
    (err) => {
        console.log(err.message);
    });
}

/**
 * Возвращает промисы для получения всех ридми и записи их в readmes
 * @param readmes массив, в который будут записаны ридми
 * @returns {Array}
 */
function getReadmePromises (readmes) {
    let promises = [];
    configs.names.forEach((repo) => {
        for (let i = 1; i <= configs.count; i++) {
            let repoPath = `${repo}${i}`;
            promises.push(getReadmePromise(repoPath, readmes));
        }
    });
    return promises;
}

/**
 * Возвращает промис для асинхронной загрузки одного ридми по указанному пути
 * и записывает в readmes
 * @param repoPath путь, по которому доступен ридми
 * @param readmes массив, в который будут записаны ридми
 * @returns {Promise}
 */
function getReadmePromise(repoPath, readmes) {
    return new promise ((resolve, reject) => {
        const https = require('https');
        let str = '';
        https
        .request({
            hostname: 'api.github.com',
            port: 443,
            path: `/repos/urfu-2015/${repoPath}/readme?access_token=${token}`,
            headers: {
                'User-Agent': 'web-dev-task-1'
            }
        })
        .on('response', (response) => {
            response.on('data', (chunk) => {
                str += chunk;
            });
            response.on('end', () => {
                let readme64;
                try {
                    readme64 = JSON.parse(str).content;
                    readmes.push(new Buffer(readme64, 'base64').toString('utf-8'));
                }
                catch (err) {
                    reject(err);
                }
                resolve();
            });
        })
        .on('error', (err) => {
            reject(err);
        })
        .end()
    });
}

/**
 * Удаляет из readmes все запрещённые символы и слова
 * @param readmes ридми
 * @returns {Array} массив оставшихся слов
 */
function removeDisallowedSymbols(readmes) {
    let newReadme = [];
    readmes.forEach((readme) => {
        readme = readme.toLowerCase();
        let symblos = /[^а-яА-ЯёЁ]/;
        newReadme = newReadme.concat(readme
            .split(symblos)
            .filter((item) => {
                return item && configs.disallowedWords.indexOf(item) < 0;
            }));
    });
    return newReadme;
}

/**
 * Создаёт словарь, показывающий, сколько раз
 * слова встречаются в тексте
 * @param readmes
 * @param dictionary
 */
function fillDictionary(readmes, dictionary) {
    if (Object.keys(dictionary).length === 0) {
        dictionary[readmes[0]] = 1;
    }
    readmes.forEach((word) => {
        let hasCognate = false;
        let keys = Object.keys(dictionary);

        for (let i = 0; i < keys.length; i++) {
            let keyStem = natural.PorterStemmerRu.stem(keys[i]);
            let wordStem = natural.PorterStemmerRu.stem(word);

            if (keyStem === wordStem) {
                dictionary[keys[i]]++;
                hasCognate = true;
                break;
            }
        }
        if (!hasCognate) {
            dictionary[word] = 1;
        }
    });
}

module.exports = {
    top: top,
    count: count
};
