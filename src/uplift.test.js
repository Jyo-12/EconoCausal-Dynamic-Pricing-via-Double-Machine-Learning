import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQiniCurve,
  getGainAtFraction,
  parseUpliftCurve,
  summarizeUpliftCurve,
} from "./uplift.js";

test("parses and orders curve points regardless of header casing", () => {
  const curve = parseUpliftCurve(
    " QINI_GAIN , FRACTION_TARGETED \n30,1\n10,0.25\n20,0.5\n"
  );

  assert.deepEqual(curve.points, [
    { fractionTargeted: 0.25, qiniGain: 10 },
    { fractionTargeted: 0.5, qiniGain: 20 },
    { fractionTargeted: 1, qiniGain: 30 },
  ]);
  assert.deepEqual(curve.warnings, []);
});

test("skips invalid rows with a visible warning", () => {
  const curve = parseUpliftCurve(
    "fraction_targeted,qini_gain\n0.25,10\nNaN,20\n1,Infinity\n1.2,30\n"
  );

  assert.deepEqual(curve.points, [{ fractionTargeted: 0.25, qiniGain: 10 }]);
  assert.match(curve.warnings[0], /3 invalid or out-of-range row/);
});

test("rejects empty data, missing columns, and curves with no valid points", () => {
  assert.throws(() => parseUpliftCurve(" \n"), /file is empty/);
  assert.throws(() => parseUpliftCurve("fraction_targeted,value\n0.5,10"), /expected columns/);
  assert.throws(
    () => parseUpliftCurve("fraction_targeted,qini_gain\nNaN,10"),
    /no valid finite curve points/
  );
});

test("summarizes endpoint and maximum gain, and interpolates comparisons", () => {
  const points = [
    { fractionTargeted: 0.1, qiniGain: 2 },
    { fractionTargeted: 0.5, qiniGain: 10 },
    { fractionTargeted: 1, qiniGain: 4 },
  ];

  assert.deepEqual(summarizeUpliftCurve(points), {
    finalGain: 4,
    finalFraction: 1,
    maximumGain: 10,
    maximumFraction: 0.5,
  });
  assert.equal(getGainAtFraction(points, 0.3), 6);
  assert.equal(getGainAtFraction(points, 0.05), null);
  assert.equal(getGainAtFraction(points, 0.5), 10);
});

test("calculates ranked cumulative gain using the treatment-control ratio", () => {
  const curve = calculateQiniCurve([
    { treatment: "1", outcome: "10", effect: "0.9" },
    { treatment: "0", outcome: "4", effect: "0.8" },
    { treatment: "1", outcome: "8", effect: "0.7" },
    { treatment: "0", outcome: "6", effect: "0.6" },
  ]);

  assert.deepEqual(curve.points, [
    { fractionTargeted: 0.25, qiniGain: 10 },
    { fractionTargeted: 0.5, qiniGain: 6 },
    { fractionTargeted: 0.75, qiniGain: 14 },
    { fractionTargeted: 1, qiniGain: 8 },
  ]);
  assert.deepEqual(curve.warnings, []);
});

test("skips invalid uploaded rows and requires both treatment groups", () => {
  const curve = calculateQiniCurve([
    { treatment: "1", outcome: "10", effect: "0.9" },
    { treatment: "0", outcome: "4", effect: "0.8" },
    { treatment: "2", outcome: "6", effect: "0.7" },
  ]);

  assert.equal(curve.points.length, 2);
  assert.match(curve.warnings[0], /1 rows were skipped/);
  assert.throws(
    () =>
      calculateQiniCurve([
        { treatment: "1", outcome: "10", effect: "0.9" },
      ]),
    /both treated/
  );
});
