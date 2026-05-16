const itunes = require('./services/itunes');
const discogs = require('./services/discogs');
const { containsJapanese, resolveArtistName } = require('./services/translate');
const { findRealArtist, smartSort } = require('./services/scoring');

async function test() {
  const query = '椎名林檎';
  const englishName = await resolveArtistName(query);
  console.log('English Name:', englishName);
  
  const artists = await discogs.searchArtists(englishName || query);
  const realArtist = findRealArtist(artists, englishName || query);
  console.log('Real Artist:', realArtist.name);
  
  const releasesData = await discogs.getArtistReleases(realArtist.id);
  let releases = releasesData.releases || [];
  
  // Vinylフィルターを一部シミュレート
  releases = releases.filter(r => r.format && r.format.toLowerCase().includes('vinyl')).slice(0, 5);
  
  const enriched = await itunes.enrichReleasesWithImages(releases);
  console.log(enriched.map(r => ({ title: r.title, cover: r.cover_image, thumb: r.thumb })));
}

test();
