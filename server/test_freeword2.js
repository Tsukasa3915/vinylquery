async function test() {
  const res = await fetch('http://localhost:3001/api/search/freeword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '山下達郎' })
  });
  const data = await res.json();
  console.log(data.results[0]);
}
test();
