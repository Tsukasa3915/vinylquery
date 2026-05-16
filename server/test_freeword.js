async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/search/freeword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '山下達郎' })
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Result length: ${data.results?.length}`);
    if (res.status !== 200) {
      console.log(data);
    }
  } catch (err) {
    console.error(err);
  }
}
test();
