import {
  over, lensProp, pipe, inc, test, not, toPairs, split, replace,
  negate, prop, sortBy, takeWhile, fromPairs, lt, map, lensIndex, filter, tap
} from 'ramda';
import {setOf} from './utils';
import {readFileSync, writeFileSync} from 'fs';
const dictSource = readFileSync('../resources/tikhonov.txt');
const morphFreq = {};
const omitMorphemeFreqThreshold = 450;

const parseMorpheme = pipe(
  replace('\'', ''),
  split('/'),
  filter(pipe(test(/[^А-я]/), not)),
  tap(map(m => morphFreq[m] ? morphFreq[m]++ : morphFreq[m] = 1))
);

const parse = pipe(
  split('\n'),
  map(split(' | ')),
  map(over(lensIndex(1), parseMorpheme)),
  fromPairs
);

let dict = parse(dictSource.toString());

const notRoots = pipe(
  toPairs,
  tap(x => x),
  sortBy(pipe(prop(1), negate)),
  takeWhile(pipe(prop(1), lt(omitMorphemeFreqThreshold))),
  map(prop(0)),
  setOf
)(morphFreq);

console.log(Array.from(notRoots));

dict = pipe(
  toPairs,
  map(over(lensIndex(1), filter(pipe(::notRoots.has, not)))),
  fromPairs
)(dict);

writeFileSync('../resources/dict.json', JSON.stringify(dict));
