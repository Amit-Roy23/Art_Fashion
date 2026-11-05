// Delivery addresses and GSTINs of the demo customers (fictional, valid check digits), keyed by phone.
// Used by the seed and to upgrade demo data saved before customers had addresses.
export const DEMO_ADDRESSES: Record<string, { address: string; state: string; pincode: string; gstin: string }> = {
  "9874000011": { address: "Flat 4B, Rosewood Apartments, 21 Gariahat Road", state: "West Bengal", pincode: "700019", gstin: "19AXQPS4821K1ZP" },
  "9874000022": { address: "Roy Jewellers, 14 G.T. Road, Bally Bazar", state: "West Bengal", pincode: "711201", gstin: "19AAEFR7613M1ZQ" },
  "9874000033": { address: "CF-112, Sector I, Salt Lake City", state: "West Bengal", pincode: "700064", gstin: "19BKLPC2290J1ZY" },
  "9874000044": { address: "Sarkar & Sons, Hill Cart Road, Mahananda Para", state: "West Bengal", pincode: "734001", gstin: "19AAKFS5512H1Z0" },
  "9874000055": { address: "8/2 Alipore Park Place", state: "West Bengal", pincode: "700027", gstin: "19ATTPA3094D1ZK" },
  "9874000066": { address: "Das Gold House, Benachity Market, Nachan Road", state: "West Bengal", pincode: "713213", gstin: "19AAEFD6670L1ZZ" },
  "9874000077": { address: "55 Park Circus, 2nd Floor", state: "West Bengal", pincode: "700017", gstin: "19BMRPA8823N1ZB" },
  "9874000088": { address: "Mitra Ornaments, G.T. Road, Murgasol", state: "West Bengal", pincode: "713303", gstin: "19AAKFM4419C1ZC" },
  "9874000099": { address: "Tower 3, 9C, Uniworld City, Action Area III", state: "West Bengal", pincode: "700160", gstin: "19CDXPG7731Q1ZE" },
};
