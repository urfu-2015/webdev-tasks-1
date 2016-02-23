import {
  unary, has, compose, split, prop, replace, flatten, find, propEq, curryN,
  lt, not, length, when, map, pipe, toUpper, sum, props, join, isNil, sortBy
} from 'ramda';
import RxFn from './RxFn';


export const ifDefThen = when(compose(not, isNil));


export const setOf = x => new Set(x);


export const statToString = ({n, name, length, source}) =>
  `${n}\t${name}\t${length}\t(${Array.from(source).join(', ')})`;


export const callProp = (prop, ...args) => x => x[prop](...args);


export const callFromTail = curryN(2, (fn ,...args) => args.pop()[fn](...args));


export const lex = compose(
  ifDefThen(prop('lex')), ifDefThen(prop('0')), prop('analysis')
);


export const groupBy = selector => pipe(
  RxFn.groupBy(selector),
  RxFn.flatMap(unary(RxFn.toArray))
);
