async function test() {
  try {
    const res = await fetch('http://localhost:3001/api/search/artist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '星野源' })
    });
    const data = await res.json();
    let itunesCount = 0;
    let discogsCount = 0;
    for (let i = 0; i < data.results.length; i++) {
      const r = data.results[i];
      if (r.cover_image && r.cover_image.includes('mzstatic.com')) {
        itunesCount++;
      } else {
        discogsCount++;
      }
    }
    console.log(`Total: iTunes ${itunesCount}, Discogs ${discogsCount}`);
  } catch (err) {
    console.error(err);
  }
}
test();
