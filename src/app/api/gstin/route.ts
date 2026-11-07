import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, x-api-key",
  "Access-Control-Max-Age": "86400",
};

// In-memory cache to save API credits (key -> data, TTL 24h)
interface CachedGstin {
  data: Record<string, unknown>;
  timestamp: number;
}
const gstinCache = new Map<string, CachedGstin>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Pre-seed Glass Care Enterprises verified GSTIN to preserve remaining API credits
gstinCache.set("29BNYPN6916L1ZU", {
  data: {
    gstin: "29BNYPN6916L1ZU",
    legalName: "GLASS CARE ENTERPRISES",
    tradeName: "GLASS CARE ENTERPRISES",
    status: "ACTIVE",
    registrationDate: "01/07/2017",
    taxpayerType: "Regular",
    address: "No. 122/1 Kogilu Main Road, Bellahalli Cross Yelahanka, Bengaluru Urban, Karnataka 560064",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560064",
    creditsRemaining: 3,
  },
  timestamp: Date.now(),
});

// Rate limiting map: ip -> { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const MAX_REQUESTS_PER_MIN = 30;
const RATE_WINDOW_MS = 60 * 1000;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawGstin = searchParams.get("gstin") || "";

    // 1. IP Rate Limiting
    const ip = request.headers.get("x-forwarded-for") || "client";
    const now = Date.now();
    const rateRecord = rateLimitMap.get(ip) || { count: 0, windowStart: now };

    if (now - rateRecord.windowStart > RATE_WINDOW_MS) {
      rateRecord.count = 1;
      rateRecord.windowStart = now;
      rateLimitMap.set(ip, rateRecord);
    } else {
      rateRecord.count++;
      if (rateRecord.count > MAX_REQUESTS_PER_MIN) {
        return NextResponse.json(
          { success: false, error: "Too many requests. Please wait a moment." },
          { status: 429, headers: CORS_HEADERS }
        );
      }
    }

    // 2. Format validation
    const cleanGstin = rawGstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!cleanGstin || cleanGstin.length !== 15 || !GSTIN_REGEX.test(cleanGstin)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid GSTIN format. Expected 15-character alphanumeric GSTIN (e.g. 29BNYPN6916L1ZU).",
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // 3. Cache check (saves user's limited API credits!)
    const cached = gstinCache.get(cleanGstin);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          cached: true,
          ...cached.data,
        },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // 4. Check API Key
    const apiKey = (process.env.GSTIN_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GSTIN API key not configured on server. Please configure GSTIN_API_KEY.",
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 5. Proxy to gstinapi.in
    const targetUrl = `https://www.gstinapi.in/v1/gstin/${encodeURIComponent(cleanGstin)}`;
    const apiRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    });

    const apiJson = await apiRes.json().catch(() => null);

    if (!apiRes.ok || !apiJson) {
      const errMsg = apiJson?.message || apiJson?.error || "External GSTIN service returned error";
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: apiRes.status >= 400 && apiRes.status < 500 ? apiRes.status : 502, headers: CORS_HEADERS }
      );
    }

    if (!apiJson.success || !apiJson.data) {
      return NextResponse.json(
        {
          success: false,
          error: apiJson.message || "No record found for this GSTIN.",
          status: "INACTIVE",
        },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const d = apiJson.data;
    const normalized = {
      gstin: cleanGstin,
      legalName: d.legal_name || "",
      tradeName: d.trade_name || d.legal_name || "",
      status: (d.status || "ACTIVE").toUpperCase(),
      registrationDate: d.registration_date || "",
      taxpayerType: d.taxpayer_type || "Regular",
      address: d.address || "",
      city: d.city || d.address_details?.city || d.address_details?.locality || "",
      state: d.address_details?.state || "Karnataka",
      pincode: d.pincode || d.address_details?.pincode || "",
      creditsRemaining: apiJson.credits_remaining,
    };

    // Cache result
    gstinCache.set(cleanGstin, { data: normalized, timestamp: now });

    return NextResponse.json(
      {
        success: true,
        cached: false,
        ...normalized,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("GSTIN verification failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error verifying GSTIN" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
