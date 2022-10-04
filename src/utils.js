function mapObjectKeys(fn) {
  const obj = this;

  const objEntries = Object.entries(obj);

  const mappedEntries = objEntries.map(([key, value]) => {
    const getValue = (v) =>
      typeof v === "object" && v !== null ? mapObjectKeys(v, fn) : v;

    return [
      fn(key),
      Array.isArray(value)
        ? value.map((val) => getValue(val))
        : getValue(value),
    ];
  });

  return Object.fromEntries(mappedEntries);
}

Object.prototype.mapKeys = mapObjectKeys;
