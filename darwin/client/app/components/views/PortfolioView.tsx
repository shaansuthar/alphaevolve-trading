"use client";

import { useState, useMemo } from "react";
import TradingViewChart from "../TradingViewChart";

interface Strategy {
  id: string;
  name: string;
  symbol: string;
  pair: string;
  pnl: number;
  pnlToday: number;
  isActive: boolean;
  winRate: number;
  totalTrades: number;
  gradientFrom: string;
  gradientTo: string;
}

// Generate synthetic performance data with P/L (intraday granularity)
const generateChartData = () => {
  const data = [];
  let value = 110000;
  const now = Date.now();

  // Generate data for past year with 15-minute intervals
  const intervalMs = 15 * 60 * 1000; // 15 minutes
  const yearInMs = 365 * 24 * 60 * 60 * 1000;
  const totalPoints = Math.floor(yearInMs / intervalMs);

  // Add trend and volatility parameters
  let trend = 3;
  let volatility = 40;
  let upwardDrift = 5; // Base upward drift
  let surgeMode = true;
  let surgeDuration = 0;

  for (let i = totalPoints; i >= 0; i--) {
    const prevValue = value;

    // Trigger surge periods (big upward momentum)
    if (!surgeMode && Math.random() < 0.005) {
      surgeMode = true;
      surgeDuration = 200 + Math.floor(Math.random() * 400); // 200-600 bars
      upwardDrift = 15 + Math.random() * 10; // Much stronger drift during surge
      trend = 20 + Math.random() * 20; // Strong upward trend
    }

    // End surge
    if (surgeMode) {
      surgeDuration--;
      if (surgeDuration <= 0) {
        surgeMode = false;
        upwardDrift = 5; // Back to normal drift
      }
    }

    // Change trend occasionally to create waves
    if (!surgeMode && Math.random() < 0.02) {
      trend = (Math.random() - 0.5) * 30;
    }

    // Change volatility occasionally
    if (Math.random() < 0.01) {
      volatility = surgeMode
        ? 40 + Math.random() * 60
        : 60 + Math.random() * 120;
    }

    // Combine random walk with trend and upward drift
    const randomChange = (Math.random() - 0.5) * volatility;
    const trendDecay = trend * 0.98; // Trend fades over time
    const change = randomChange + trendDecay + upwardDrift;

    trend = trendDecay;
    value = Math.max(value + change, 95000); // Allow some drawdown

    data.push({
      date: new Date(now - i * intervalMs),
      value: value,
      pnl: value - prevValue,
    });
  }
  return data;
};

