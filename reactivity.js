const targetMap = new WeakMap();
const effectsStack = [];
// 依赖收集
function track(target, key) {
  const effect = effectsStack[effectsStack.length - 1];
  if (effect) {
    let depMap = targetMap.get(target);
    if (depMap === undefined) {
      depMap = new Map();
      targetMap.set(target, depMap);
    }
    let dep = depMap.get(key);
    if (dep === undefined) {
      dep = new Set();
      depMap.set(key, dep);
    }
    if (!dep.has(effect)) {
      dep.add(effect);
      effect.deps.push(dep);
    }
  }
}
// 触发依赖收集
function trigger(target, key, info) {
  const depMap = targetMap.get(target);
  if (depMap === undefined) {
    return false;
  }
  const effects = new Set();
  const computeds = new Set();
  if (key) {
    let deps = depMap.get(key);
    deps.forEach((effect) => {
      if (effect.computed) {
        computeds.add(effect);
      } else {
        effects.add(effect);
      }
    });
  }
  effects.forEach((effect) => effect());
  computeds.forEach((effect) => effect());
}
const baseHandle = {
  get(target, key) {
    const ret = target[key];
    // 收集依赖
    track(target, key);
    return ret;
  },
  set(target, key, val) {
    const info = { oldValue: target[key], newValue: val };
    // 触发effect
    target[key] = val;
    trigger(target, key, info);
  },
};
function reactive(target) {
  const observer = new Proxy(target, baseHandle);
  return observer;
}
function computed(fn) {
  const runner = effect(fn, { computed: true, lazy: true });
  return {
    effect: runner,
    get value() {
      return runner();
    },
  };
}
function effect(fn, options = {}) {
  let e = createReactiveEffect(fn, options);
  if (!options.lazy) {
    e();
  }
  return e;
}
function createReactiveEffect(fn, options) {
  const effect = function effect(...args) {
    return run(effect, fn, args);
  };
  effect.deps = [];
  effect.computed = options.computed;
  effect.lazy = options.lazy;
  return effect;
}
function run(effect, fn, args) {
  if (effectsStack.indexOf(effect) === -1) {
    try {
      effectsStack.push(effect);
      return fn(...args);
    } finally {
      effectsStack.pop();
    }
  }
}
