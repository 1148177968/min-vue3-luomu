const baseHandler = {
  get(target, key) {
    // const res = target[key];
    const res = Reflect.get(target, key);
    track(target, key);
    return typeof res === 'object' ? reactive(res) : res;
  },
  set(target, key, val) {
    const info = { oldValue: target[key], newValue: val };

    // target[key] = val;
    const res = Reflect.set(target, key, val);
    trigger(target, key, info);
  },
};

function reactive(target) {
  const observed = new Proxy(target, baseHandler);

  return observed;
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
  const effect = (...args) => {
    return run(effect, fn, args);
  };
  effect.deps = [];
  effect.computed = options.computed;
  effect.lazy = options.lazy;
  return effect;
}
function run(effect, fn, args) {
  if (effectStack.indexOf(effect) === -1) {
    try {
      effectStack.push(effect);
      return fn(...args);
    } finally {
      effectStack.pop();
    }
  }
}

let effectStack = [];
let targetMap = new WeakMap();

function track(target, key) {
  const effect = effectStack[effectStack.length - 1];

  if (effect) {
    let depMap = targetMap.get(target);
    if (!depMap) {
      depMap = new Map();
      targetMap.set(target, depMap);
    }
    let dep = depMap.get(key);
    if (!dep) {
      dep = new Set();
      depMap.set(key, dep);
    }

    if (!dep.has(effect)) {
      dep.add(effect);
      effect.deps.push(dep);
    }
  }
}

function trigger(target, key, info) {
  const depMap = targetMap.get(target);

  if (!depMap) {
    return;
  }
  const effects = new Set();
  const computedEffects = new Set();

  if (key) {
    let deps = depMap.get(key);
    deps.forEach((v) => {
      if (v.computed) {
        computedEffects.add(v);
      } else {
        effects.add(v);
      }
    });

    effects.forEach((v) => v());
    computedEffects.forEach((v) => v());
  }
}
