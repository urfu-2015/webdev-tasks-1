const cheerio = require('cheerio');
const url = require('url');

const MORPHEME_ONLINE = 'www.morphemeonline.ru';
const VNUTRI_SLOVA = 'vnutrislova.net/разбор/по-составу';

var urlBuilders = {};
urlBuilders[MORPHEME_ONLINE] = function (word) {
    return url.format({
        protocol: 'http:',
        host: MORPHEME_ONLINE,
        pathname: word[0] + '/' + word
    });
};
urlBuilders[VNUTRI_SLOVA] = function (word) {
    return url.format({
        protocol: 'http:',
        host: VNUTRI_SLOVA,
        pathname: word
    });
};

var siteParsers = {};
siteParsers[MORPHEME_ONLINE] = function (body) {
    var $ = cheerio.load(body);
    return $('.root').text();
};

siteParsers[VNUTRI_SLOVA] = function (body) {
    var $ = cheerio.load(body);
    var root = $('.most-rated > p > span').text();
    root = root.substring(root.indexOf('корень ') + 8);
    root = root.substring(0, root.indexOf(']'));
    return root;
};

module.exports.urlBuilders = urlBuilders;
module.exports.siteParsers = siteParsers;
module.exports.VNUTRI_SLOVA = VNUTRI_SLOVA;
module.exports.MORPHEME_ONLINE = MORPHEME_ONLINE;