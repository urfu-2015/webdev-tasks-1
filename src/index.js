import mystem from 'mystem-wrapper';
import {
  identity, has, compose, split, prop, replace, find, negate, unary, useWith,
  inc, lt, not, length, map, pipe, props, join, sortBy, slice, assoc, call,
  flip, apply
} from 'ramda';
import RxFn from './RxFn';
const {
  combineLatest, flatMap, tap, filter, toArray, shareReplay, groupBy: groupBy$,
  take
} = RxFn;
console.log(combineLatest);
import {
  ifDefThen, statToString, callProp, lex, groupBy
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


const combineWith = pipe(combineLatest, unary, map);
var generateUrl = (courseName, n) => ({
  protocol: 'https',
  host    : 'raw.githubusercontent.com',
  pathname: `urfu-2015/${courseName}-tasks-${n}/master/README.md`
});
const fetchTaskText = (from, to) => pipe(
  map(Observable.return),
  combineWith(Observable.range(from, to)),
  flatMap(identity),
  map(apply(generateUrl)),
  map(format),
  flatMap(fetch),
  flatMap(callProp('text'))
);


const normalizeText = pipe(
  replace(/ё/g, 'е'), replace(/\-/g, ' '), replace(/[^a-zа-я\s]+/ig, ' ')
);


const tokenize = pipe(
  flatMap(split('\n')),
  map(normalizeText),
  flatMap(split(' ')),
  filter(identity)
);

const analyze = pipe(flatMap(mystem.analyze), flatMap(identity), filter(lex));

mystem.start('l');
const generateStatistic = pipe(
  Observable.of,
  fetchTaskText(1, 10),
  tokenize,
  analyze,
  filter(pipe(lex, ::excluded.has, not)),
  groupBy(pipe(lex, stem)),
  map(createStatResult),
  groupBy(compose(getWordRoot, prop('name'))),
  map(mergeStatResult),
  groupBy(pipe(prop('name'), slice(0, 7))),
  map(mergeStatResult),
  unary(toArray),
  map(sortBy(pipe(length, negate))),
  tap(::mystem.close),
  shareReplay(1)
);

const statistic = generateStatistic('verstka', 'javascript');

export const top = n => pipe(
  flatMap(identity),
  take(n),
  map(props(['name', 'length'])),
  map(join(' '))
)(statistic);

export const count = word => statistic.map(pipe(
  find(pipe(prop('source'), callProp('has', stem(word)))),
  ifDefThen(prop('length'))
));

export const print = n => statistic
  .flatMap(identity)
  .groupBy(length)
  .take(n)
  .flatMap(useWith(call, [flip(map), pipe(inc, assoc('n'))]))
  .map(statToString);

print(10).subscribe(log);
