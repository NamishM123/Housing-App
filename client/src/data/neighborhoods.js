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
    noiseLevel: 'loud',
    noiseSources: ['Thursday night Farmers Market', 'bar & restaurant traffic', 'Higuera St weekend crowds'],
    parkingDifficulty: 'hard',
    localInsights: [
      'Thursday Farmers Market closes Higuera St weekly — plan errands around it',
      'Street parking strictly enforced; most spots are 2-hr limit',
      'Walkable to groceries, coffee, dining, and mission plaza',
      'Short-term rentals common — neighbor turnover is high',
      'Very bike-friendly; SLO Creek Trail is nearby',
    ],
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
    noiseLevel: 'moderate',
    noiseSources: ['student parties (Fri–Sat)', 'campus events', 'move-in/out cycles'],
    parkingDifficulty: 'moderate',
    localInsights: [
      'Rental market peaks Aug–Sept; sign leases early or pay a premium',
      'Many landlords require co-signers for student renters',
      'Cal Poly shuttle provides free rides to campus',
      'Grocery options limited on foot — a bike or car helps significantly',
      'Noise ordinance enforced but inconsistent on game days',
    ],
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
    noiseLevel: 'quiet',
    noiseSources: ['occasional farm equipment', 'wine tasting event traffic (weekends)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'A car is absolutely required — no walkable amenities nearby',
      'Some of the lowest rents in SLO County for the square footage',
      'Known for world-class Pinot Noir vineyards; wine country living',
      'Very dark skies at night — great for stargazing',
      'Commute to downtown SLO is ~15 min by car',
    ],
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
    noiseLevel: 'quiet',
    noiseSources: ['harbor fog horns (occasional)', 'wildlife (birds, sea otters)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Borders Morro Bay National Estuary — kayaking and hiking out the door',
      'Fog is frequent in summer; clearer and warmer in fall',
      'Small-town feel with a tight-knit community',
      'Limited dining options locally; Morro Bay is 10 min away',
      'Septic systems common — factor in maintenance responsibilities',
    ],
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
    noiseLevel: 'moderate',
    noiseSources: ['harbor activity', 'tourist foot traffic (summer)', 'fishing boats at dawn'],
    parkingDifficulty: 'moderate',
    localInsights: [
      'Embarcadero is busy with tourists May–Sept; quieter off-season',
      'Excellent fresh seafood and local restaurants on the harbor',
      'Morro Rock State Park is walkable from most neighborhoods',
      'Colder and foggier than inland SLO — bring layers',
      'Vacation rental competition pushes long-term rents higher',
    ],
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
    noiseLevel: 'quiet',
    noiseSources: ['US-101 freeway (eastern edge)', 'occasional train horns'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Best bang-for-buck rents in the area — larger units for less',
      'Atascadero Lake Park is a local gem for outdoor activities',
      'Hot and dry summers; significantly warmer than coastal towns',
      'Downtown revitalization is underway — new shops and dining',
      '30-minute commute to SLO via US-101 or Amtrak Pacific Surfliner',
    ],
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
    noiseLevel: 'quiet',
    noiseSources: ['US-101 noise near highway corridors', 'small airport (light plane traffic)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Charming historic Village district with walkable shops and cafes',
      'Strong family-oriented community — quieter than SLO city',
      'Close to Lopez Lake for camping, boating, and hiking',
      'Pismo Beach and Oceano Dunes just 10 minutes south',
      'Produce stands and farm-fresh food abundant in the area',
    ],
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
    noiseLevel: 'moderate',
    noiseSources: ['beach tourist traffic (summer)', 'oceanfront bar and restaurant strip', 'ATV activity near dunes'],
    parkingDifficulty: 'moderate',
    localInsights: [
      'Peak tourist season (Jun–Aug) significantly impacts parking and noise',
      'Monarch butterfly migration draws large crowds in late Oct–Nov',
      'Oceano Dunes SVRA — one of California\'s only beach driving areas nearby',
      'Higher rents partly driven by vacation rental demand',
      'Off-season (Jan–Mar) offers the best local experience',
    ],
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
