async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/search/freeword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '星野源' })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text.substring(0, 500));
  } catch (err) {
    console.error(err);
  }
}
test();
