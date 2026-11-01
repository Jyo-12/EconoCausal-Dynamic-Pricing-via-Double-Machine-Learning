import Papa from "papaparse";

export function parseUpliftCurve(csvText) {
  if (typeof csvText !== "string" || !csvText.trim()) {
    throw new Error("the file is empty.");
  }

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const columns = parsed.meta.fields || [];
  const columnLookup = new Map(
    columns.map((column) => [column.trim().toLowerCase(), column])
  );
  const fractionColumn = columnLookup.get("fraction_targeted");
  const gainColumn = columnLookup.get("qini_gain");

  if (!fractionColumn || !gainColumn) {
    throw new Error(
      "expected columns fraction_targeted and qini_gain."
    );
  }

  let droppedRows = 0;
  const points = [];

  parsed.data.forEach((row) => {
    const rawFraction = String(row[fractionColumn] ?? "").trim();
    const rawGain = String(row[gainColumn] ?? "").trim();
    const fractionTargeted = Number(rawFraction);
    const qiniGain = Number(rawGain);

    if (
      !rawFraction ||
      !rawGain ||
      !Number.isFinite(fractionTargeted) ||
      fractionTargeted < 0 ||
      fractionTargeted > 1 ||
      !Number.isFinite(qiniGain)
    ) {
      droppedRows += 1;
      return;
    }

    points.push({ fractionTargeted, qiniGain });
  });

  if (points.length === 0) {
    throw new Error("no valid finite curve points were found.");
  }

  points.sort((a, b) => a.fractionTargeted - b.fractionTargeted);

  const warnings = [];
  if (droppedRows > 0) {
    warnings.push(
      `${droppedRows.toLocaleString()} invalid or out-of-range row(s) were skipped.`
    );
  }
  if (parsed.errors.length > 0) {
    warnings.push(
      `${parsed.errors.length.toLocaleString()} CSV parsing issue(s) were reported.`
    );
  }

  return { points, warnings };
}

export function calculateQiniCurve(records) {
  const validRecords = [];
  let droppedRows = 0;
  let treatedCount = 0;
  let controlCount = 0;

  records.forEach((record) => {
    const rawTreatment = String(record.treatment ?? "").trim();
    const rawOutcome = String(record.outcome ?? "").trim();
    const rawEffect = String(record.effect ?? "").trim();
    const treatment = Number(rawTreatment);
    const outcome = Number(rawOutcome);
    const effect = Number(rawEffect);

    if (
      !rawTreatment ||
      !rawOutcome ||
      !rawEffect ||
      !Number.isFinite(treatment) ||
      ![0, 1].includes(treatment) ||
      !Number.isFinite(outcome) ||
      !Number.isFinite(effect)
    ) {
      droppedRows += 1;
      return;
    }

    if (treatment === 1) treatedCount += 1;
    else controlCount += 1;

    validRecords.push({ treatment, outcome, effect });
  });

  if (treatedCount === 0 || controlCount === 0) {
    throw new Error(
      "both treated (1) and control (0) observations with valid values are required."
    );
  }

  validRecords.sort((a, b) => b.effect - a.effect);
  const controlAdjustment = treatedCount / controlCount;
  let treatedGain = 0;
  let controlGain = 0;
  const points = validRecords.map((record, index) => {
    if (record.treatment === 1) treatedGain += record.outcome;
    else controlGain += record.outcome;

    return {
      fractionTargeted: (index + 1) / validRecords.length,
      qiniGain: treatedGain - controlGain * controlAdjustment,
    };
  });

  const warnings =
    droppedRows > 0
      ? [
          `${droppedRows.toLocaleString()} rows were skipped because treatment, outcome, or effect was invalid.`,
        ]
      : [];

  return { points, warnings };
}

export function summarizeUpliftCurve(points) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new Error("Cannot summarize a curve without valid points.");
  }

  let maximum = points[0];
  points.forEach((point) => {
    if (point.qiniGain > maximum.qiniGain) maximum = point;
  });

  const finalPoint = points[points.length - 1];
  return {
    finalGain: finalPoint.qiniGain,
    finalFraction: finalPoint.fractionTargeted,
    maximumGain: maximum.qiniGain,
    maximumFraction: maximum.fractionTargeted,
  };
}

export function getGainAtFraction(points, targetFraction) {
  if (
    !Array.isArray(points) ||
    points.length === 0 ||
    targetFraction < points[0].fractionTargeted ||
    targetFraction > points[points.length - 1].fractionTargeted
  ) {
    return null;
  }

  let upperIndex = points.findIndex(
    (point) => point.fractionTargeted >= targetFraction
  );
  if (upperIndex === -1) return null;

  const upper = points[upperIndex];
  if (upper.fractionTargeted === targetFraction || upperIndex === 0) {
    return upper.qiniGain;
  }

  const lower = points[upperIndex - 1];
  const span = upper.fractionTargeted - lower.fractionTargeted;
  if (span === 0) return upper.qiniGain;

  const position = (targetFraction - lower.fractionTargeted) / span;
  return lower.qiniGain + position * (upper.qiniGain - lower.qiniGain);
}
