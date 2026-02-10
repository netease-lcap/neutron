const source = {
  EN_NAME: 'CodeWave',
  CN_NAME: 'CodeWave 智能开发平台',
  HOMEPAGE: 'https://codewave.163.com/',
};

const defined = Object
  .entries(source)
  .reduce((result, entry = []) => {
    const [key, value] = entry;

    const attr = `process.env.${key}`;
    const json = JSON.stringify(value);

    result[attr] = json;
    return result;
  }, {});

module.exports = { ...source, defined };