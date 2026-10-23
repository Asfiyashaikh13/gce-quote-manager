import { Suspense } from "react";
import prisma from "@/lib/prisma";
import { QuoteManagerClient } from "./QuoteManagerClient";

async function QuoteManagerData() {
  let products: Array<{ id: string; name: string; code: string | null; rate: number }> = [];
  let factories: Array<{ id: string; name: string }> = [];

  try {
    const dbProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    products = dbProducts.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      rate: p.rate.toNumber(),
    }));

    const dbFactories = await prisma.factory.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    factories = dbFactories.map((f) => ({
      id: f.id,
      name: f.name,
    }));
  } catch (err) {
    console.error("Failed to load DB entities:", err);
  }

  if (products.length === 0) {
    products = [
      { id: "p1", code: "AL-SHUTTER-565", name: "Al Shutters 565", rate: 565 },
      { id: "p2", code: "AL-SHUTTER-430", name: "Al Shutters 430", rate: 430 },
      { id: "p3", code: "GLASS-PLAIN-8MM", name: "8mm plain glass", rate: 135 },
      { id: "p4", code: "MIRROR-POLISHED-5MM", name: "5mm mirror polished", rate: 145 },
    ];
  }

  if (factories.length === 0) {
    factories = [
      { id: "f1", name: "Veera Glass" },
      { id: "f2", name: "Wender Sachin" },
    ];
  }

  return (
    <QuoteManagerClient
      initialProducts={products}
      initialFactories={factories}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8">
          <div className="text-slate-600 font-medium animate-pulse">Loading Quote Manager...</div>
        </div>
      }
    >
      <QuoteManagerData />
    </Suspense>
  );
}
