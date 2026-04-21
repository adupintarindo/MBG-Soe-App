/**
 * Demo data for Weekly Price List · shown when DB is empty, so stakeholders
 * can preview the layout before real data is imported. Prices are realistic
 * April 2026 Jakarta-area Rp/kg figures across 5 suppliers × 15 ingredients.
 * Remove once real `price_periods` + `weekly_prices` rows exist.
 */

import type {
  PriceListMatrixRow,
  PricePeriod,
  PriceWeek
} from "./types";

const DEMO_PERIOD_ID = -1;

export const demoPeriod: PricePeriod = {
  id: DEMO_PERIOD_ID,
  name: "Apr 2026 · Demo",
  start_date: "2026-04-01",
  end_date: "2026-04-28",
  active: true,
  notes: "Data simulasi untuk preview layout."
};

export const demoWeeks: PriceWeek[] = [
  {
    id: -101,
    period_id: DEMO_PERIOD_ID,
    week_no: 1,
    start_date: "2026-03-30",
    end_date: "2026-04-05",
    label: "Wk 1: 30 Mar – 5 Apr"
  },
  {
    id: -102,
    period_id: DEMO_PERIOD_ID,
    week_no: 2,
    start_date: "2026-04-06",
    end_date: "2026-04-12",
    label: "Wk 2: 6 – 12 Apr"
  },
  {
    id: -103,
    period_id: DEMO_PERIOD_ID,
    week_no: 3,
    start_date: "2026-04-13",
    end_date: "2026-04-19",
    label: "Wk 3: 13 – 19 Apr"
  },
  {
    id: -104,
    period_id: DEMO_PERIOD_ID,
    week_no: 4,
    start_date: "2026-04-20",
    end_date: "2026-04-26",
    label: "Wk 4: 20 – 26 Apr"
  }
];

type DemoBlock = {
  commodity: PriceListMatrixRow["commodity"];
  ingredient: string;
  itemCode: string | null;
  entries: Array<{
    supplierId: string;
    supplierName: string;
    prices: [number | null, number | null, number | null, number | null];
  }>;
};

