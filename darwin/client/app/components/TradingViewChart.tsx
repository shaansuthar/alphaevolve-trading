"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from "lightweight-charts";

interface ChartData {
  date: Date;
  value: number;
  pnl: number;
}

interface TradingViewChartProps {
  data: ChartData[];
}

export default function TradingViewChart({ data }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [timeRange, setTimeRange] = useState<
    "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL"
  >("1M");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Filter and downsample data based on time range
  const filteredData = (() => {
    const now = Date.now();
    const ranges = {
      "1D": 1 * 24 * 60 * 60 * 1000,
      "1W": 7 * 24 * 60 * 60 * 1000,
      "1M": 30 * 24 * 60 * 60 * 1000,
      "3M": 90 * 24 * 60 * 60 * 1000,
      "1Y": 365 * 24 * 60 * 60 * 1000,
      ALL: Infinity,
    };
    const timeRangeMs = ranges[timeRange];
    const cutoffTime = now - timeRangeMs;

    // First filter by time range
    const filtered =
      timeRange === "ALL"
        ? data
        : data.filter((point) => point.date.getTime() >= cutoffTime);

    // Then downsample based on view
    const downsampleInterval = {
      "1D": 15 * 60 * 1000, // 15 min bars
      "1W": 60 * 60 * 1000, // 1 hour bars
      "1M": 4 * 60 * 60 * 1000, // 4 hour bars
      "3M": 24 * 60 * 60 * 1000, // Daily bars
      "1Y": 24 * 60 * 60 * 1000, // Daily bars
      ALL: 7 * 24 * 60 * 60 * 1000, // Weekly bars
    }[timeRange];

    // Aggregate data into intervals
    const buckets = new Map<number, ChartData[]>();
    filtered.forEach((point) => {
      const bucketKey =
        Math.floor(point.date.getTime() / downsampleInterval) *
        downsampleInterval;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    });

    // Convert buckets to aggregated data points
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([timestamp, points]) => ({
        date: new Date(timestamp),
        value: points[points.length - 1].value, // Close value
        pnl: points.reduce((sum, p) => sum + p.pnl, 0), // Sum of P/L in interval
      }));
  })();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDarkMode ? "#18181b" : "#ffffff",
        },
        textColor: isDarkMode ? "#fafafa" : "#1a1a1a",
      },
      grid: {
        vertLines: { color: isDarkMode ? "#27272a" : "#f3f4f6" },
        horzLines: { color: isDarkMode ? "#27272a" : "#f3f4f6" },
      },
      rightPriceScale: {
        borderColor: isDarkMode ? "#27272a" : "#e5e7eb",
      },
      timeScale: {
        borderColor: isDarkMode ? "#27272a" : "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "#3b82f6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#3b82f6",
        },
        horzLine: {
          color: "#3b82f6",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#3b82f6",
        },
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries);
    candlestickSeries.applyOptions({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    // Convert data to candlestick format
    const chartData = filteredData.map((point, i) => {
      const open = i > 0 ? filteredData[i - 1].value : point.value;
      const close = point.value;
      // Much smaller wicks - only 0.1% to 0.3% beyond the body
      const wickSize = 0.001 + Math.random() * 0.002;
      const high = Math.max(open, close) * (1 + wickSize);
      const low = Math.min(open, close) * (1 - wickSize);

      // Convert to Unix timestamp (seconds) for LightweightCharts
      return {
        time: Math.floor(point.date.getTime() / 1000) as any,
        open,
        high,
        low,
        close,
      };
    });

    candlestickSeries.setData(chartData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [filteredData, isDarkMode]);

  // Calculate stats
  const minVal = Math.min(...filteredData.map((p) => p.value));
  const maxVal = Math.max(...filteredData.map((p) => p.value));
  const range = maxVal - minVal;
  const avgDaily =
    filteredData.reduce((sum, p) => sum + p.pnl, 0) / filteredData.length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="relative">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gradient">
          Portfolio Performance
        </h2>
        <div className="flex items-center space-x-1 bg-muted/10 rounded-lg p-1">
          {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                timeRange === range
                  ? "bg-primary text-white shadow-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="rounded-xl overflow-hidden border border-primary/10 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5"
      />

      {/* Chart Stats */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="text-center p-3 rounded-lg glass-insane">
          <p className="text-xs text-muted-foreground mb-1">Highest</p>
          <p className="text-sm font-bold text-profit">
            {formatCurrency(maxVal)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg glass-insane">
          <p className="text-xs text-muted-foreground mb-1">Lowest</p>
          <p className="text-sm font-bold text-error">
            {formatCurrency(minVal)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg glass-insane">
          <p className="text-xs text-muted-foreground mb-1">Range</p>
          <p className="text-sm font-bold text-foreground">
            {formatCurrency(range)}
          </p>
        </div>
        <div className="text-center p-3 rounded-lg glass-insane">
          <p className="text-xs text-muted-foreground mb-1">Avg Daily</p>
          <p className="text-sm font-bold text-gradient">
            {formatCurrency(avgDaily)}
          </p>
        </div>
      </div>
    </div>
  );
}
