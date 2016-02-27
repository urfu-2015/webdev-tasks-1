const fs = require('fs');
const co = require("co");
const r = require("co-request");
const natural = require('natural');
const all_word = require('./word.js');
const oauth_token = fs.readFileSync('.key', 'utf-8');


function getRequestDataGitAPI(query) {
    return {
        url: 'https://api.github.com/' + query + '?access_token=' + oauth_token,
        method: 'GET',
        headers: {
            'user-agent': 'webdev-tasks-1'
        }
    };
}

function clear_text(data) {
    var body = data.body;
    body = body.replace(/[^А-Яа-яЁё\- ]/g, ' ').toLowerCase();
    all_word.forEach(function (world) {
        body = body.replace(new RegExp(' ' + world + ' ', 'g'), ' ');
    });
    body = body.replace(/ [-,]{1,} /g, ' ').replace(/\s+/g, ' ');
    return body;
}

function getStat(text) {
    var all_world = text.toString().split(' ');
    var roots = {};
    all_world.forEach(function (item) {
        // TODO найти способ поиска более правельных корней
        var root = natural.PorterStemmerRu.stem(item);
        if (!roots[root]) {
            roots[root] = {
                cognate: [item],
                counter: 1
            };
        } else {
            ++roots[root].counter;
            if (roots[root].cognate.indexOf(item) < 0) {
                roots[root].cognate.push(item);
            }
        }
    });
    return roots;
}

var main = function (callback) {
    return co(
        function *() {
            var data = yield r(getRequestDataGitAPI('orgs/urfu-2015/repos'));
            var dataJSON = JSON.parse(data.body);
            var readme = '';
            var i = 0;
            for (i = 0; i < dataJSON.length; i++) {
                var repo = dataJSON[i].full_name;
                if (repo.indexOf('tasks') != -1) {

                    var data_repo = yield r(getRequestDataGitAPI('repos/' + repo + '/readme'));
                    var data_json_repo = JSON.parse(data_repo.body);

                    readme += clear_text(yield r(data_json_repo.download_url));
                }
            }
            return getStat(readme);
        }()
    ).then(callback);
};

module.exports.count = function (word, callback) {
    var root = natural.PorterStemmerRu.stem(word);
    var count = function (words) {
        return words[root];
    };
    return main(count);
};

module.exports.top = function (count, callback) {
    var top = function (words) {
        var keys = Object.keys(words);
        keys.sort(function (k1, k2) {
            return words[k2].counter - words[k1].counter;
        });
        var result = [];

        for (var i = 0; i < count; i++) {
            result.push(words[keys[i]]);
        }

        return result;
    };
    return main(top);
};