export default function PortfolioView() {
  const [strategies, setStrategies] = useState<Strategy[]>([
    {
      id: "1",
      name: "MACD",
      symbol: "MA",
      pair: "EUR/USD",
      pnl: 45678.9,
      pnlToday: 1234.56,
      isActive: true,
      winRate: 72.3,
      totalTrades: 1234,
      gradientFrom: "primary/20",
      gradientTo: "accent/20",
    },
    {
      id: "2",
      name: "Momentum",
      symbol: "MB",
      pair: "GBP/USD",
      pnl: 23456.78,
      pnlToday: -234.12,
      isActive: true,
      winRate: 65.8,
      totalTrades: 892,
      gradientFrom: "accent/20",
      gradientTo: "primary/20",
    },
    {
      id: "3",
      name: "RSI",
      symbol: "RS",
      pair: "USD/JPY",
      pnl: 12345.67,
      pnlToday: 0,
      isActive: false,
      winRate: 58.9,
      totalTrades: 456,
      gradientFrom: "warning/20",
      gradientTo: "primary/20",
    },
    {
      id: "4",
      name: "Bollinger",
      symbol: "BB",
      pair: "BTC/USD",
      pnl: 34567.89,
      pnlToday: 890.45,
      isActive: true,
      winRate: 70.1,
      totalTrades: 678,
      gradientFrom: "profit/20",
      gradientTo: "primary/20",
    },
    {
      id: "5",
      name: "ML Pred",
      symbol: "ML",
      pair: "ETH/USD",
      pnl: 18234.59,
      pnlToday: 602.43,
      isActive: true,
      winRate: 68.7,
      totalTrades: 543,
      gradientFrom: "accent/20",
      gradientTo: "warning/20",
    },
  ]);

  const chartData = useMemo(() => generateChartData(), []);

  const toggleStrategy = (id: string) => {
    setStrategies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const pauseAll = () => {
    setStrategies((prev) => prev.map((s) => ({ ...s, isActive: false })));
  };

  const resumeAll = () => {
    setStrategies((prev) => prev.map((s) => ({ ...s, isActive: true })));
  };

  // Calculate portfolio metrics
  const totalValue = useMemo(
    () => 110000 + strategies.reduce((sum, s) => sum + s.pnl, 0),
    [strategies]
  );

  const totalPnlToday = useMemo(
    () => strategies.reduce((sum, s) => sum + s.pnlToday, 0),
    [strategies]
  );

  const totalProfit = useMemo(
    () => strategies.reduce((sum, s) => sum + s.pnl, 0),
    [strategies]
  );

  const avgWinRate = useMemo(
    () => strategies.reduce((sum, s) => sum + s.winRate, 0) / strategies.length,
    [strategies]
  );

  const totalTrades = useMemo(
    () => strategies.reduce((sum, s) => sum + s.totalTrades, 0),
    [strategies]
  );

  const activeCount = useMemo(
    () => strategies.filter((s) => s.isActive).length,
    [strategies]
  );

  const allPaused = activeCount === 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gradient">Portfolio Overview</h2>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 rounded-xl glass-insane text-sm font-medium text-foreground hover:bg-primary/10 transition-colors duration-200 cursor-pointer">
            View All Trades
          </button>
          <button className="px-4 py-2 rounded-xl glass-insane text-sm font-medium text-foreground hover:bg-primary/10 transition-colors duration-200 cursor-pointer">
            Export Report
          </button>
          <button
            onClick={allPaused ? resumeAll : pauseAll}
            className="px-4 py-2 rounded-xl glass-insane text-sm font-medium text-foreground hover:bg-primary/10 transition-colors duration-200 cursor-pointer flex items-center space-x-2"
          >
            <span>{allPaused ? "Resume All" : "Pause All"}</span>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              {allPaused ? (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              ) : (
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart Area - Takes 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Performance Chart */}
          <div className="card-fire animate-fade-in-up">
            <TradingViewChart data={chartData} />
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              className="card-fire animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <p className="text-xs text-muted-foreground mb-1">
                Today&apos;s P/L
              </p>
              <p
                className={`text-xl font-bold ${
                  totalPnlToday >= 0 ? "text-profit" : "text-error"
                }`}
              >
                {totalPnlToday >= 0 ? "+" : ""}$
                {Math.abs(totalPnlToday).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  totalPnlToday >= 0 ? "text-profit" : "text-error"
                }`}
              >
                {totalPnlToday >= 0 ? "+" : ""}
                {((totalPnlToday / totalValue) * 100).toFixed(2)}%
              </p>
            </div>
            <div
              className="card-fire animate-fade-in-up"
              style={{ animationDelay: "0.15s" }}
            >
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-xl font-bold text-gradient">
                {avgWinRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">This Month</p>
            </div>
            <div
              className="card-fire animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-xl font-bold text-gradient">
                {totalTrades.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">All Time</p>
            </div>
            <div
              className="card-fire animate-fade-in-up"
              style={{ animationDelay: "0.25s" }}
            >
              <p className="text-xs text-muted-foreground mb-1">Active</p>
              <p className="text-xl font-bold text-gradient">
                {activeCount}/{strategies.length}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Strategies</p>
            </div>
          </div>
        </div>

        {/* Sidebar - Takes 1 column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Total Value Card */}
          <div
            className="card-fire animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Value</p>
              <p className="text-3xl font-bold text-gradient mb-1">
                $
                {totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex items-center justify-center space-x-1 text-profit">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-semibold">
                  +{((totalProfit / 110000) * 100).toFixed(1)}% All Time
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/30 dark:border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Initial</span>
                <span className="font-medium text-foreground">$110,000.00</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Profit</span>
                <span className="font-medium text-profit">
                  +$
                  {totalProfit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Active Strategies */}
          <div
            className="card-fire animate-fade-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <h3 className="text-lg font-bold text-gradient mb-4">
              Strategies ({activeCount} Active)
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleStrategy(strategy.id)}
                      className={`w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center ${
                        strategy.isActive
                          ? "bg-error/10 hover:bg-error/20 text-error"
                          : "bg-profit/10 hover:bg-profit/20 text-profit"
                      }`}
                      title={
                        strategy.isActive ? "Pause strategy" : "Resume strategy"
                      }
                    >
                      {strategy.isActive ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {strategy.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {strategy.pair}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        strategy.pnlToday >= 0
                          ? "text-profit"
                          : strategy.pnlToday < 0
                          ? "text-error"
                          : "text-muted-foreground"
                      }`}
                    >
                      {strategy.pnlToday >= 0 && strategy.pnlToday > 0
                        ? "+"
                        : ""}
                      {strategy.pnlToday === 0
                        ? "$0"
                        : `$${Math.abs(strategy.pnlToday).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 }
                          )}`}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        strategy.isActive
                          ? "bg-profit/10 text-profit"
                          : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      {strategy.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
