const source = {
  EN_NAME: 'ZHY-ERP',
  CN_NAME: '新化工运营管理系统',
  HOMEPAGE: 'https://shgerp-chempt.zhechem.com/',
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