const { checkAllStores } = require('./services/stock');

async function test() {
  const result = await checkAllStores("Gen Hoshino", "Pop Virus");
  console.log(result);
}

test();
