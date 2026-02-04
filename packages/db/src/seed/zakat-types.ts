import { db } from "../index";
import { zakatTypes } from "../schema";
import { createId } from "../utils";

export async function seedZakatTypes() {
  console.log("Seeding Zakat Types...");

  const types = [
    {
      id: createId(),
      name: "Zakat Maal",
      slug: "zakat-maal",
      description:
        "Zakat atas harta yang tersimpan selama 1 tahun hijriyah (uang, emas, perak, saham, perdagangan)",
      icon: "💰",
      hasCalculator: true,
      isActive: true,
      displayOrder: 1,
    },
    {
      id: createId(),
      name: "Zakat Fitrah",
      slug: "zakat-fitrah",
      description:
        "Zakat yang wajib dikeluarkan sebelum Sholat Idul Fitri sebesar 2.5 kg atau 3.5 liter beras per jiwa",
      icon: "🌾",
      hasCalculator: true,
      isActive: true,
      displayOrder: 2,
    },
    {
      id: createId(),
      name: "Zakat Profesi",
      slug: "zakat-profesi",
      description:
        "Zakat penghasilan dari gaji, honorarium, atau profesi lainnya sebesar 2.5%",
      icon: "💼",
      hasCalculator: true,
      isActive: true,
      displayOrder: 3,
    },
    {
      id: createId(),
      name: "Zakat Pertanian",
      slug: "zakat-pertanian",
      description:
        "Zakat atas hasil pertanian dan perkebunan dengan nisab 653 kg",
      icon: "🌿",
      hasCalculator: true,
      isActive: false,
      displayOrder: 4,
    },
    {
      id: createId(),
      name: "Zakat Peternakan",
      slug: "zakat-peternakan",
      description:
        "Zakat atas ternak kambing, sapi, unta yang mencapai nisab dan haul",
      icon: "🐄",
      hasCalculator: true,
      isActive: false,
      displayOrder: 5,
    },
  ];

  for (const type of types) {
    await db.insert(zakatTypes).values(type).onConflictDoNothing();
  }

  console.log(`✓ Seeded ${types.length} zakat types`);
}
