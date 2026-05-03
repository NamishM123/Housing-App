import axios from 'axios';

// Realistic SLO fallback listings keyed by zip
const FALLBACK = {
  '93401': [
    { id: 'dl-1',  address: '785 Higuera St',       city: 'San Luis Obispo', zip: '93401', price: 2100, beds: 1, baths: 1, sqft: 680,  lat: 35.2808, lng: -120.6602, type: 'Apartment', available: 'Now',     features: ['Parking', 'Laundry in building', 'AC'], petFriendly: false, image: null },
    { id: 'dl-2',  address: '1142 Marsh St',        city: 'San Luis Obispo', zip: '93401', price: 2350, beds: 2, baths: 1, sqft: 950,  lat: 35.2795, lng: -120.6630, type: 'Apartment', available: 'Jun 1',   features: ['In-unit laundry', 'Deck', 'Parking'], petFriendly: true, image: null },
    { id: 'dl-3',  address: '540 Pacific St',       city: 'San Luis Obispo', zip: '93401', price: 1950, beds: 1, baths: 1, sqft: 600,  lat: 35.2835, lng: -120.6570, type: 'Studio',    available: 'Now',     features: ['Furnished option', 'Bike storage'], petFriendly: false, image: null },
    { id: 'dl-4',  address: '320 Osos St',          city: 'San Luis Obispo', zip: '93401', price: 3100, beds: 3, baths: 2, sqft: 1350, lat: 35.2820, lng: -120.6615, type: 'House',     available: 'Jul 1',   features: ['Garage', 'Yard', 'In-unit laundry', 'AC'], petFriendly: true, image: null },
    { id: 'dl-5',  address: '1067 Mill St',         city: 'San Luis Obispo', zip: '93401', price: 2275, beds: 2, baths: 1, sqft: 880,  lat: 35.2848, lng: -120.6605, type: 'Apartment', available: 'Now',     features: ['Walk to downtown', 'Hardwood floors', 'Laundry'], petFriendly: false, image: null },
    { id: 'dl-6',  address: '215 Broad St',         city: 'San Luis Obispo', zip: '93401', price: 1700, beds: 0, baths: 1, sqft: 480,  lat: 35.2780, lng: -120.6655, type: 'Studio',    available: 'Now',     features: ['Utilities included', 'Bike storage'], petFriendly: false, image: null },
    { id: 'dl-7',  address: '892 Monterey St',      city: 'San Luis Obispo', zip: '93401', price: 2495, beds: 2, baths: 2, sqft: 1020, lat: 35.2820, lng: -120.6588, type: 'Condo',     available: 'Jun 15',  features: ['Balcony', 'Garage', 'In-unit laundry', 'Pool'], petFriendly: true, image: null },
    { id: 'dl-8',  address: '455 Toro St',          city: 'San Luis Obispo', zip: '93401', price: 2800, beds: 2, baths: 2, sqft: 1100, lat: 35.2855, lng: -120.6638, type: 'Townhouse', available: 'Aug 1',   features: ['2-car garage', 'Patio', 'AC', 'Laundry'], petFriendly: true, image: null },
    { id: 'dl-9',  address: '1320 Garden St',       city: 'San Luis Obispo', zip: '93401', price: 1850, beds: 1, baths: 1, sqft: 620,  lat: 35.2772, lng: -120.6595, type: 'Apartment', available: 'Now',     features: ['Quiet street', 'Off-street parking'], petFriendly: false, image: null },
    { id: 'dl-10', address: '675 Palm St',          city: 'San Luis Obispo', zip: '93401', price: 3650, beds: 3, baths: 2, sqft: 1480, lat: 35.2840, lng: -120.6628, type: 'House',     available: 'Jul 15',  features: ['Backyard', 'Garage', 'Renovated kitchen', 'AC'], petFriendly: true, image: null },
    { id: 'dl-11', address: '230 Higuera St',       city: 'San Luis Obispo', zip: '93401', price: 2150, beds: 1, baths: 1, sqft: 720,  lat: 35.2772, lng: -120.6660, type: 'Loft',      available: 'Now',     features: ['Exposed brick', 'High ceilings', 'Walk to bars'], petFriendly: false, image: null },
    { id: 'dl-12', address: '1410 Nipomo St',       city: 'San Luis Obispo', zip: '93401', price: 2050, beds: 1, baths: 1, sqft: 700,  lat: 35.2780, lng: -120.6680, type: 'Apartment', available: 'Jun 1',   features: ['Pool', 'Laundry on site', 'Parking'], petFriendly: true, image: null },
    { id: 'dl-13', address: '725 Buchon St',        city: 'San Luis Obispo', zip: '93401', price: 2900, beds: 3, baths: 1, sqft: 1180, lat: 35.2735, lng: -120.6605, type: 'House',     available: 'Aug 1',   features: ['Historic home', 'Yard', 'Detached garage'], petFriendly: true, image: null },
    { id: 'dl-14', address: '480 Marsh St',         city: 'San Luis Obispo', zip: '93401', price: 1995, beds: 1, baths: 1, sqft: 650,  lat: 35.2790, lng: -120.6680, type: 'Apartment', available: 'Now',     features: ['Updated', 'Walk to creek', 'Parking'], petFriendly: false, image: null },
  ],
  '93405': [
    { id: 'cp-1', address: '1820 California Blvd', city: 'San Luis Obispo', zip: '93405', price: 2200, beds: 1, baths: 1, sqft: 700,  lat: 35.2970, lng: -120.6620, type: 'Apartment', available: 'Now',    features: ['Near Cal Poly', 'Pool', 'Parking'], petFriendly: false, image: null },
    { id: 'cp-2', address: '455 Grand Ave',        city: 'San Luis Obispo', zip: '93405', price: 2800, beds: 2, baths: 2, sqft: 1050, lat: 35.3020, lng: -120.6580, type: 'Condo',     available: 'Jun 15', features: ['In-unit laundry', 'Garage', 'Gym'], petFriendly: true,  image: null },
    { id: 'cp-3', address: '738 Murray Ave',       city: 'San Luis Obispo', zip: '93405', price: 1750, beds: 1, baths: 1, sqft: 550,  lat: 35.2995, lng: -120.6650, type: 'Studio',    available: 'Now',    features: ['Utilities included', 'Bike storage'], petFriendly: false, image: null },
    { id: 'cp-4', address: '270 Hathway Ave',      city: 'San Luis Obispo', zip: '93405', price: 3300, beds: 4, baths: 2, sqft: 1450, lat: 35.3030, lng: -120.6620, type: 'House',     available: 'Sep 1',  features: ['Walk to Cal Poly', 'Yard', 'Garage', 'Laundry'], petFriendly: true, image: null },
    { id: 'cp-5', address: '650 Foothill Blvd',    city: 'San Luis Obispo', zip: '93405', price: 2450, beds: 2, baths: 1, sqft: 880,  lat: 35.3015, lng: -120.6680, type: 'Apartment', available: 'Aug 15', features: ['Pool', 'Parking', 'Laundry on site'], petFriendly: false, image: null },
    { id: 'cp-6', address: '1540 Slack St',        city: 'San Luis Obispo', zip: '93405', price: 4200, beds: 5, baths: 3, sqft: 2100, lat: 35.3045, lng: -120.6655, type: 'House',     available: 'Sep 1',  features: ['Student rental', '5 BR', 'Yard', 'Multiple parking'], petFriendly: true, image: null },
    { id: 'cp-7', address: '925 Foothill Blvd',    city: 'San Luis Obispo', zip: '93405', price: 1980, beds: 1, baths: 1, sqft: 620,  lat: 35.3010, lng: -120.6700, type: 'Apartment', available: 'Now',    features: ['Bike to campus', 'Laundry', 'Parking'], petFriendly: false, image: null },
  ],
  '93424': [
    { id: 'ev-1', address: '3210 Edna Rd',         city: 'San Luis Obispo', zip: '93424', price: 1900, beds: 2, baths: 1, sqft: 900,  lat: 35.2180, lng: -120.5780, type: 'House',     available: 'Now',   features: ['Large yard', 'Garage', 'Quiet street'], petFriendly: true, image: null },
    { id: 'ev-2', address: '1840 Orcutt Rd',       city: 'San Luis Obispo', zip: '93424', price: 2100, beds: 3, baths: 2, sqft: 1200, lat: 35.2220, lng: -120.5730, type: 'House',     available: 'Jul 1', features: ['2-car garage', 'Fenced yard', 'AC'], petFriendly: true, image: null },
    { id: 'ev-3', address: '5610 Tiffany Ranch Rd', city: 'San Luis Obispo', zip: '93424', price: 2600, beds: 3, baths: 2, sqft: 1450, lat: 35.2160, lng: -120.5810, type: 'House',     available: 'Aug 1', features: ['Vineyard views', 'Garage', 'Patio'], petFriendly: true, image: null },
    { id: 'ev-4', address: '4400 Biddle Ranch Rd', city: 'San Luis Obispo', zip: '93424', price: 2350, beds: 2, baths: 2, sqft: 1100, lat: 35.2200, lng: -120.5765, type: 'Townhouse', available: 'Now',   features: ['Wine country', 'Patio', 'Garage'], petFriendly: true, image: null },
  ],
  '93402': [
    { id: 'lo-1', address: '2540 Los Osos Valley Rd', city: 'Los Osos', zip: '93402', price: 1950, beds: 1, baths: 1, sqft: 680,  lat: 35.3090, lng: -120.8240, type: 'Apartment', available: 'Now',   features: ['Nature views', 'Parking'], petFriendly: false, image: null },
    { id: 'lo-2', address: '1455 10th St',           city: 'Los Osos', zip: '93402', price: 2400, beds: 2, baths: 2, sqft: 1000, lat: 35.3120, lng: -120.8290, type: 'Condo',     available: 'Jun 1', features: ['Garage', 'Laundry', 'Near estuary'], petFriendly: true, image: null },
    { id: 'lo-3', address: '880 Bay Blvd',           city: 'Los Osos', zip: '93402', price: 2650, beds: 2, baths: 1, sqft: 890,  lat: 35.3060, lng: -120.8350, type: 'Cottage',   available: 'Now',   features: ['Ocean views', 'Yard', 'Garage'], petFriendly: true, image: null },
    { id: 'lo-4', address: '2125 Pecho Valley Rd',   city: 'Los Osos', zip: '93402', price: 3100, beds: 3, baths: 2, sqft: 1380, lat: 35.3030, lng: -120.8420, type: 'House',     available: 'Jul 15', features: ['Walk to Montaña de Oro', 'Yard', 'Garage', 'AC'], petFriendly: true, image: null },
    { id: 'lo-5', address: '1675 Santa Maria Ave',   city: 'Los Osos', zip: '93402', price: 2200, beds: 2, baths: 1, sqft: 800,  lat: 35.3105, lng: -120.8270, type: 'House',     available: 'Aug 1',  features: ['Quiet neighborhood', 'Parking', 'Yard'], petFriendly: true, image: null },
  ],
  '93442': [
    { id: 'mb-1', address: '445 Morro Bay Blvd', city: 'Morro Bay', zip: '93442', price: 2200, beds: 1, baths: 1, sqft: 650,  lat: 35.3640, lng: -120.8470, type: 'Apartment', available: 'Now',     features: ['Ocean views', 'Parking'], petFriendly: false, image: null },
    { id: 'mb-2', address: '1080 Main St',       city: 'Morro Bay', zip: '93442', price: 2700, beds: 2, baths: 1, sqft: 920,  lat: 35.3670, lng: -120.8510, type: 'Apartment', available: 'Jun 1',   features: ['Bay views', 'Garage', 'Laundry'], petFriendly: true,  image: null },
    { id: 'mb-3', address: '250 Beach St',       city: 'Morro Bay', zip: '93442', price: 3200, beds: 3, baths: 2, sqft: 1300, lat: 35.3620, lng: -120.8530, type: 'House',     available: 'Jul 15',  features: ['Steps to beach', 'Deck', 'Garage', 'AC'], petFriendly: true, image: null },
    { id: 'mb-4', address: '720 Embarcadero',    city: 'Morro Bay', zip: '93442', price: 2950, beds: 2, baths: 2, sqft: 1080, lat: 35.3680, lng: -120.8550, type: 'Condo',     available: 'Now',     features: ['Waterfront', 'Pool', 'Garage'], petFriendly: false, image: null },
    { id: 'mb-5', address: '525 Atascadero Rd',  city: 'Morro Bay', zip: '93442', price: 2450, beds: 2, baths: 2, sqft: 950,  lat: 35.3700, lng: -120.8460, type: 'Townhouse', available: 'Sep 1',   features: ['Garage', 'In-unit laundry', 'Yard'], petFriendly: true, image: null },
  ],
  '93422': [
    { id: 'at-1', address: '6540 El Camino Real', city: 'Atascadero', zip: '93422', price: 1750, beds: 1, baths: 1, sqft: 660,  lat: 35.4890, lng: -120.6700, type: 'Apartment', available: 'Now',   features: ['Parking', 'Laundry'], petFriendly: true, image: null },
    { id: 'at-2', address: '4200 Traffic Way',    city: 'Atascadero', zip: '93422', price: 2050, beds: 2, baths: 2, sqft: 1100, lat: 35.4920, lng: -120.6730, type: 'Townhouse', available: 'Jun 1', features: ['2 parking spots', 'In-unit laundry', 'Patio'], petFriendly: true, image: null },
    { id: 'at-3', address: '1855 Capistrano Ave', city: 'Atascadero', zip: '93422', price: 1650, beds: 1, baths: 1, sqft: 580,  lat: 35.4870, lng: -120.6750, type: 'Apartment', available: 'Now',   features: ['Pool', 'Gym', 'Parking'], petFriendly: false, image: null },
    { id: 'at-4', address: '8025 Morro Rd',       city: 'Atascadero', zip: '93422', price: 2350, beds: 3, baths: 2, sqft: 1300, lat: 35.4860, lng: -120.6790, type: 'House',     available: 'Jul 1', features: ['Yard', 'Garage', 'AC'], petFriendly: true, image: null },
    { id: 'at-5', address: '3500 Atascadero Ave', city: 'Atascadero', zip: '93422', price: 1950, beds: 2, baths: 1, sqft: 850,  lat: 35.4910, lng: -120.6720, type: 'Apartment', available: 'Aug 1', features: ['Updated kitchen', 'Parking', 'Laundry'], petFriendly: true, image: null },
  ],
  '93420': [
    { id: 'ag-1', address: '410 Branch St',    city: 'Arroyo Grande', zip: '93420', price: 2000, beds: 2, baths: 1, sqft: 880,  lat: 35.1190, lng: -120.5910, type: 'Apartment', available: 'Now',   features: ['Village location', 'Parking'], petFriendly: false, image: null },
    { id: 'ag-2', address: '1680 Halcyon Rd',  city: 'Arroyo Grande', zip: '93420', price: 2300, beds: 3, baths: 2, sqft: 1250, lat: 35.1210, lng: -120.5870, type: 'House',     available: 'Jun 1', features: ['Garage', 'Large yard', 'AC', 'In-unit laundry'], petFriendly: true, image: null },
    { id: 'ag-3', address: '550 Traffic Way',  city: 'Arroyo Grande', zip: '93420', price: 1850, beds: 1, baths: 1, sqft: 640,  lat: 35.1170, lng: -120.5940, type: 'Apartment', available: 'Now',   features: ['Parking', 'Pool'], petFriendly: true, image: null },
    { id: 'ag-4', address: '2120 Farroll Ave', city: 'Arroyo Grande', zip: '93420', price: 2550, beds: 3, baths: 2, sqft: 1320, lat: 35.1150, lng: -120.5870, type: 'House',     available: 'Aug 1', features: ['Garage', 'Yard', 'AC', 'Patio'], petFriendly: true, image: null },
    { id: 'ag-5', address: '885 Grand Ave',    city: 'Arroyo Grande', zip: '93420', price: 1700, beds: 1, baths: 1, sqft: 600,  lat: 35.1230, lng: -120.5860, type: 'Apartment', available: 'Now',   features: ['Pool', 'Parking', 'Laundry'], petFriendly: false, image: null },
  ],
  '93449': [
    { id: 'pb-1', address: '1220 Price St',         city: 'Pismo Beach', zip: '93449', price: 2450, beds: 1, baths: 1, sqft: 700,  lat: 35.1430, lng: -120.6430, type: 'Apartment', available: 'Now',   features: ['Walk to beach', 'Parking'], petFriendly: false, image: null },
    { id: 'pb-2', address: '505 Shell Beach Rd',    city: 'Pismo Beach', zip: '93449', price: 3000, beds: 2, baths: 2, sqft: 1050, lat: 35.1460, lng: -120.6390, type: 'Condo',     available: 'Jun 1', features: ['Ocean views', 'Pool', 'Garage', 'AC'], petFriendly: true, image: null },
    { id: 'pb-3', address: '780 Dolliver St',       city: 'Pismo Beach', zip: '93449', price: 2800, beds: 2, baths: 1, sqft: 900,  lat: 35.1400, lng: -120.6450, type: 'Apartment', available: 'Now',   features: ['Steps to pier', 'Deck', 'Laundry'], petFriendly: false, image: null },
    { id: 'pb-4', address: '2330 Cypress Ridge Pkwy', city: 'Pismo Beach', zip: '93449', price: 3400, beds: 3, baths: 2, sqft: 1400, lat: 35.1380, lng: -120.6300, type: 'House',     available: 'Aug 1', features: ['Golf course views', 'Garage', 'Patio'], petFriendly: true, image: null },
    { id: 'pb-5', address: '160 Ocean View Ave',    city: 'Pismo Beach', zip: '93449', price: 2700, beds: 2, baths: 1, sqft: 880,  lat: 35.1420, lng: -120.6470, type: 'Cottage',   available: 'Sep 1', features: ['Ocean breeze', 'Garage', 'Yard'], petFriendly: true, image: null },
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
        params: { zipCode: zip, status: 'Active', limit: 25 },
        headers: { 'X-Api-Key': apiKey },
      });
      // RentCast returns photos in several possible shapes depending on plan
      // and listing source. Be defensive: handle string-array, object-array,
      // and alternate field names.
      const extractPhotos = (l) => {
        const sources = [l.photos, l.images, l.media, l.mlsListing?.photos];
        const all = [];
        for (const arr of sources) {
          if (!Array.isArray(arr)) continue;
          for (const p of arr) {
            if (typeof p === 'string') all.push(p);
            else if (p?.url) all.push(p.url);
            else if (p?.href) all.push(p.href);
          }
        }
        return all;
      };

      const listings = (data || []).map(l => {
        const photos = extractPhotos(l);
        return {
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
          image: photos[0] || null,
          photos,
          listingUrl: l.listingUrl || null,
        };
      });
      return res.json({ listings, urls, source: 'rentcast' });
    } catch (err) {
      console.error('RentCast listings error:', err.message);
    }
  }

  const listings = (FALLBACK[zip] || FALLBACK['93401']).map(l => ({ ...l, urls }));
  res.json({ listings, urls, source: 'fallback' });
}
