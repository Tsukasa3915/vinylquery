const itunes = require('./services/itunes');
async function test() {
  const releases = Array.from({ length: 50 }).map((_, i) => ({
    id: i, artist: "星野源", title: "Pop Virus", cover_image: "discogs"
  }));
  const start = Date.now();
  const enriched = await itunes.enrichReleasesWithImages(releases);
  console.log(`Time: ${Date.now() - start}ms`);
  let success = 0;
  for (const r of enriched) {
    if (r.cover_image !== 'discogs') success++;
  }
  console.log(`Success: ${success} / 50`);
}
test();
