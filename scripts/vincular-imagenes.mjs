import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapeo = JSON.parse(readFileSync(join(rootDir, 'mapeo-imagenes.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(rootDir, 'src/data/catalog.json'), 'utf8'));

const normalize = (t) => t ? t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim() : '';
const similarity = (s1, s2) => {
  const n1 = normalize(s1), n2 = normalize(s2);
  if (n1 === n2) return 100;
  if (n1.includes(n2) || n2.includes(n1)) return 85;
  const w1 = n1.split(' '), w2 = n2.split(' ');
  return (w1.filter(w => w2.includes(w)).length / Math.max(w1.length, w2.length)) * 100;
};

const matches = [], noMatches = [];
const updatedCatalog = catalog.map(vinyl => {
  let best = { match: null, score: 0 };
  for (const key of Object.keys(mapeo)) {
    const score = similarity(vinyl.album, key);
    if (score > best.score) best = { match: key, score };
  }

  if (best.score >= 70 && best.match) {
    const img = mapeo[best.match], uV = { ...vinyl };
    if (img.caratulas?.length) {
      const f = img.caratulas.find(c => c.side === 'front') || img.caratulas.find(c => c.side === 'unknown');
      const b = img.caratulas.find(c => c.side === 'back');
      if (f) uV.coverImageId = f.publicId;
      if (b) uV.coverBackImageId = b.publicId;
    }
    if (img.galletas?.length) {
      const a = img.galletas.find(g => g.side === 'A') || img.galletas.find(g => g.side === 'unknown');
      const b = img.galletas.find(g => g.side === 'B');
      if (a) uV.labelAImageId = a.publicId;
      if (b) uV.labelBImageId = b.publicId;
    }
    matches.push({ id: vinyl.id, album: vinyl.album, matchedWith: best.match, score: Math.round(best.score), images: { cover: !!uV.coverImageId, coverBack: !!uV.coverBackImageId, labelA: !!uV.labelAImageId, labelB: !!uV.labelBImageId } });
    return uV;
  }
  noMatches.push({ id: vinyl.id, album: vinyl.album, bestMatch: best.match, score: Math.round(best.score) });
  return vinyl;
});

writeFileSync(join(rootDir, 'src/data/catalog.json'), JSON.stringify(updatedCatalog, null, 2));
const stats = { total: catalog.length, matched: matches.length, notMatched: noMatches.length, percentage: ((matches.length / catalog.length) * 100).toFixed(1) + '%' };
writeFileSync(join(rootDir, 'reporte-vinculacion.json'), JSON.stringify({ stats, matches, noMatches }, null, 2));
console.log(JSON.stringify({ status: 'success', stats }));
