import axios from 'axios';

// Realistic SLO fallback listings keyed by zip
const FALLBACK = {
  '93401': [
    { id: 'dl-1', address: '785 Higuera St', city: 'San Luis Obispo', zip: '93401', price: 2100, beds: 1, baths: 1, sqft: 680, lat: 35.2808, lng: -120.6602, type: 'Apartment', available: 'Now', features: ['Parking', 'Laundry in building', 'AC'], petFriendly: false, image: null },
    { id: 'dl-2', address: '1142 Marsh St', city: 'San Luis Obispo', zip: '93401', price: 2350, beds: 2, baths: 1, sqft: 950, lat: 35.2795, lng: -120.6630, type: 'Apartment', available: 'Jun 1', features: ['In-unit laundry', 'Deck', 'Parking'], petFriendly: true, image: null },
    { id: 'dl-3', address: '540 Pacific St', city: 'San Luis Obispo', zip: '93401', price: 1950, beds: 1, baths: 1, sqft: 600, lat: 35.2835, lng: -120.6570, type: 'Studio', available: 'Now', features: ['Furnished option', 'Bike storage'], petFriendly: false, image: null },
    { id: 'dl-4', address: '320 Osos St', city: 'San Luis Obispo', zip: '93401', price: 3100, beds: 3, baths: 2, sqft: 1350, lat: 35.2820, lng: -120.6615, type: 'House', available: 'Jul 1', features: ['Garage', 'Yard', 'In-unit laundry', 'AC'], petFriendly: true, image: null },
  ],
  '93405': [
    { id: 'cp-1', address: '1820 California Blvd', city: 'San Luis Obispo', zip: '93405', price: 2200, beds: 1, baths: 1, sqft: 700, lat: 35.2970, lng: -120.6620, type: 'Apartment', available: 'Now', features: ['Near Cal Poly', 'Pool', 'Parking'], petFriendly: false, image: null },
    { id: 'cp-2', address: '455 Grand Ave', city: 'San Luis Obispo', zip: '93405', price: 2800, beds: 2, baths: 2, sqft: 1050, lat: 35.3020, lng: -120.6580, type: 'Condo', available: 'Jun 15', features: ['In-unit laundry', 'Garage', 'Gym'], petFriendly: true, image: null },
    { id: 'cp-3', address: '738 Murray Ave', city: 'San Luis Obispo', zip: '93405', price: 1750, beds: 1, baths: 1, sqft: 550, lat: 35.2995, lng: -120.6650, type: 'Studio', available: 'Now', features: ['Utilities included', 'Bike storage'], petFriendly: false, image: null },
  ],
  '93424': [
    { id: 'ev-1', address: '3210 Edna Rd', city: 'San Luis Obispo', zip: '93424', price: 1900, beds: 2, baths: 1, sqft: 900, lat: 35.2180, lng: -120.5780, type: 'House', available: 'Now', features: ['Large yard', 'Garage', 'Quiet street'], petFriendly: true, image: null },
    { id: 'ev-2', address: '1840 Orcutt Rd', city: 'San Luis Obispo', zip: '93424', price: 2100, beds: 3, baths: 2, sqft: 1200, lat: 35.2220, lng: -120.5730, type: 'House', available: 'Jul 1', features: ['2-car garage', 'Fenced yard', 'AC'], petFriendly: true, image: null },
  ],
  '93402': [
    { id: 'lo-1', address: '2540 Los Osos Valley Rd', city: 'Los Osos', zip: '93402', price: 1950, beds: 1, baths: 1, sqft: 680, lat: 35.3090, lng: -120.8240, type: 'Apartment', available: 'Now', features: ['Nature views', 'Parking'], petFriendly: false, image: null },
    { id: 'lo-2', address: '1455 10th St', city: 'Los Osos', zip: '93402', price: 2400, beds: 2, baths: 2, sqft: 1000, lat: 35.3120, lng: -120.8290, type: 'Condo', available: 'Jun 1', features: ['Garage', 'Laundry', 'Near estuary'], petFriendly: true, image: null },
    { id: 'lo-3', address: '880 Bay Blvd', city: 'Los Osos', zip: '93402', price: 2650, beds: 2, baths: 1, sqft: 890, lat: 35.3060, lng: -120.8350, type: 'Cottage', available: 'Now', features: ['Ocean views', 'Yard', 'Garage'], petFriendly: true, image: null },
  ],
  '93442': [
    { id: 'mb-1', address: '445 Morro Bay Blvd', city: 'Morro Bay', zip: '93442', price: 2200, beds: 1, baths: 1, sqft: 650, lat: 35.3640, lng: -120.8470, type: 'Apartment', available: 'Now', features: ['Ocean views', 'Parking'], petFriendly: false, image: null },
    { id: 'mb-2', address: '1080 Main St', city: 'Morro Bay', zip: '93442', price: 2700, beds: 2, baths: 1, sqft: 920, lat: 35.3670, lng: -120.8510, type: 'Apartment', available: 'Jun 1', features: ['Bay views', 'Garage', 'Laundry'], petFriendly: true, image: null },
    { id: 'mb-3', address: '250 Beach St', city: 'Morro Bay', zip: '93442', price: 3200, beds: 3, baths: 2, sqft: 1300, lat: 35.3620, lng: -120.8530, type: 'House', available: 'Jul 15', features: ['Steps to beach', 'Deck', 'Garage', 'AC'], petFriendly: true, image: null },
  ],
  '93422': [
    { id: 'at-1', address: '6540 El Camino Real', city: 'Atascadero', zip: '93422', price: 1750, beds: 1, baths: 1, sqft: 660, lat: 35.4890, lng: -120.6700, type: 'Apartment', available: 'Now', features: ['Parking', 'Laundry'], petFriendly: true, image: null },
    { id: 'at-2', address: '4200 Traffic Way', city: 'Atascadero', zip: '93422', price: 2050, beds: 2, baths: 2, sqft: 1100, lat: 35.4920, lng: -120.6730, type: 'Townhouse', available: 'Jun 1', features: ['2 parking spots', 'In-unit laundry', 'Patio'], petFriendly: true, image: null },
    { id: 'at-3', address: '1855 Capistrano Ave', city: 'Atascadero', zip: '93422', price: 1650, beds: 1, baths: 1, sqft: 580, lat: 35.4870, lng: -120.6750, type: 'Apartment', available: 'Now', features: ['Pool', 'Gym', 'Parking'], petFriendly: false, image: null },
  ],
  '93420': [
    { id: 'ag-1', address: '410 Branch St', city: 'Arroyo Grande', zip: '93420', price: 2000, beds: 2, baths: 1, sqft: 880, lat: 35.1190, lng: -120.5910, type: 'Apartment', available: 'Now', features: ['Village location', 'Parking'], petFriendly: false, image: null },
    { id: 'ag-2', address: '1680 Halcyon Rd', city: 'Arroyo Grande', zip: '93420', price: 2300, beds: 3, baths: 2, sqft: 1250, lat: 35.1210, lng: -120.5870, type: 'House', available: 'Jun 1', features: ['Garage', 'Large yard', 'AC', 'In-unit laundry'], petFriendly: true, image: null },
    { id: 'ag-3', address: '550 Traffic Way', city: 'Arroyo Grande', zip: '93420', price: 1850, beds: 1, baths: 1, sqft: 640, lat: 35.1170, lng: -120.5940, type: 'Apartment', available: 'Now', features: ['Parking', 'Pool'], petFriendly: true, image: null },
  ],
  '93449': [
    { id: 'pb-1', address: '1220 Price St', city: 'Pismo Beach', zip: '93449', price: 2450, beds: 1, baths: 1, sqft: 700, lat: 35.1430, lng: -120.6430, type: 'Apartment', available: 'Now', features: ['Walk to beach', 'Parking'], petFriendly: false, image: null },
    { id: 'pb-2', address: '505 Shell Beach Rd', city: 'Pismo Beach', zip: '93449', price: 3000, beds: 2, baths: 2, sqft: 1050, lat: 35.1460, lng: -120.6390, type: 'Condo', available: 'Jun 1', features: ['Ocean views', 'Pool', 'Garage', 'AC'], petFriendly: true, image: null },
    { id: 'pb-3', address: '780 Dolliver St', city: 'Pismo Beach', zip: '93449', price: 2800, beds: 2, baths: 1, sqft: 900, lat: 35.1400, lng: -120.6450, type: 'Apartment', available: 'Now', features: ['Steps to pier', 'Deck', 'Laundry'], petFriendly: false, image: null },
  ],
};

