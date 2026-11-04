// Delivery addresses of the demo customers (fictional), keyed by phone number.
// Used by the seed and to upgrade demo data saved before customers had addresses.
export const DEMO_ADDRESSES: Record<string, { address: string; state: string; pincode: string }> = {
  "9874000011": { address: "Flat 4B, Rosewood Apartments, 21 Gariahat Road", state: "West Bengal", pincode: "700019" },
  "9874000022": { address: "Roy Jewellers, 14 G.T. Road, Bally Bazar", state: "West Bengal", pincode: "711201" },
  "9874000033": { address: "CF-112, Sector I, Salt Lake City", state: "West Bengal", pincode: "700064" },
  "9874000044": { address: "Sarkar & Sons, Hill Cart Road, Mahananda Para", state: "West Bengal", pincode: "734001" },
  "9874000055": { address: "8/2 Alipore Park Place", state: "West Bengal", pincode: "700027" },
  "9874000066": { address: "Das Gold House, Benachity Market, Nachan Road", state: "West Bengal", pincode: "713213" },
  "9874000077": { address: "55 Park Circus, 2nd Floor", state: "West Bengal", pincode: "700017" },
  "9874000088": { address: "Mitra Ornaments, G.T. Road, Murgasol", state: "West Bengal", pincode: "713303" },
  "9874000099": { address: "Tower 3, 9C, Uniworld City, Action Area III", state: "West Bengal", pincode: "700160" },
};
