async function test() {
  const queries = [
    { artist: "星野源*", title: "Crazy Crazy / 桜の森" },
    { artist: "Hoshino Gen*", title: "Stranger" },
    { artist: "星野源*", title: "フィルム" }
  ];

  for (const q of queries) {
    const cleanTitle = q.title.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').trim();
    // アスタリスクなどを消す実験
    const superCleanTitle = cleanTitle.replace(/[\/\-\*]/g, ' ').split(' ')[0].trim(); 
    const cleanArtist = q.artist.replace(/\s*[\[\(].*?[\]\)]\s*/g, ' ').replace(/\*/g, '').trim();

    let query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
    let url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
    let res = await fetch(url);
    let data = await res.json();
    console.log(`[Original] ${q.artist} - ${q.title} => Found: ${data.results.length > 0}`);

    // よりクリーンにしたクエリ
    query = encodeURIComponent(`${cleanArtist} ${superCleanTitle}`);
    url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;
    res = await fetch(url);
    data = await res.json();
    console.log(`[Cleaned]  ${cleanArtist} - ${superCleanTitle} => Found: ${data.results.length > 0}`);
  }
}
test();
