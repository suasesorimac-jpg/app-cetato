import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Leer archivos
const mapeo = JSON.parse(readFileSync(join(rootDir, 'mapeo-imagenes.json'), 'utf8'));
const catalogPath = join(rootDir, 'src/data/catalog.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));

// Función para normalizar texto (quitar tildes, minúsculas, espacios)
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9\s]/g, '')      // Quitar caracteres especiales
    .replace(/\s+/g, ' ')             // Normalizar espacios
    .trim();
}

// Función para calcular similitud entre dos strings (0-100)
function similarity(s1, s2) {
  const n1 = normalizeText(s1);
  const n2 = normalizeText(s2);
  
  if (n1 === n2) return 100;
  if (n1.includes(n2) || n2.includes(n1)) return 85;
  
  // Calcular distancia de Levenshtein simplificada
  const words1 = n1.split(' ');
  const words2 = n2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  return (commonWords / totalWords) * 100;
}

// Función para buscar el mejor match
function findBestMatch(albumTitle, mapeoKeys) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const key of mapeoKeys) {
    const score = similarity(albumTitle, key);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key;
    }
  }
  
  return { match: bestMatch, score: bestScore };
}

// Vincular imágenes
const matches = [];
const noMatches = [];
const updatedCatalog = catalog.map(vinyl => {
  const { match, score } = findBestMatch(vinyl.album, Object.keys(mapeo));
  
  if (score >= 70 && match) {
    const images = mapeo[match];
    const updatedVinyl = { ...vinyl };
    
    // Carátulas
    if (images.caratulas && images.caratulas.length > 0) {
      const front = images.caratulas.find(c => c.side === 'front' || c.side === 'unknown');
      const back = images.caratulas.find(c => c.side === 'back');
      
      if (front) updatedVinyl.coverImageId = front.publicId;
      if (back) updatedVinyl.coverBackImageId = back.publicId;
    }
    
    // Galletas
    if (images.galletas && images.galletas.length > 0) {
      const sideA = images.galletas.find(g => g.side === 'A' || g.side === 'unknown');
      const sideB = images.galletas.find(g => g.side === 'B');
      
      if (sideA) updatedVinyl.labelAImageId = sideA.publicId;
      if (sideB) updatedVinyl.labelBImageId = sideB.publicId;
    }
    
    matches.push({
      id: vinyl.id,
      album: vinyl.album,
      matchedWith: match,
      score: Math.round(score),
      images: {
        cover: !!updatedVinyl.coverImageId,
        coverBack: !!updatedVinyl.coverBackImageId,
        labelA: !!updatedVinyl.labelAImageId,
        labelB: !!updatedVinyl.labelBImageId
      }
    });
    
    return updatedVinyl;
  } else {
    noMatches.push({
      id: vinyl.id,
      album: vinyl.album,
      bestMatch: match,
      score: Math.round(score)
    });
    return vinyl;
  }
});

// Guardar catálogo actualizado
writeFileSync(catalogPath, JSON.stringify(updatedCatalog, null, 2));

// Generar reporte
const reporte = {
  timestamp: new Date().toISOString(),
  totalRegistros: catalog.length,
  matches: matches.length,
  noMatches: noMatches.length,
  porcentajeVinculacion: ((matches.length / catalog.length) * 100).toFixed(1) + '%',
  matches: matches,
  noMatches: noMatches
};

writeFileSync(join(rootDir, 'reporte-vinculacion.json'), JSON.stringify(reporte, null, 2));

console.log('✅ Vinculación completada:');
console.log(`   - Total registros: ${catalog.length}`);
console.log(`   - Matches: ${matches.length}`);
console.log(`   - No matches: ${noMatches.length}`);
console.log(`   - Porcentaje: ${reporte.porcentajeVinculacion}`);
console.log(`\n📄 Reporte guardado en: reporte-vinculacion.json`);