// Build Zillow / Apartments.com / Craigslist search URLs per zip
function searchUrls(zip, city) {
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  return {
    zillow: `https://www.zillow.com/${citySlug}-ca-${zip}/rentals/`,
    apartments: `https://www.apartments.com/${citySlug}-ca/${zip}/`,
    craigslist: `https://slo.craigslist.org/search/apa?postal=${zip}&availabilityMode=0&sale_date=all+dates`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { zip, city } = req.query;
  if (!zip) return res.status(400).json({ error: 'zip required' });

  const apiKey = process.env.RENTCAST_API_KEY;
  const urls = searchUrls(zip, city || 'San Luis Obispo');

  // Try live RentCast listings
  if (apiKey && apiKey !== 'your_rentcast_key_here') {
    try {
      const { data } = await axios.get('https://api.rentcast.io/v1/listings/rental/long-term', {
        params: { zipCode: zip, status: 'Active', limit: 8 },
        headers: { 'X-Api-Key': apiKey },
      });
      const listings = (data || []).map(l => ({
        id: l.id,
        address: l.formattedAddress,
        city: l.city,
        zip: l.zipCode,
        price: l.price,
        beds: l.bedrooms,
        baths: l.bathrooms,
        sqft: l.squareFootage,
        lat: l.latitude,
        lng: l.longitude,
        type: l.propertyType,
        available: l.listedDate ? new Date(l.listedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now',
        features: [],
        petFriendly: false,
        image: l.photos?.[0] || null,
        listingUrl: l.listingUrl || null,
      }));
      return res.json({ listings, urls, source: 'rentcast' });
    } catch (err) {
      console.error('RentCast listings error:', err.message);
    }
  }

  const listings = (FALLBACK[zip] || FALLBACK['93401']).map(l => ({ ...l, urls }));
  res.json({ listings, urls, source: 'fallback' });
}
