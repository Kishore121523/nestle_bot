import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

interface Product {
  name: string;
  price: number;
}

interface Store {
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  products?: Product[];
}

// Function to calculate the Haversine distance between two coordinates and it returns distance in kilometers
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, product, radiusKm = 20 } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number" || !product) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const filePath = path.resolve(process.cwd(), "public/mockStoreData.json");
    const data = await fs.readFile(filePath, "utf-8");
    const stores: Store[] = JSON.parse(data);

    const matches = stores
      .map((store) => {
        const distance = haversineDistance(lat, lng, store.lat, store.lng);
        const matchedProduct = store.products?.find((p) =>
          p.name.toLowerCase().includes(product.toLowerCase())
        );

        if (distance > radiusKm || !matchedProduct) return null;

        return {
          name: store.name,
          address: store.address,
          city: store.city,
          lat: store.lat,
          lng: store.lng,
          distance,
          products: [matchedProduct],
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      stores: matches,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
