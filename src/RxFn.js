import {
  mapObjIndexed as map, curryN, pipe, length, __, merge, useWith, binary,
  identity, prop, bind
} from 'ramda';
import {callFromTail} from './utils';
import {Observable} from 'rx';

const RxProto = Observable.prototype;
const predefDescs = {
  combineLatest: 2,
  tap: 2,
  flatMap: 2,
  map: 2,
  filter: 2,
  shareReplay: 2,
  groupBy: 2,
  toArray: 1,
};

const RxDescs = pipe(
  map(length),
  merge(__, predefDescs),
  map(useWith(curryN, [identity, callFromTail]))
)(RxProto);

export default RxDescs;
