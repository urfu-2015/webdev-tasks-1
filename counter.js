const async = require('async');
const GitHubApi = require('github');
const natural = require('natural');
const config = require('./config');

const githubConfig = config.githubConfig;
const stopWords = config.stopWords;
const repoRegExp = githubConfig.repoRegExp;
const wordRegExp = config.wordRegExp;

var statsCashe = {};
var statsCashed = false;

module.exports.top = (n, callback) => {
    getStats((error, stats) => {
        if (error) {
            console.log(error);
            return;
        }

        getTop(stats, n, callback);
    });
};

module.exports.count = (word, callback) => {
    getStats((error, stats) => {
        if (error) {
            console.log(error);
            return;
        }

        getWordCount(stats, word, callback);
    });
};

function getStats(callback) {
    if (statsCashed) {
        callback(null, statsCashed);
        return;
    }

    async.waterfall([
        getGithub,
        getRepos,
        getReadmesStats,
        mergeStats
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
                callback(error);
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
                callback(error);
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
        rootToWord: {},
        sortedRoots: []
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

    mergedStats.sortedRoots = Object.keys(mergedStats.rootCount);
    mergedStats.sortedRoots.sort((a, b) => {
        return mergedStats.rootCount[b] - mergedStats.rootCount[a];
    });

    casheStats(mergedStats);

    callback(null, mergedStats);
}

function casheStats(stats) {
    statsCashe = stats;
    statsCashed = true;
}

function getTop(stats, n, callback) {
    var top = stats.sortedRoots.slice(0, n).map((root, i) => {
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
