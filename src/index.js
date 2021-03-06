import _ from 'lodash';

import { composeComponent, exposeContextTypes, renderChild } from './config';

/**
 * aggregates a set of functions/objects into a constant part + a dynamic part
 *
 *
 **/

const mergeObjArr = (arr) => {
  const base = _.assign.apply(_, [ {}, ...arr ]);
  const styles = _.flatten(_.compact(_.map(arr, 'styles')));
  if (styles.length > 1) {
    base.styles = styles;
  }
  return base;
};

export const optimize = (...propers) => {
  const flattened = _.compact(_.flattenDeep(propers));
  const constantStyles = _.takeWhile(flattened, st => !_.isFunction(st)) || [];
  const dynamic = _.slice(flattened, constantStyles.length, flattened.length) || [];
  const constant = mergeObjArr(constantStyles);
  return {
    constant,
    dynamic,
  };
};

const flatMap = (arr, fn) => {
  if (_.isArray(arr)) {
    return _.flattenDeep(_.map(arr, fn));
  }
  return fn(arr);
};

export const applyFunctor = (functor, ...args) => {
  const reapply = f => applyFunctor.apply(null, [ f, ...args ]);
  if (_.isArray(functor)) {
    return flatMap(functor, reapply);
  }
  if (_.isFunction(functor)) {
    return reapply(functor.apply(null, args));
  }
  return functor;
};

export const compose = (...propers) => {
  const ps = optimize(propers);

  return Component => {
    const ComposedComponent = (props, context) => {
      const base = { ...props, ...ps.constant };
      const _props = mergeObjArr([ base, ...applyFunctor(ps.dynamic, base, context) ]);
      return composeComponent(Component, _props);
    };
    ComposedComponent.contextTypes = exposeContextTypes();
    return ComposedComponent;
  };
};

export const styles = (...stylers) => {
  const {
    constant,
    dynamic,
  } = optimize(stylers);

  // If all constants, return a constant proper
  if (dynamic.length === 0) {
    return {
      styles: constant,
    };
  }

  return (props, context) => {
    const upstream = props.styles || [];
    const base = [ ...upstream, constant];
    const applied = applyFunctor(dynamic, { ...props, styles: base }, context);
    const _styles = [ ...base, ...applied ];
    return {
      styles: _styles,
    };
  };
};

export const children = (...childers) => {
  return (props) => {
    return {
      children: _.map(childers, renderChild(props)),
    };
  };
};
