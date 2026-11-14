import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { ShippingPackageFields } from "../app/admin/dashboard/shipping-package-fields";
import { emptyAutomaticPacking, type AutomaticPacking } from "../lib/shipping/automatic-packing";
import {
  measuredPackagesDraft,
  newMeasuredPackage,
  parsePackageSize,
  poundsToKg,
} from "../lib/shipping/measured-packages";

const packing: AutomaticPacking = {
  ...measuredPackagesDraft(emptyAutomaticPacking),
  strategy: "cartons_and_singles",
  verified: true,
  units: [{ variantSku: "", weightKg: poundsToKg(1), lengthCm: 0, widthCm: 0, heightCm: 0 }],
  cartons: [
    {
      ...newMeasuredPackage("", 40),
      ...parsePackageSize("21 x 16 x 14")!,
      grossWeightBySku: { "": poundsToKg(22) },
      partialMaxBoxes: 20,
      partialDimensionsCm: parsePackageSize("18 x 12 x 10")!,
      tareKg: poundsToKg(1),
    },
    {
      ...newMeasuredPackage("", 1),
      ...parsePackageSize("13 x 8 x 4")!,
      grossWeightBySku: { "": poundsToKg(2) },
    },
  ],
};

it("shows the EasyPost parcel measurements in inches and pounds", () => {
  const html = renderToStaticMarkup(
    <ShippingPackageFields value={packing} onChange={() => {}} variants={[]} boxesPerCarton={40} />,
  );
  for (const label of [
    "EasyPost shipping setup",
    "1 box ordered",
    "Full carton · 40 boxes",
    "Partial orders · 2–39 boxes",
    "Sealed weight (lb)",
    "Outside size (L × W × H, in)",
    "13 × 8 × 4",
    "Boxes that fit in this parcel",
    "Weight of one sellable box",
  ])
    expect(html).toContain(label);
  for (const label of [
    "Standard parcel for smaller orders",
    "Empty shipping box and padding",
    "Smaller carton",
    "Outside measurements",
    "(cm)",
    "(kg)",
  ])
    expect(html).not.toContain(label);
  expect(html).not.toContain("Check an order quantity");
  expect(html).not.toContain('aria-label="Help for');
  expect(html).toMatch(/input type="text" inputMode="decimal"/);
  expect(html).toContain('checked=""');
});

it("does not enable checkout confirmation without a one-box preset", () => {
  const fullOnly = { ...packing, cartons: [{ ...packing.cartons[0], capacityBySku: { "": 40 } }] };
  const html = renderToStaticMarkup(
    <ShippingPackageFields
      value={fullOnly}
      onChange={() => {}}
      variants={[]}
      boxesPerCarton={40}
    />,
  );
  expect(html).toContain("Complete every parcel field to enable checkout quotes.");
  expect(html).not.toContain('checked=""');
  expect(html).toMatch(/type="checkbox"[^>]*disabled=""/);
});

it("starts a fresh setup without any old partial-order fields", () => {
  const html = renderToStaticMarkup(
    <ShippingPackageFields
      value={measuredPackagesDraft(emptyAutomaticPacking)}
      onChange={() => {}}
      variants={[]}
      boxesPerCarton={40}
    />,
  );
  expect(html).toContain("Set up shipping");
  expect(html).not.toContain("Multipack");
  expect(html).not.toContain("Boxes in package");
  expect(html).not.toContain("Standard parcel");
});
