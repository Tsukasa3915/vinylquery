const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/search/freeword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '星野源' })
    });
    console.log(res.status);
  } catch (err) {
    console.log(err);
  }
}
test();
