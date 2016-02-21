import {
  identity, has, compose, split, prop, replace, flatten, find, propEq,
  lt, not, length, when, map, pipe, toUpper, sum, props, join, isNil, sortBy
} from 'ramda';


export const thisify = fn => function (...args) {
  return fn(this, ...args);
};


export const ifDefThen = when(compose(not, isNil));


export const setOf = x => new Set(x);


export const statToString = ({name, length, source}) =>
  `${name} ${length} (${Array.from(source).join(', ')})`;


export const callProp = (prop, ...args) => x => x[prop](...args);


export const lex = compose(
  ifDefThen(prop('lex')), ifDefThen(prop('0')), prop('analysis')
);


export const groupBy = thisify(
  ($, selector) => $.groupBy(selector).flatMap(callProp('toArray'))
);
