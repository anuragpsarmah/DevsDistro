import { describe, it, expect } from "vitest";
import { mergeChartData } from "../pages/sellerDashboard/utils/chartUtils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function makeChartData(sales = 0) {
  return MONTHS.map((month) => ({ month, sales }));
}

describe("mergeChartData", () => {
  it("merges all 12 months when full data is provided", () => {
    const prevData = makeChartData(0);
    const monthlySales = MONTHS.map((_, i) => ({ sales: (i + 1) * 100 }));
    const result = mergeChartData(prevData, monthlySales);

    result.forEach((item, i) => {
      expect(item.sales).toBe((i + 1) * 100);
    });
  });

  it("only updates the first N months when partial data is provided", () => {
    const prevData = makeChartData(0);
    const monthlySales = [{ sales: 500 }, { sales: 300 }, { sales: 800 }];
    const result = mergeChartData(prevData, monthlySales);

    expect(result[0].sales).toBe(500);
    expect(result[1].sales).toBe(300);
    expect(result[2].sales).toBe(800);
    // Remaining months should be unchanged (0)
    for (let i = 3; i < 12; i++) {
      expect(result[i].sales).toBe(0);
    }
  });

  it("leaves chart data unchanged when monthlySales is empty", () => {
    const prevData = makeChartData(999);
    const result = mergeChartData(prevData, []);

    result.forEach((item) => {
      expect(item.sales).toBe(999);
    });
  });

  it("preserves the month name on every entry", () => {
    const prevData = makeChartData(0);
    const monthlySales = MONTHS.map(() => ({ sales: 42 }));
    const result = mergeChartData(prevData, monthlySales);

    result.forEach((item, i) => {
      expect(item.month).toBe(MONTHS[i]);
    });
  });

  it("works correctly with a single month of data", () => {
    const prevData = makeChartData(0);
    const result = mergeChartData(prevData, [{ sales: 777 }]);

    expect(result[0].sales).toBe(777);
    for (let i = 1; i < 12; i++) {
      expect(result[i].sales).toBe(0);
    }
  });

  it("returns a new array and does not mutate the input", () => {
    const prevData = makeChartData(0);
    const result = mergeChartData(prevData, [{ sales: 100 }]);

    expect(result).not.toBe(prevData);
    expect(prevData[0].sales).toBe(0); // original unchanged
  });

  it("ignores extra sales entries beyond the array length", () => {
    const prevData = makeChartData(0);
    const monthlySales = Array.from({ length: 15 }, (_, i) => ({
      sales: i * 10,
    }));
    const result = mergeChartData(prevData, monthlySales);

    expect(result).toHaveLength(12);
    result.forEach((item, i) => {
      expect(item.sales).toBe(i * 10);
    });
  });

  it("correctly applies a sales value of 0 (does not treat 0 as falsy)", () => {
    const prevData = makeChartData(999);
    const monthlySales = [{ sales: 0 }, { sales: 500 }];
    const result = mergeChartData(prevData, monthlySales);

    expect(result[0].sales).toBe(0);
    expect(result[1].sales).toBe(500);
    // Remaining months should keep their prev value (999)
    for (let i = 2; i < 12; i++) {
      expect(result[i].sales).toBe(999);
    }
  });
});
