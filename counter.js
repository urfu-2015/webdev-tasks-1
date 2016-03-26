'use strict';
const https = require('https');
const fs = require('fs');
const stemmer = require('natural').PorterStemmerRu;
const Promise = require('promise');

const configs = {
    names: ['verstka-tasks-', 'javascript-tasks-'],
    count: 10,
    disallowedWords: ['при', 'на', 'в', 'к', 'без', 'до', 'из', 'по', 'о', 'от',
        'перед', 'через', 'с', 'у', 'за', 'над', 'об', 'под', 'про', 'для', 'и', 'но',
        'а', 'или', 'не', 'же', 'это', 'как', 'если', 'вы', 'он', 'они', 'я', 'мы', 'то']
};
try {
    var token = fs.readFileSync('key.txt', 'utf-8').replace(/[^a-z0-9]/, '');
} catch (error) {
    console.log(error.message);
}

/**
 * Выводит n слов, наиболее часто встречающихся в тексте
 * @param n количество слов
 */
const top = (n) => {
    let readmes = [];
    let dictionary = {};

    Promise.all(getReadmePromises(readmes)).then(() => {
        let readmeWords = removeDisallowedSymbols(readmes);

        fillDictionary(readmeWords, dictionary);
        printFirstN(dictionary, n);
    },
    (err) => {
        console.log(err.message);
    });
};

/**
 * Выводит сколько раз слово word встретилось в тексте
 * @param word искомое слово
 */
const count = (word) => {
    let readmes = [];
    let wordCount = 0;

    Promise.all(getReadmePromises(readmes)).then(() => {
        let readmeWords = removeDisallowedSymbols(readmes);

        readmeWords.forEach((readmeWord) => {
            let readmeWordStem = stemmer.stem(readmeWord);
            let wordStem = stemmer.stem(word);

            if (readmeWordStem === wordStem) {
                wordCount++;
            }
        });
        console.log(wordCount);
    },
    (err) => {
        console.log(err.message);
    });
};

/**
 * Соритрует dictionary и выводит n чаще встречающихся сов
 * @param dictionary
 * @param n
 */
const printFirstN = (dictionary, n) => {
    let sortedWords = Object.keys(dictionary).sort((i, j) => {
        return (dictionary[i] < dictionary[j]) ? 1 : -1;
    });

    for (n; n--;) {
        console.log(`${sortedWords[n]} ${dictionary[sortedWords[n]]}`);
    }
};

/**
 * Возвращает промисы для получения всех ридми и записи их в readmes
 * @param readmes массив, в который будут записаны ридми
 * @returns {Array}
 */
const getReadmePromises = (readmes) => {
    let promises = [];

    configs.names.forEach((repo) => {
        for (let i = 1; i <= configs.count; i++) {
            let repoPath = `${repo}${i}`;

            promises.push(getReadmePromise(repoPath, readmes));
        }
    });
    return promises;
};

/**
 * Возвращает промис для асинхронной загрузки одного ридми по указанному пути
 * и записывает в readmes
 * @param repoPath путь, по которому доступен ридми
 * @param readmes массив, в который будут записаны ридми
 * @returns {Promise}
 */
const getReadmePromise = (repoPath, readmes) => {
    return new Promise((resolve, reject) => {
        let str = '';

        https
        .request({
            hostname: 'api.github.com',
            path: `/repos/urfu-2015/${repoPath}/readme?access_token=${token}`,
            headers: {
                'User-Agent': 'valeriyan'
            }
        },
        (response) => {
            response.on('data', (chunk) => {
                str += chunk;
            });
            response.on('end', () => {
                try {
                    let readme64 = JSON.parse(str).content;

                    readmes.push(new Buffer(readme64, 'base64').toString('utf-8'));
                } catch (err) {
                    console.log(`response code: ${response.statusCode}`);
                    reject(err);
                }
                resolve();
            });
        })
        .on('error', (err) => {
            reject(err);
        })
        .end();
    });
};

/**
 * Удаляет из readmes все запрещённые символы и слова
 * @param readmes ридми
 * @returns {Array} массив оставшихся слов
 */
const removeDisallowedSymbols = (readmes) => {
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
};

/**
 * Создаёт словарь, показывающий, сколько раз
 * слова встречаются в тексте
 * @param readmes
 * @param dictionary
 */
const fillDictionary = (readmes, dictionary) => {
    if (Object.keys(dictionary).length === 0) {
        dictionary[readmes[0]] = 1;
    }
    readmes.forEach((word) => {
        let hasCognate = false;
        let keys = Object.keys(dictionary);

        for (let i = 0; i < keys.length; i++) {
            let keyStem = stemmer.stem(keys[i]);
            let wordStem = stemmer.stem(word);

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
};

module.exports = {
    top: top,
    count: count
};
