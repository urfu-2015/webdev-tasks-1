import {prop, length, map, pipe, toUpper, sum, flatten} from 'ramda';
import {setOf, lex} from './utils';
import {PorterStemmerRu} from 'natural';
const stem = ::PorterStemmerRu.stem;


export const createStatResult = mystemOutput => {
  const name = lex(mystemOutput[0]);
  return {
    length: mystemOutput.length,
    source: setOf(
      mystemOutput.map(pipe(prop('text'), toUpper, stem))).add(stem(name)
    ),
    name
  };
};


const uniteSource = pipe(map(pipe(prop('source'), Array.from)), flatten, setOf);
export const mergeStatResult = wordStat => ({
  length: sum(wordStat.map(length)),
  source: uniteSource(wordStat),
  name: wordStat[0].name
});
