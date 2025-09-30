"use client";

import { useState, useRef } from "react";

interface ChartData {
  date: Date;
  value: number;
  pnl: number;
}

interface PerformanceChartProps {
  data: ChartData[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);
  const [timeRange, setTimeRange] = useState<
    "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL"
  >("1M");
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter data based on time range
  const filteredData = (() => {
    const ranges = {
      "1D": 1,
      "1W": 7,
      "1M": 30,
      "3M": 90,
      "1Y": 365,
      ALL: data.length,
    };
    const days = ranges[timeRange];
    return data.slice(-days);
  })();

  const minVal = Math.min(...filteredData.map((p) => p.value));
  const maxVal = Math.max(...filteredData.map((p) => p.value));
  const range = maxVal - minVal;
  const padding = range * 0.1;

  // Calculate chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const plotWidth = chartWidth - 80;
  const plotHeight = chartHeight - 60;

  // Generate path for line
  const linePath = filteredData
    .map((point, i) => {
      const x = 60 + (i / (filteredData.length - 1)) * plotWidth;
      const y =
        20 +
        plotHeight -
        ((point.value - (minVal - padding)) / (range + padding * 2)) *
          plotHeight;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // Generate area path
  const areaPath =
    linePath +
    ` L ${60 + plotWidth} ${20 + plotHeight} L 60 ${20 + plotHeight} Z`;

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if mouse is in plot area
    if (x < 60 || x > 60 + plotWidth || y < 20 || y > 20 + plotHeight) {
      setHoveredPoint(null);
      return;
    }

    // Find nearest point
    const relativeX = (x - 60) / plotWidth;
    const index = Math.round(relativeX * (filteredData.length - 1));
    const point = filteredData[index];

    if (point) {
      const pointX = 60 + (index / (filteredData.length - 1)) * plotWidth;
      const pointY =
        20 +
        plotHeight -
        ((point.value - (minVal - padding)) / (range + padding * 2)) *
          plotHeight;
      setHoveredPoint({ index, x: pointX, y: pointY });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: timeRange === "1Y" || timeRange === "ALL" ? "numeric" : undefined,
    }).format(date);
  };

  // Generate Y-axis labels
  const yAxisLabels = Array.from({ length: 6 }, (_, i) => {
    const value = minVal - padding + ((range + padding * 2) / 5) * i;
    return value;
  }).reverse();

  // Generate X-axis labels
  const xAxisLabels = Array.from({ length: 6 }, (_, i) => {
    const index = Math.floor((i / 5) * (filteredData.length - 1));
    return filteredData[index];
  });

  return (
    <div className="relative">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gradient ">
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

      {/* Chart */}
      <div className="relative rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/10 p-4">
        <svg
          ref={svgRef}
          width="100%"
          height="450"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="cursor-crosshair"
        >
          {/* Grid */}
          <defs>
            <pattern
              id="grid-pattern"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(59, 130, 246, 0.08)"
                strokeWidth="0.5"
              />
            </pattern>
            <linearGradient
              id="line-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient
              id="area-gradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.25)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
            </linearGradient>
          </defs>

          {/* Plot area background */}
          <rect
            x="60"
            y="20"
            width={plotWidth}
            height={plotHeight}
            fill="url(#grid-pattern)"
          />

          {/* Y-axis labels and lines */}
          {yAxisLabels.map((value, i) => {
            const y = 20 + (i / 5) * plotHeight;
            return (
              <g key={i}>
                <line
                  x1="60"
                  y1={y}
                  x2={60 + plotWidth}
                  y2={y}
                  stroke="rgba(59, 130, 246, 0.1)"
                  strokeWidth="1"
                  strokeDasharray={i === 0 || i === 5 ? "0" : "4 4"}
                />
                <text
                  x="55"
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-muted-foreground"
                  style={{ fontSize: "10px" }}
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xAxisLabels.map((point, i) => {
            if (!point) return null;
            const x = 60 + (i / 5) * plotWidth;
            return (
              <text
                key={i}
                x={x}
                y={20 + plotHeight + 20}
                textAnchor="middle"
                className="text-xs fill-muted-foreground"
                style={{ fontSize: "10px" }}
              >
                {formatDate(point.date)}
              </text>
            );
          })}

          {/* Area under curve */}
          <path d={areaPath} fill="url(#area-gradient)" />

          {/* Main line */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {filteredData.map((point, i) => {
            const x = 60 + (i / (filteredData.length - 1)) * plotWidth;
            const y =
              20 +
              plotHeight -
              ((point.value - (minVal - padding)) / (range + padding * 2)) *
                plotHeight;

            // Only show every nth point to avoid clutter
            const showPoint =
              filteredData.length < 50 ? i % 3 === 0 : i % 10 === 0;

            if (!showPoint && hoveredPoint?.index !== i) return null;

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoveredPoint?.index === i ? "6" : "3"}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={hoveredPoint?.index === i ? "2" : "1"}
                className="transition-all duration-150"
              />
            );
          })}

          {/* Crosshair */}
          {hoveredPoint && (
            <>
              <line
                x1={hoveredPoint.x}
                y1="20"
                x2={hoveredPoint.x}
                y2={20 + plotHeight}
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1="60"
                y1={hoveredPoint.y}
                x2={60 + plotWidth}
                y2={hoveredPoint.y}
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100}%`,
              transform:
                hoveredPoint.x > chartWidth / 2
                  ? "translate(-100%, -120%)"
                  : "translate(10px, -120%)",
            }}
          >
            <div className="bg-white/95 dark:bg-card/95 backdrop-blur-md border-2 border-primary/30 rounded-xl p-4 shadow-glow-lg min-w-[200px]">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatDate(filteredData[hoveredPoint.index].date)}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    Portfolio Value
                  </span>
                  <span className="text-lg font-bold text-gradient">
                    {formatCurrency(filteredData[hoveredPoint.index].value)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs font-medium text-muted-foreground">
                    Daily P/L
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      filteredData[hoveredPoint.index].pnl >= 0
                        ? "text-profit"
                        : "text-error"
                    }`}
                  >
                    {filteredData[hoveredPoint.index].pnl >= 0 ? "+" : ""}
                    {formatCurrency(filteredData[hoveredPoint.index].pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Change
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      filteredData[hoveredPoint.index].pnl >= 0
                        ? "text-profit"
                        : "text-error"
                    }`}
                  >
                    {filteredData[hoveredPoint.index].pnl >= 0 ? "+" : ""}
                    {(
                      (filteredData[hoveredPoint.index].pnl /
                        (filteredData[hoveredPoint.index].value -
                          filteredData[hoveredPoint.index].pnl)) *
                      100
                    ).toFixed(2)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
            {formatCurrency(
              filteredData.reduce((sum, p) => sum + p.pnl, 0) /
                filteredData.length
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
