// Temporary page to pick the accent font for the hero title. Delete after choosing.
import {
  Playfair_Display,
  DM_Serif_Display,
  Cormorant_Garamond,
  Bricolage_Grotesque,
  Syne,
  Caveat,
} from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], style: "italic", weight: "500" });
const dmSerif = DM_Serif_Display({ subsets: ["latin", "latin-ext"], style: "italic", weight: "400" });
const cormorant = Cormorant_Garamond({ subsets: ["latin", "latin-ext"], style: "italic", weight: "600" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: "700" });
const syne = Syne({ subsets: ["latin", "latin-ext"], weight: "700" });
const caveat = Caveat({ subsets: ["latin", "latin-ext"], weight: "600" });

const OPTIONS = [
  { n: 1, name: "Playfair Display italic", note: "klasiska, eleganta antīkva (tagad uzlikta)", cls: playfair.className },
  { n: 2, name: "DM Serif Display italic", note: "trekna, izteiksmīga antīkva", cls: dmSerif.className },
  { n: 3, name: "Cormorant Garamond italic", note: "smalka, grāmatu stila", cls: cormorant.className },
  { n: 4, name: "Bricolage Grotesque", note: "moderns, raksturīgs groteska", cls: bricolage.className },
  { n: 5, name: "Syne", note: "plats, tehnoloģisks", cls: syne.className },
  { n: 6, name: "Caveat", note: "rokraksts", cls: caveat.className },
];

export default function FontsPreview() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-8 text-[15px] text-black">Akcenta fonta izvēle · pagaidu lapa</h1>
      <div className="space-y-6">
        {OPTIONS.map((o) => (
          <div key={o.n} className="rounded-2xl bg-neutral-100 px-6 py-6">
            <div className="mb-3 text-[13px] text-black">
              {o.n}. {o.name} · {o.note}
            </div>
            <div className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
              Personalizēts{" "}
              <span className={`${o.cls} text-gradient-flow`}>balss aģents</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
