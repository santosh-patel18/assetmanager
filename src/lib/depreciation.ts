/**
 * Depreciation engine for Smart Ledger.
 * Pure functions — no database access. All calculations are deterministic.
 *
 * Supports three methods:
 *   1. Straight-Line: Equal monthly depreciation
 *   2. Declining Balance: Double-declining method (accelerated)
 *   3. Sum-of-Years-Digits: Front-loaded depreciation
 */

import type { DepreciationEntry, AssetBookValue } from '@/types';

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'sum_of_years';

// ─── Schedule Generators ─────────────────────────────────────────

/**
 * Generate a full depreciation schedule from acquisition date through useful life.
 */
export function calculateDepreciationSchedule(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  acquisitionDate: Date,
  method: DepreciationMethod
): DepreciationEntry[] {
  if (acquisitionCost <= 0 || usefulLifeMonths <= 0) return [];
  if (salvageValue < 0) salvageValue = 0;
  if (salvageValue >= acquisitionCost) return [];

  switch (method) {
    case 'straight_line':
      return straightLineSchedule(acquisitionCost, salvageValue, usefulLifeMonths, acquisitionDate);
    case 'declining_balance':
      return decliningBalanceSchedule(acquisitionCost, salvageValue, usefulLifeMonths, acquisitionDate);
    case 'sum_of_years':
      return sumOfYearsSchedule(acquisitionCost, salvageValue, usefulLifeMonths, acquisitionDate);
    default:
      return [];
  }
}

/**
 * Calculate the current book value of an asset based on elapsed time.
 */
export function getCurrentBookValue(
  acquisitionCost: number,
  salvageValue: number,
  usefulLifeMonths: number,
  acquisitionDate: Date,
  method: DepreciationMethod
): AssetBookValue {
  if (acquisitionCost <= 0 || usefulLifeMonths <= 0) {
    return { bookValue: acquisitionCost, totalDepreciation: 0, percentDepreciated: 0, monthsElapsed: 0 };
  }
  if (salvageValue < 0) salvageValue = 0;
  if (salvageValue >= acquisitionCost) {
    return { bookValue: acquisitionCost, totalDepreciation: 0, percentDepreciated: 0, monthsElapsed: 0 };
  }

  const now = new Date();
  const monthsElapsed = getMonthsElapsed(acquisitionDate, now);

  if (monthsElapsed <= 0) {
    return { bookValue: acquisitionCost, totalDepreciation: 0, percentDepreciated: 0, monthsElapsed: 0 };
  }

  const schedule = calculateDepreciationSchedule(
    acquisitionCost, salvageValue, usefulLifeMonths, acquisitionDate, method
  );

  // Sum depreciation up to current month
  const applicableEntries = schedule.slice(0, monthsElapsed);
  const totalDepreciation = applicableEntries.reduce((sum, e) => sum + e.depreciationAmt, 0);
  const bookValue = Math.max(acquisitionCost - totalDepreciation, salvageValue);
  const depreciableAmount = acquisitionCost - salvageValue;
  const percentDepreciated = depreciableAmount > 0
    ? Math.min(round2((totalDepreciation / depreciableAmount) * 100), 100)
    : 0;

  return {
    bookValue: round2(bookValue),
    totalDepreciation: round2(totalDepreciation),
    percentDepreciated,
    monthsElapsed: Math.min(monthsElapsed, usefulLifeMonths),
  };
}

// ─── Method Implementations ──────────────────────────────────────

function straightLineSchedule(
  cost: number, salvage: number, months: number, startDate: Date
): DepreciationEntry[] {
  const monthlyDep = round2((cost - salvage) / months);
  const entries: DepreciationEntry[] = [];
  let openingValue = cost;

  for (let i = 0; i < months; i++) {
    const { year, month } = getYearMonth(startDate, i + 1);
    // Last month absorbs rounding difference
    const dep = i === months - 1
      ? round2(openingValue - salvage)
      : Math.min(monthlyDep, round2(openingValue - salvage));
    const closingValue = round2(openingValue - dep);

    entries.push({ year, month, openingValue: round2(openingValue), depreciationAmt: dep, closingValue });
    openingValue = closingValue;
  }

  return entries;
}

function decliningBalanceSchedule(
  cost: number, salvage: number, months: number, startDate: Date
): DepreciationEntry[] {
  // Double-declining rate (annual rate / 12 for monthly)
  const annualRate = 2 / (months / 12);
  const monthlyRate = annualRate / 12;
  const entries: DepreciationEntry[] = [];
  let openingValue = cost;

  for (let i = 0; i < months; i++) {
    const { year, month } = getYearMonth(startDate, i + 1);

    if (openingValue <= salvage) {
      entries.push({ year, month, openingValue: round2(openingValue), depreciationAmt: 0, closingValue: round2(openingValue) });
      continue;
    }

    let dep = round2(openingValue * monthlyRate);
    // Don't depreciate below salvage
    if (openingValue - dep < salvage) {
      dep = round2(openingValue - salvage);
    }

    const closingValue = round2(openingValue - dep);
    entries.push({ year, month, openingValue: round2(openingValue), depreciationAmt: dep, closingValue });
    openingValue = closingValue;
  }

  return entries;
}

function sumOfYearsSchedule(
  cost: number, salvage: number, months: number, startDate: Date
): DepreciationEntry[] {
  const usefulYears = months / 12;
  // Sum of years digits: n*(n+1)/2
  const sumOfYears = (usefulYears * (usefulYears + 1)) / 2;
  const depreciableAmount = cost - salvage;
  const entries: DepreciationEntry[] = [];
  let openingValue = cost;

  for (let i = 0; i < months; i++) {
    const { year, month } = getYearMonth(startDate, i + 1);
    const currentYear = Math.floor(i / 12); // 0-indexed year
    const remainingYears = usefulYears - currentYear;
    // Annual depreciation for this year, divided by 12 for monthly
    const annualDep = (remainingYears / sumOfYears) * depreciableAmount;
    let dep = round2(annualDep / 12);

    // Don't depreciate below salvage
    if (openingValue - dep < salvage) {
      dep = round2(Math.max(openingValue - salvage, 0));
    }

    const closingValue = round2(openingValue - dep);
    entries.push({ year, month, openingValue: round2(openingValue), depreciationAmt: dep, closingValue });
    openingValue = closingValue;
  }

  return entries;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getMonthsElapsed(from: Date, to: Date): number {
  const yearDiff = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  return yearDiff * 12 + monthDiff;
}

function getYearMonth(startDate: Date, monthOffset: number): { year: number; month: number } {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + monthOffset);
  return { year: d.getFullYear(), month: d.getMonth() + 1 }; // 1-indexed month
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
