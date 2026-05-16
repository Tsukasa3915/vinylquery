const itunes = require('./services/itunes');
const search = require('./routes/search'); 
// 擬似的にデータを渡して enrichReleasesWithImages を呼んでみる
async function test() {
  const releases = [
    { id: 1, artist: "星野源*", title: "Crazy Crazy / 桜の森", cover_image: "discogs_img", thumb: "discogs_img" },
    { id: 2, artist: "Hoshino Gen*", title: "Stranger", cover_image: "discogs_img", thumb: "discogs_img" },
    { id: 3, artist: "星野源*", title: "フィルム", cover_image: "discogs_img", thumb: "discogs_img" },
    { id: 4, artist: "星野源*", title: "ばかのうた", cover_image: "discogs_img", thumb: "discogs_img" }
  ];
  const enriched = await itunes.enrichReleasesWithImages(releases);
  for (const r of enriched) {
    console.log(`${r.title}: ${r.cover_image === 'discogs_img' ? 'NOT_ENRICHED' : 'ENRICHED'}`);
  }
}
test();
