const async = require('async');
const GitHubApi = require('github');
const natural = require('natural');
const config = require('./config');

const githubConfig = config.githubConfig;
const stopWords = config.stopWords;
const repoRegExp = new RegExp(githubConfig.repoRegExp);
const wordRegExp = new RegExp(config.wordRegExp);

module.exports.top = function (n, callback) {
    applyToStats(
        (stats, cb) => {
            getTop(stats, n, cb);
        },
        callback
    );
};

module.exports.count = function (word, callback) {
    applyToStats(
        (stats, cb) => {
            getWordCount(stats, word, cb);
        },
        callback
    );
};

function applyToStats(func, callback) {
    async.waterfall([
        getGithub,
        getRepos,
        getReadmesStats,
        mergeStats,
        func
    ], callback);
}

function getGithub(callback) {
    var github = new GitHubApi({
        version: '3.0.0'
    });

    github.authenticate({
        type: 'oauth',
        token: githubConfig.token
    });
    callback(null, github);
}

function getRepos(github, callback) {
    github.repos.getFromOrg(
        {
            org: githubConfig.orgname
        },
        (error, repos) => {
            if (error) {
                callback(error, null);
                return;
            }
            var repoNames = repos.map(getRepoName).filter(repoIsMatching);
            callback(null, github, repoNames);
        }
    );
}

function getRepoName(repo) {
    return repo.name;
}

function repoIsMatching(repoName) {
    return repoRegExp.test(repoName);
}

function getReadmesStats(github, repos, callback) {
    async.map(
        repos,
        (repo, cb) => {
            getReadmeStats(github, repo, cb);
        },
        callback
    );
}

function getReadmeStats(github, repo, callback) {
    async.waterfall([
        (cb) => {
            getReadme(github, repo, cb);
        },
        countWords
    ], callback);
}

function getReadme(github, repo, callback) {
    github.repos.getReadme(
        {
            user: githubConfig.orgname,
            repo: repo
        },
        (error, data) => {
            if (error) {
                callback(error, null);
                return;
            }
            var readme = (new Buffer(data.content, 'base64')).toString();
            callback(null, readme);
        }
    );
}

function countWords(readme, callback) {
    var stats = {
        rootCount: {},
        rootToWord: {}
    };
    var tokenizer = new natural.AggressiveTokenizerRu();
    var words = tokenizer.tokenize(readme);

    words.forEach((word) => {
        word = word.toLowerCase();
        if (isRussian(word) && !isStopWord(word)) {
            var root = natural.PorterStemmerRu.stem(word);
            if (stats.rootCount[root] === undefined) {
                stats.rootCount[root] = 0;
                stats.rootToWord[root] = word;
            }
            stats.rootCount[root]++;
        }
    });
    callback(null, stats);
}

function isRussian(word) {
    return wordRegExp.test(word);
}

function isStopWord(word) {
    return stopWords[word];
}

function mergeStats(statsList, callback) {
    var mergedStats = {
        rootCount: {},
        rootToWord: {}
    };

    statsList.forEach((stats) => {
        Object.keys(stats.rootCount).forEach((root) => {
            if (mergedStats.rootCount[root] === undefined) {
                mergedStats.rootCount[root] = 0;
                mergedStats.rootToWord[root] = stats.rootToWord[root];
            }
            mergedStats.rootCount[root] += stats.rootCount[root];
        });
    });
    callback(null, mergedStats);
}

function getTop(stats, n, callback) {
    var roots = Object.keys(stats.rootCount);

    roots.sort((a, b) => {
        return stats.rootCount[b] - stats.rootCount[a];
    });
    var top = roots.slice(0, n).map((root, i) => {
        return {
            word: stats.rootToWord[root],
            count: stats.rootCount[root]
        };
    });
    callback(null, top);
}

function getWordCount(stats, word, callback) {
    var root = natural.PorterStemmerRu.stem(word);

    if (stats.rootCount[root] === undefined) {
        callback(null, 0);
    }
    callback(null, stats.rootCount[root]);
}
