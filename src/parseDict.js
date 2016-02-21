module.exports = function (dict) {
  return dict.split('\n').map(
    line => line.split(' | ')
  ).reduce((dict, line) => {
    dict[line[0]] = line[1].replace('\'', '').split('/')[0];
    return dict;
  }, {});
};
