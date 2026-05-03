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
    noiseScore: 78,
    noiseSources: ['Thursday night Farmers Market', 'bar & restaurant traffic', 'Higuera St weekend crowds'],
    parkingDifficulty: 'hard',
    minZoom: 11.5,         // only show when zoomed into SLO
    parentId: 'slo-city', // belongs to the San Luis Obispo parent area
    localInsights: [
      'Thursday Farmers Market closes Higuera St weekly — plan errands around it',
      'Street parking strictly enforced; most spots are 2-hr limit',
      'Walkable to groceries, coffee, dining, and mission plaza',
      'Short-term rentals common — neighbor turnover is high',
      'Very bike-friendly; SLO Creek Trail is nearby',
    ],
    recentNews: [
      { category: 'Development', headline: 'Parking structure on Palm St undergoing renovation', date: 'Apr 2025' },
      { category: 'Events', headline: 'Thursday Farmers Market season kicks off — Higuera closed weekly', date: 'Apr 2025' },
      { category: 'Housing', headline: 'SLO City Council approves 48-unit mixed-use project near train station', date: 'Mar 2025' },
      { category: 'Transport', headline: 'SLO Transit adds late-night route connecting downtown to LOVR', date: 'Feb 2025' },
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
    noiseScore: 58,
    noiseSources: ['student parties (Fri–Sat)', 'campus events', 'move-in/out cycles'],
    parkingDifficulty: 'moderate',
    minZoom: 11.5,         // only show when zoomed into SLO
    parentId: 'slo-city', // belongs to the San Luis Obispo parent area
    localInsights: [
      'Rental market peaks Aug–Sept; sign leases early or pay a premium',
      'Many landlords require co-signers for student renters',
      'Cal Poly shuttle provides free rides to campus',
      'Grocery options limited on foot — a bike or car helps significantly',
      'Noise ordinance enforced but inconsistent on game days',
    ],
    recentNews: [
      { category: 'Housing', headline: 'Cal Poly enrollment cap raises off-campus rental demand', date: 'Apr 2025' },
      { category: 'Transport', headline: 'New bike lanes added along California Blvd toward campus', date: 'Mar 2025' },
      { category: 'Development', headline: 'Student-targeted apartment complex breaks ground on Foothill', date: 'Feb 2025' },
      { category: 'Events', headline: 'Cal Poly Poly Royal Rodeo weekend — expect traffic and noise', date: 'Apr 2025' },
    ],
    polygon: [
      [-120.680, 35.315],
      [-120.645, 35.315],
      [-120.645, 35.295],
      [-120.680, 35.295],
      [-120.680, 35.315],
    ],
  },
  // ── Parent area: San Luis Obispo (visible at low zoom, replaced by sub-hoods when zoomed in)
  {
    id: 'slo-city',
    name: 'San Luis Obispo',
    zip: '93401',
    center: [-120.6630, 35.2980],
    avgRent: 2300,
    walkScore: 80,
    vibes: ['urban', 'college'],
    noiseLevel: 'moderate',
    noiseScore: 55,
    noiseSources: ['downtown bar traffic', 'campus events', 'Farmers Market'],
    parkingDifficulty: 'moderate',
    maxZoom: 11.5,         // hidden once user zooms in (sub-hoods take over)
    localInsights: [
      'Zoom in to explore Downtown SLO and the Cal Poly Area separately',
      'Central location with easy access to the coast and wine country',
      'Strong rental market year-round driven by Cal Poly enrollment',
      'Thursday Farmers Market is a community anchor — plan around it',
      'SLO is consistently ranked among the happiest cities in the US',
    ],
    recentNews: [
      { category: 'Housing', headline: 'SLO City Council approves 48-unit mixed-use project near train station', date: 'Mar 2025' },
      { category: 'Transport', headline: 'SLO Transit adds late-night route connecting downtown to LOVR', date: 'Feb 2025' },
      { category: 'Development', headline: 'Downtown parking structure on Palm St undergoing renovation', date: 'Apr 2025' },
      { category: 'Events', headline: 'Thursday Farmers Market season kicks off — Higuera closed weekly', date: 'Apr 2025' },
    ],
    polygon: [
      [-120.690, 35.320],
      [-120.635, 35.320],
      [-120.635, 35.265],
      [-120.690, 35.265],
      [-120.690, 35.320],
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
    noiseScore: 22,
    noiseSources: ['occasional farm equipment', 'wine tasting event traffic (weekends)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'A car is absolutely required — no walkable amenities nearby',
      'Some of the lowest rents in SLO County for the square footage',
      'Known for world-class Pinot Noir vineyards; wine country living',
      'Very dark skies at night — great for stargazing',
      'Commute to downtown SLO is ~15 min by car',
    ],
    recentNews: [
      { category: 'Agriculture', headline: 'Edna Valley AVA sees record Pinot Noir harvest this season', date: 'Nov 2024' },
      { category: 'Events', headline: 'SLO Wine Country Harvest Celebration returns to Edna Valley', date: 'Oct 2024' },
      { category: 'Development', headline: 'County approves low-density residential lots near Orcutt Rd', date: 'Jan 2025' },
      { category: 'Roads', headline: 'Orcutt Rd repaving project completed — smoother commute to SLO', date: 'Mar 2025' },
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
    noiseScore: 25,
    noiseSources: ['harbor fog horns (occasional)', 'wildlife (birds, sea otters)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Borders Morro Bay National Estuary — kayaking and hiking out the door',
      'Fog is frequent in summer; clearer and warmer in fall',
      'Small-town feel with a tight-knit community',
      'Limited dining options locally; Morro Bay is 10 min away',
      'Septic systems common — factor in maintenance responsibilities',
    ],
    recentNews: [
      { category: 'Environment', headline: 'Morro Bay Estuary restoration project receives state funding', date: 'Mar 2025' },
      { category: 'Development', headline: 'Los Osos Community Services District water system upgrade approved', date: 'Feb 2025' },
      { category: 'Transport', headline: 'New bike path connects Los Osos to Montana de Oro trailhead', date: 'Jan 2025' },
      { category: 'Housing', headline: 'Short-term rental enforcement tightens in unincorporated areas', date: 'Apr 2025' },
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
    noiseScore: 48,
    noiseSources: ['harbor activity', 'tourist foot traffic (summer)', 'fishing boats at dawn'],
    parkingDifficulty: 'moderate',
    localInsights: [
      'Embarcadero is busy with tourists May–Sept; quieter off-season',
      'Excellent fresh seafood and local restaurants on the harbor',
      'Morro Rock State Park is walkable from most neighborhoods',
      'Colder and foggier than inland SLO — bring layers',
      'Vacation rental competition pushes long-term rents higher',
    ],
    recentNews: [
      { category: 'Development', headline: 'Embarcadero seawall repair project entering final phase', date: 'Apr 2025' },
      { category: 'Environment', headline: 'Morro Bay otter population hits 10-year high — kayak tours sold out', date: 'Mar 2025' },
      { category: 'Housing', headline: 'Vacation rental conversions tighten long-term supply in 93442', date: 'Feb 2025' },
      { category: 'Events', headline: 'Morro Bay Harbor Festival returns May 2025 — expect crowds', date: 'Apr 2025' },
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
    noiseScore: 35,
    noiseSources: ['US-101 freeway (eastern edge)', 'occasional train horns'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Best bang-for-buck rents in the area — larger units for less',
      'Atascadero Lake Park is a local gem for outdoor activities',
      'Hot and dry summers; significantly warmer than coastal towns',
      'Downtown revitalization is underway — new shops and dining',
      '30-minute commute to SLO via US-101 or Amtrak Pacific Surfliner',
    ],
    recentNews: [
      { category: 'Development', headline: 'Downtown Atascadero revitalization — 3 new restaurants opening on El Camino', date: 'Apr 2025' },
      { category: 'Transport', headline: 'Caltrans 101 improvement project brings lane additions near Atascadero exits', date: 'Mar 2025' },
      { category: 'Events', headline: 'Atascadero Lake Park hosts inaugural summer concert series', date: 'May 2025' },
      { category: 'Housing', headline: 'Rental vacancy rate drops to 3.2% — tightest market in 5 years', date: 'Feb 2025' },
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
    noiseScore: 30,
    noiseSources: ['US-101 noise near highway corridors', 'small airport (light plane traffic)'],
    parkingDifficulty: 'easy',
    localInsights: [
      'Charming historic Village district with walkable shops and cafes',
      'Strong family-oriented community — quieter than SLO city',
      'Close to Lopez Lake for camping, boating, and hiking',
      'Pismo Beach and Oceano Dunes just 10 minutes south',
      'Produce stands and farm-fresh food abundant in the area',
    ],
    recentNews: [
      { category: 'Development', headline: 'Historic Village district adds weekend night market starting June', date: 'May 2025' },
      { category: 'Roads', headline: 'Grand Ave and Courtland St intersection signals upgraded', date: 'Mar 2025' },
      { category: 'Environment', headline: 'Lopez Lake water levels at 85% — recreation season looks strong', date: 'Apr 2025' },
      { category: 'Housing', headline: 'Arroyo Grande sees 6% rent increase YoY, driven by remote worker migration', date: 'Jan 2025' },
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
    noiseScore: 55,
    noiseSources: ['beach tourist traffic (summer)', 'oceanfront bar and restaurant strip', 'ATV activity near dunes'],
    parkingDifficulty: 'moderate',
    localInsights: [
      'Peak tourist season (Jun–Aug) significantly impacts parking and noise',
      'Monarch butterfly migration draws large crowds in late Oct–Nov',
      'Oceano Dunes SVRA — one of California\'s only beach driving areas nearby',
      'Higher rents partly driven by vacation rental demand',
      'Off-season (Jan–Mar) offers the best local experience',
    ],
    recentNews: [
      { category: 'Environment', headline: 'Beach erosion at Pismo worsens — boardwalk access temporarily limited', date: 'Mar 2025' },
      { category: 'Events', headline: 'Pismo Beach Clam Festival returns October — tourism spike expected', date: 'May 2025' },
      { category: 'Transport', headline: 'HWY 1 coastal closure at Ragged Point lifted — full access restored', date: 'Apr 2025' },
      { category: 'Housing', headline: 'Vacation rental income peaks in 93449 — long-term supply shrinks', date: 'Feb 2025' },
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
  if (pct < 0.35) return '#3b82f6';
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

// Dark saturated colors for map heatmap glow — rich jewel tones over satellite
export function getHeatmapColor(rent, monthlyIncome, maxRent = null) {
  if (!monthlyIncome || monthlyIncome <= 0) return '#0f172a'; // near-black navy
  if (maxRent && rent > maxRent) return '#4c0519'; // very deep crimson
  const pct = rent / monthlyIncome;
  if (pct < 0.28) return '#172554'; // very deep sapphire — comfortable
  if (pct < 0.35) return '#3b0764'; // very deep violet — manageable
  if (pct < 0.45) return '#7c2d12'; // very dark rust-orange — tight
  return '#4c0519'; // very deep crimson — out of range
}

export function matchesVibe(neighborhood, vibe) {
  if (!vibe || vibe === 'any') return true;
  return (neighborhood.vibes || []).includes(vibe);
}
