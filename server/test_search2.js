async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/search/freeword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '星野源' })
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Total length:", data.results.length);
  } catch (err) {
    console.error(err);
  }
}
test();