const BLOCKS: DemoBlock[] = [
  {
    commodity: "BERAS",
    ingredient: "Beras Premium",
    itemCode: "BRS-PREM",
    entries: [
      {
        supplierId: "demo-sup-01",
        supplierName: "Koperasi Tani Makmur",
        prices: [14800, 14900, 15100, 15000]
      },
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [15200, 15100, 15300, 15250]
      },
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [14600, 14700, 14900, 14850]
      }
    ]
  },
  {
    commodity: "BERAS",
    ingredient: "Beras Medium",
    itemCode: "BRS-MED",
    entries: [
      {
        supplierId: "demo-sup-01",
        supplierName: "Koperasi Tani Makmur",
        prices: [12500, 12600, 12750, 12700]
      },
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [12800, 12900, 13000, 12950]
      }
    ]
  },
  {
    commodity: "SAYURAN",
    ingredient: "Bayam Hijau",
    itemCode: "SAY-BYM",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [8500, 9000, 8800, 9200]
      },
      {
        supplierId: "demo-sup-05",
        supplierName: "Toko Sejahtera",
        prices: [9200, 9400, 9100, 9500]
      }
    ]
  },
  {
    commodity: "SAYURAN",
    ingredient: "Wortel",
    itemCode: "SAY-WRT",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [12500, 12800, 13200, 13000]
      },
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [13000, 13200, 13500, null]
      }
    ]
  },
  {
    commodity: "SAYURAN",
    ingredient: "Kangkung",
    itemCode: "SAY-KKG",
    entries: [
      {
        supplierId: "demo-sup-05",
        supplierName: "Toko Sejahtera",
        prices: [6500, 7000, 6800, 7200]
      }
    ]
  },
  {
    commodity: "BUAH",
    ingredient: "Pisang Cavendish",
    itemCode: "BH-PSG",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [16500, 17000, 17200, 17500]
      },
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [15800, 16200, 16500, 16800]
      }
    ]
  },
  {
    commodity: "BUAH",
    ingredient: "Jeruk Medan",
    itemCode: "BH-JRK",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [24000, 24500, 25200, 25800]
      }
    ]
  },
  {
    commodity: "PROTEIN_HEWANI",
    ingredient: "Ayam Karkas",
    itemCode: "PH-AYM",
    entries: [
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [38500, 39000, 40200, 41000]
      },
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [39500, 40200, 41000, 41500]
      }
    ]
  },
  {
    commodity: "PROTEIN_HEWANI",
    ingredient: "Telur Ayam Negeri",
    itemCode: "PH-TLR",
    entries: [
      {
        supplierId: "demo-sup-01",
        supplierName: "Koperasi Tani Makmur",
        prices: [28500, 29000, 29800, 30200]
      },
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [29000, 29500, 30500, 31000]
      },
      {
        supplierId: "demo-sup-05",
        supplierName: "Toko Sejahtera",
        prices: [29500, 30000, 31000, 31500]
      }
    ]
  },
  {
    commodity: "PROTEIN_HEWANI",
    ingredient: "Ikan Lele",
    itemCode: "PH-LEL",
    entries: [
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [22500, 23000, 23500, 24000]
      }
    ]
  },
  {
    commodity: "PROTEIN_NABATI",
    ingredient: "Tahu Putih",
    itemCode: "PN-THU",
    entries: [
      {
        supplierId: "demo-sup-01",
        supplierName: "Koperasi Tani Makmur",
        prices: [10500, 10800, 11000, 11200]
      },
      {
        supplierId: "demo-sup-05",
        supplierName: "Toko Sejahtera",
        prices: [11000, 11200, 11500, 11800]
      }
    ]
  },
  {
    commodity: "PROTEIN_NABATI",
    ingredient: "Tempe",
    itemCode: "PN-TPE",
    entries: [
      {
        supplierId: "demo-sup-01",
        supplierName: "Koperasi Tani Makmur",
        prices: [12500, 12800, 13000, 13200]
      },
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [13000, 13200, 13500, 13800]
      }
    ]
  },
  {
    commodity: "BUMBU_KERING",
    ingredient: "Bawang Merah",
    itemCode: "BK-BWM",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [36000, 38000, 40500, 42000]
      },
      {
        supplierId: "demo-sup-05",
        supplierName: "Toko Sejahtera",
        prices: [37500, 39500, 41000, 43000]
      }
    ]
  },
  {
    commodity: "BUMBU_KERING",
    ingredient: "Bawang Putih",
    itemCode: "BK-BWP",
    entries: [
      {
        supplierId: "demo-sup-04",
        supplierName: "PT Segar Nusantara",
        prices: [31000, 32000, 33500, 34000]
      },
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [32500, 33000, 34200, 35000]
      }
    ]
  },
  {
    commodity: "MINYAK",
    ingredient: "Minyak Goreng Curah",
    itemCode: "MYK-CRH",
    entries: [
      {
        supplierId: "demo-sup-02",
        supplierName: "UD Sumber Rejeki",
        prices: [16200, 16400, 16800, 17000]
      },
      {
        supplierId: "demo-sup-03",
        supplierName: "CV Berkah Pangan",
        prices: [16800, 17000, 17200, 17500]
      }
    ]
  }
];

function computeStats(prices: Array<number | null>): {
  avg: number | null;
  min: number | null;
  max: number | null;
} {
  const vals = prices.filter((v): v is number => v != null);
  if (vals.length === 0) return { avg: null, min: null, max: null };
  return {
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    min: Math.min(...vals),
    max: Math.max(...vals)
  };
}

export const demoRows: PriceListMatrixRow[] = BLOCKS.flatMap((block) =>
  block.entries.map((e) => {
    const stats = computeStats(e.prices);
    return {
      supplier_id: e.supplierId,
      supplier_name: e.supplierName,
      commodity: block.commodity,
      ingredient_name: block.ingredient,
      item_code: block.itemCode,
      period_id: DEMO_PERIOD_ID,
      period_name: demoPeriod.name,
      w1: e.prices[0],
      w2: e.prices[1],
      w3: e.prices[2],
      w4: e.prices[3],
      w5: null,
      w6: null,
      w7: null,
      w8: null,
      w9: null,
      w10: null,
      w11: null,
      w12: null,
      avg_per_kg: stats.avg,
      min_per_kg: stats.min,
      max_per_kg: stats.max
    };
  })
);
