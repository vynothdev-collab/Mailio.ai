import type { ChartDataPoint } from "../types";
import { CHART_COLORS } from "../constants";

export const MOCK_CHART_DATA: ChartDataPoint[] = [
  { name: "Valid",       value: 6_238, percentage: "68.3%", color: CHART_COLORS.valid       },
  { name: "Invalid",     value: 877,   percentage: "9.6%",  color: CHART_COLORS.invalid     },
  { name: "Risky",       value: 1_711, percentage: "18.7%", color: CHART_COLORS.risky       },
  { name: "Disposable",  value: 300,   percentage: "3.3%",  color: CHART_COLORS.disposable  },
];

export const MOCK_CHART_TOTAL = 9_126;
