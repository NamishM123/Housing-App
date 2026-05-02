// vibe tags: 'urban' | 'coastal' | 'suburban' | 'college'
export const NEIGHBORHOODS = [
  {
    id: 'downtown-slo',
    name: 'Downtown SLO',
    zip: '93401',
    center: [-120.6596, 35.2828],
    avgRent: 2200,
    walkScore: 88,
    vibes: ['urban'],
    polygon: [
      [-120.675, 35.295],
      [-120.645, 35.295],
      [-120.645, 35.270],
      [-120.675, 35.270],
      [-120.675, 35.295],
    ],
  },
  {
    id: 'cal-poly',
    name: 'Cal Poly Area',
    zip: '93405',
    center: [-120.6590, 35.3005],
    avgRent: 2400,
    walkScore: 65,
    vibes: ['college', 'urban'],
    polygon: [
      [-120.680, 35.315],
      [-120.645, 35.315],
      [-120.645, 35.295],
      [-120.680, 35.295],
      [-120.680, 35.315],
    ],
  },
  {
    id: 'edna-valley',
    name: 'Edna Valley',
    zip: '93424',
    center: [-120.5760, 35.2200],
    avgRent: 1900,
    walkScore: 12,
    vibes: ['suburban'],
    polygon: [
      [-120.620, 35.245],
      [-120.540, 35.245],
      [-120.540, 35.195],
      [-120.620, 35.195],
      [-120.620, 35.245],
    ],
  },
  {
    id: 'los-osos',
    name: 'Los Osos',
    zip: '93402',
    center: [-120.8268, 35.3105],
    avgRent: 2100,
    walkScore: 42,
    vibes: ['coastal', 'suburban'],
    polygon: [
      [-120.870, 35.335],
      [-120.800, 35.335],
      [-120.800, 35.290],
      [-120.870, 35.290],
      [-120.870, 35.335],
    ],
  },
  {
    id: 'morro-bay',
    name: 'Morro Bay',
    zip: '93442',
    center: [-120.8499, 35.3658],
    avgRent: 2300,
    walkScore: 55,
    vibes: ['coastal'],
    polygon: [
      [-120.880, 35.390],
      [-120.825, 35.390],
      [-120.825, 35.345],
      [-120.880, 35.345],
      [-120.880, 35.390],
    ],
  },
  {
    id: 'atascadero',
    name: 'Atascadero',
    zip: '93422',
    center: [-120.6716, 35.4894],
    avgRent: 1800,
    walkScore: 38,
    vibes: ['suburban'],
    polygon: [
      [-120.720, 35.520],
      [-120.635, 35.520],
      [-120.635, 35.460],
      [-120.720, 35.460],
      [-120.720, 35.520],
    ],
  },
  {
    id: 'arroyo-grande',
    name: 'Arroyo Grande',
    zip: '93420',
    center: [-120.5893, 35.1186],
    avgRent: 1950,
    walkScore: 48,
    vibes: ['suburban'],
    polygon: [
      [-120.630, 35.145],
      [-120.555, 35.145],
      [-120.555, 35.095],
      [-120.630, 35.095],
      [-120.630, 35.145],
    ],
  },
  {
    id: 'pismo-beach',
    name: 'Pismo Beach',
    zip: '93449',
    center: [-120.6411, 35.1428],
    avgRent: 2500,
    walkScore: 62,
    vibes: ['coastal'],
    polygon: [
      [-120.670, 35.170],
      [-120.620, 35.170],
      [-120.620, 35.120],
      [-120.670, 35.120],
      [-120.670, 35.170],
    ],
  },
];

export function getAffordabilityColor(rent, monthlyIncome, maxRent = null) {
  if (!monthlyIncome || monthlyIncome <= 0) return '#6b7280';
  if (maxRent && rent > maxRent) return '#ef4444';
  const pct = rent / monthlyIncome;
  if (pct < 0.28) return '#22c55e';
  if (pct < 0.35) return '#14b8a6';
  if (pct < 0.45) return '#f59e0b';
  return '#ef4444';
}

export function getAffordabilityLabel(rent, monthlyIncome, maxRent = null) {
  if (!monthlyIncome || monthlyIncome <= 0) return 'Unknown';
  if (maxRent && rent > maxRent) return 'Over Budget';
  const pct = rent / monthlyIncome;
  if (pct < 0.28) return 'Comfortable';
  if (pct < 0.35) return 'Manageable';
  if (pct < 0.45) return 'Tight';
  return 'Out of Range';
}

export function matchesVibe(neighborhood, vibe) {
  if (!vibe || vibe === 'any') return true;
  return (neighborhood.vibes || []).includes(vibe);
}
