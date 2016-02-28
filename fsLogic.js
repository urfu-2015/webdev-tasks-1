/**
 * Created by savi on 27.02.16.
 */

const fs = require('fs');

/**
 * Функция, которая синхронно читает файл и возвращает прочитанное.
 * @param {string} fileName
 * @return {string} content
 */
function readFile(fileName) {
    var content;

    try {
        content = fs.readFileSync(fileName, 'utf-8');
    } catch (err) {
        console.error(err);
    }

    return content;
}

module.exports.readFile = readFile;
