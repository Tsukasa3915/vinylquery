/**
 * フィルタリングロジック
 *
 * Discogs API から取得した結果に対し、
 * 「Vinyl（アナログレコード）」かつ「公式リリース」のみを抽出する。
 */

/**
 * リリースが Vinyl フォーマットかどうかを判定する
 * @param {Object} release - Discogs リリースオブジェクト
 * @returns {boolean}
 */
function isVinyl(release) {
  // format フィールドから判定（検索結果の場合）
  if (release.format) {
    const formats = Array.isArray(release.format) ? release.format : [release.format];
    return formats.some(
      (f) => typeof f === 'string' && f.toLowerCase().includes('vinyl')
    );
  }

  // formats フィールドから判定（リリース詳細の場合）
  if (release.formats) {
    return release.formats.some(
      (f) => f.name && f.name.toLowerCase().includes('vinyl')
    );
  }

  // role がリリース一覧の場合、basic_information から判定
  if (release.basic_information && release.basic_information.formats) {
    return release.basic_information.formats.some(
      (f) => f.name && f.name.toLowerCase().includes('vinyl')
    );
  }

  return false;
}

/**
 * 非公式リリース（海賊版・ブートレグ）を判定する
 * @param {Object} release
 * @returns {boolean} 非公式の場合 true
 */
function isUnofficial(release) {
  // status フィールドで判定
  if (release.status && release.status.toLowerCase() === 'unofficial') {
    return true;
  }

  // format の説明に Unofficial が含まれる場合
  if (release.format) {
    const formats = Array.isArray(release.format) ? release.format : [release.format];
    return formats.some(
      (f) =>
        typeof f === 'string' &&
        (f.toLowerCase().includes('unofficial') ||
          f.toLowerCase().includes('bootleg') ||
          f.toLowerCase().includes('counterfeit'))
    );
  }

  // formats 配列の descriptions をチェック
  if (release.formats) {
    return release.formats.some(
      (f) =>
        f.descriptions &&
        f.descriptions.some(
          (d) =>
            d.toLowerCase().includes('unofficial') ||
            d.toLowerCase().includes('bootleg') ||
            d.toLowerCase().includes('counterfeit')
        )
    );
  }

  return false;
}

/**
 * リリースリストをフィルタリングする
 * - Vinyl のみ抽出
 * - 非公式リリースを除外
 *
 * @param {Array} releases - リリースの配列
 * @returns {Array} フィルタ済みリリース
 */
function filterReleases(releases) {
  return releases.filter((release) => {
    // artist releases エンドポイントの場合は role=Main のみ
    // (ただしゲスト参加も含めたい場合はこの行を削除)

    // Vinyl フォーマットであること
    if (!isVinyl(release)) return false;

    // 公式リリースであること
    if (isUnofficial(release)) return false;

    return true;
  });
}

/**
 * Artist Releases エンドポイント用のフィルタ
 * format 情報がないため、type で判別しつつフィルタする
 */
function filterArtistReleases(releases) {
  return releases.filter((release) => {
    // 非公式を除外
    if (release.status && release.status.toLowerCase() === 'unofficial') {
      return false;
    }

    // format が 'Vinyl' を含むものだけ通す
    if (release.format) {
      const fmt = release.format.toLowerCase();
      return fmt.includes('vinyl');
    }

    // format 情報がない場合はとりあえず通す（後のステップで再フィルタ可能）
    return true;
  });
}

module.exports = {
  isVinyl,
  isUnofficial,
  filterReleases,
  filterArtistReleases,
};
