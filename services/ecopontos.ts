import axios from 'axios';

export interface Ecoponto {
  id: number;
  lat: number;
  lon: number;
  nome: string;
  materiais: string[];
  distanciaM: number;
}

const MATERIAIS_TAGS: Record<string, string> = {
  'recycling:glass': 'Vidro',
  'recycling:paper': 'Papel',
  'recycling:plastic': 'Plástico',
  'recycling:metal': 'Metal',
  'recycling:clothes': 'Roupas',
  'recycling:electronics': 'Eletrônicos',
  'recycling:batteries': 'Pilhas',
  'recycling:oil': 'Óleo',
  'recycling:cardboard': 'Papelão',
  'recycling:cans': 'Latinhas',
};

// Servidores Overpass públicos — tenta em ordem se o primeiro falhar
const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOverpass(query: string): Promise<any[]> {
  const body = `data=${encodeURIComponent(query)}`;
  const config = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 25000,
  };

  let lastError: any;
  for (const url of OVERPASS_SERVERS) {
    try {
      const res = await axios.post(url, body, config);
      return res.data?.elements ?? [];
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function buscarEcopontos(lat: number, lon: number): Promise<Ecoponto[]> {
  const r = 5000;
  // Query em linha única para evitar problemas de encoding
  const query = `[out:json][timeout:25];(node["amenity"="recycling"](around:${r},${lat},${lon});way["amenity"="recycling"](around:${r},${lat},${lon});node["recycling_type"="container"](around:${r},${lat},${lon});node["recycling_type"="centre"](around:${r},${lat},${lon}););out center 30;`;

  const elementos = await fetchOverpass(query);

  const pontos: Ecoponto[] = [];

  for (const el of elementos) {
    const elLat: number | undefined = el.lat ?? el.center?.lat;
    const elLon: number | undefined = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) continue;

    const tags = el.tags ?? {};
    const materiais = Object.keys(MATERIAIS_TAGS)
      .filter((k) => tags[k] === 'yes')
      .map((k) => MATERIAIS_TAGS[k]);

    const nome =
      tags.name ??
      tags.operator ??
      (tags.recycling_type === 'centre' ? 'Centro de Reciclagem' : 'Ponto de Coleta');

    pontos.push({
      id: el.id,
      lat: elLat,
      lon: elLon,
      nome,
      materiais,
      distanciaM: Math.round(haversine(lat, lon, elLat, elLon)),
    });
  }

  return pontos.sort((a, b) => a.distanciaM - b.distanciaM);
}

export function formatarDistancia(metros: number): string {
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1)} km`;
}
