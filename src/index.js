import mystem from 'mystem-wrapper';
import {
  identity, has, compose, split, prop, replace, find, negate,
  lt, not, length, map, pipe, props, join, sortBy, slice, assoc
} from 'ramda';
import {
  thisify, ifDefThen, statToString, callProp, lex, groupBy
} from './utils';
import {createStatResult, mergeStatResult} from './statisticResult';
import {format} from 'url';
import {Observable} from 'rx';
import fetch from 'node-fetch';
import {PorterStemmerRu} from 'natural';
const dict = require('../resources/dict.json');
const excluded = new Set(require('../resources/prep.json'));
const stem = ::PorterStemmerRu.stem;
const log = ::console.log;


const getWordRoot = word => {
  const wordRoot = dict[word] && dict[word][0];
  return wordRoot ? wordRoot : word;
};


const fetchTaskText = (from, to) => courseName =>
  Observable
    .range(from, to)
    .map(n => ({
      protocol: 'https',
      host: 'raw.githubusercontent.com',
      pathname: `urfu-2015/${courseName}-tasks-${n}/master/README.md`
    }))
    .map(format)
    .flatMap(fetch)
    .flatMap(callProp('text'));


const normalizeText = pipe(
  replace(/ё/g, 'е'), replace(/\-/g, ' '), replace(/[^a-zа-я\s]+/ig, ' ')
);


const tokenize = thisify(
  $ => $.flatMap(split('\n'))
    .map(normalizeText)
    .flatMap(split(' '))
    .filter(identity)
);


const analyze = thisify(
  ($, analyze) => $.flatMap(analyze).flatMap(identity).filter(lex)
);


mystem.start('l');
const statistic = Observable
  .from(['verstka', 'javascript'])
  .flatMap(fetchTaskText(1, 10))
  ::tokenize()
  ::analyze(mystem.analyze)
  .filter(pipe(lex, ::excluded.has, not))
  ::groupBy(pipe(lex, stem))
  .map(createStatResult)
  ::groupBy(compose(getWordRoot, prop('name')))
  .map(mergeStatResult)
  ::groupBy(pipe(prop('name'), slice(0, 7)))
  .map(mergeStatResult)
  .toArray()
  .map(sortBy(pipe(length, negate)))
  .tap(::mystem.close)
  .shareReplay(1);


export const top = n => statistic
  .flatMap(identity).take(n).map(props(['name', 'length'])).map(join(' '));

export const count = word => statistic.map(pipe(
  find(pipe(prop('source'), callProp('has', stem(word)))),
  ifDefThen(prop('length'))
));

export const print = n =>statistic
  .flatMap(identity)
  .groupBy(length)
  .take(n)
  .flatMap((group, i) => group.map(assoc('n', i + 1)))
  .map(statToString);
