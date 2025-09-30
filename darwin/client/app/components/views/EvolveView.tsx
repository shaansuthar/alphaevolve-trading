"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export default function EvolveView() {
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

  const [strategyCode, setStrategyCode] =
    useState(`class MACDConfig(StrategyConfig):
    instrument_id: InstrumentId
    fast_period: int = 12
    slow_period: int = 26
    trade_size: int = 1_000_000
    entry_threshold: float = 0.00010


class MACDStrategy(Strategy):
    def __init__(self, config: MACDConfig):
        super().__init__(config=config)
        # Our "trading signal"
        self.macd = MovingAverageConvergenceDivergence(
            fast_period=config.fast_period, 
            slow_period=config.slow_period, 
            price_type=PriceType.MID
        )

        self.trade_size = Quantity.from_int(config.trade_size)

        # Convenience
        self.position: Position | None = None

    def on_start(self):
        self.subscribe_quote_ticks(instrument_id=self.config.instrument_id)

    def on_stop(self):
        self.close_all_positions(self.config.instrument_id)
        self.unsubscribe_quote_ticks(instrument_id=self.config.instrument_id)

    def on_quote_tick(self, tick: QuoteTick):
        # Update indicator with new tick data
        self.macd.handle_quote_tick(tick)

        if not self.macd.initialized:
            return  # Wait for indicator to warm up

        self.check_for_entry()
        self.check_for_exit()

    def on_event(self, event: Event):
        if isinstance(event, PositionOpened):
            self.position = self.cache.position(event.position_id)

    def check_for_entry(self):
        # LONG signal: MACD above threshold
        if self.macd.value > self.config.entry_threshold:
            if self.position and self.position.side == PositionSide.LONG:
                return  # Already LONG

            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.BUY,
                quantity=self.trade_size,
            )
            self.submit_order(order)
        
        # SHORT signal: MACD below threshold
        elif self.macd.value < -self.config.entry_threshold:
            if self.position and self.position.side == PositionSide.SHORT:
                return  # Already SHORT

            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.SELL,
                quantity=self.trade_size,
            )
            self.submit_order(order)

    def check_for_exit(self):
        # Exit SHORT positions when MACD >= 0
        if self.macd.value >= 0.0:
            if self.position and self.position.side == PositionSide.SHORT:
                self.close_position(self.position)
        # Exit LONG positions when MACD < 0
        else:
            if self.position and self.position.side == PositionSide.LONG:
                self.close_position(self.position)

    def on_dispose(self):
        pass  # Cleanup
`);

  const [weights, setWeights] = useState({
    profit: 2.0,
    risk: -0.5,
    sharpe: 1.5,
    drawdown: -1.0,
  });

  const updateWeight = (metric: string, value: number) => {
    setWeights((prev) => ({ ...prev, [metric]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Strategy and Config Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Strategy Card - Takes 2 columns */}
        <div className="lg:col-span-2 card-fire animate-fade-in-up">
          <h2 className="text-2xl font-bold text-gradient mb-8 text-glow">
            Strategy
          </h2>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                Strategy Name
              </label>
              <input
                type="text"
                placeholder="e.g., Momentum Breakout Strategy"
                className="w-full px-4 py-3 border border-border/50 rounded-xl glass-insane text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">
                Algorithm Code
              </label>
              <div className="rounded-xl overflow-hidden shadow-fire border border-primary/10">
                <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 px-4 py-2 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-error/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-warning/60"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60"></div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      strategy.py
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                      Python
                    </span>
                  </div>
                </div>
                <Editor
                  height="500px"
                  defaultLanguage="python"
                  value={strategyCode}
                  onChange={(value) => setStrategyCode(value || "")}
                  theme={isDarkMode ? "darwin-dark" : "darwin-light"}
                  beforeMount={(monaco) => {
                    // Light theme
                    monaco.editor.defineTheme("darwin-light", {
                      base: "vs",
                      inherit: true,
                      rules: [
                        {
                          token: "comment",
                          foreground: "6b7280",
                          fontStyle: "italic",
                        },
                        {
                          token: "keyword",
                          foreground: "3b82f6",
                          fontStyle: "bold",
                        },
                        { token: "string", foreground: "10b981" },
                        { token: "number", foreground: "f59e0b" },
                        { token: "type", foreground: "8b5cf6" },
                        { token: "function", foreground: "06b6d4" },
                        { token: "variable", foreground: "1e40af" },
                        {
                          token: "class",
                          foreground: "3b82f6",
                          fontStyle: "bold",
                        },
                      ],
                      colors: {
                        "editor.background": "#ffffff",
                        "editor.foreground": "#1a1a1a",
                        "editor.lineHighlightBackground": "#dbeafe15",
                        "editor.selectionBackground": "#bfdbfe",
                        "editorLineNumber.foreground": "#9ca3af",
                        "editorLineNumber.activeForeground": "#3b82f6",
                        "editorCursor.foreground": "#3b82f6",
                        "editorWhitespace.foreground": "#e5e7eb",
                        "editorIndentGuide.background": "#f3f4f6",
                        "editorIndentGuide.activeBackground": "#d1d5db",
                      },
                    });

                    // Dark theme
                    monaco.editor.defineTheme("darwin-dark", {
                      base: "vs-dark",
                      inherit: true,
                      rules: [
                        {
                          token: "comment",
                          foreground: "6b7280",
                          fontStyle: "italic",
                        },
                        {
                          token: "keyword",
                          foreground: "60a5fa",
                          fontStyle: "bold",
                        },
                        { token: "string", foreground: "34d399" },
                        { token: "number", foreground: "fbbf24" },
                        { token: "type", foreground: "a78bfa" },
                        { token: "function", foreground: "22d3ee" },
                        { token: "variable", foreground: "93c5fd" },
                        {
                          token: "class",
                          foreground: "60a5fa",
                          fontStyle: "bold",
                        },
                      ],
                      colors: {
                        "editor.background": "#18181b",
                        "editor.foreground": "#fafafa",
                        "editor.lineHighlightBackground": "#27272a",
                        "editor.selectionBackground": "#3b82f680",
                        "editorLineNumber.foreground": "#71717a",
                        "editorLineNumber.activeForeground": "#60a5fa",
                        "editorCursor.foreground": "#60a5fa",
                        "editorWhitespace.foreground": "#27272a",
                        "editorIndentGuide.background": "#27272a",
                        "editorIndentGuide.activeBackground": "#3f3f46",
                      },
                    });
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    wordWrap: "off",
                    fontFamily:
                      "var(--font-jetbrains-mono), 'Courier New', monospace",
                    lineHeight: 20,
                    padding: { top: 16, bottom: 16 },
                    renderLineHighlight: "all",
                    cursorBlinking: "smooth",
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    folding: true,
                    smoothScrolling: true,
                    cursorSmoothCaretAnimation: "on",
                    renderWhitespace: "selection",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Config Card - Takes 1 column */}
        <div
          className="lg:col-span-1 card-fire animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-2xl font-bold text-gradient mb-8 text-glow">
            Config
          </h2>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Iterations
              </label>
              <input
                type="number"
                defaultValue={100}
                className="w-full px-4 py-3 border border-border/50 rounded-xl glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                AI Model
              </label>
              <select className="w-full px-4 py-3 border border-border/50 rounded-xl glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300">
                <option>Gemini 2.5 Pro</option>
                <option>GPT-4 (OpenAI)</option>
                <option>GPT-4 Turbo (OpenAI)</option>
                <option>GPT-3.5 Turbo (OpenAI)</option>
                <option>Claude 3 Opus (Anthropic)</option>
                <option>Claude 3 Sonnet (Anthropic)</option>
                <option>Claude 3 Haiku (Anthropic)</option>
                <option>Gemini Ultra (Google)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-semibold text-foreground">
                  Objective Function
                </label>
                <span className="text-xs text-muted-foreground">
                  Linear Combination
                </span>
              </div>

              <div className="mb-6 p-4 rounded-xl glass-insane border border-primary/20">
                <div className="text-sm font-mono text-foreground leading-relaxed">
                  <span className="text-muted-foreground">Score = </span>
                  <span
                    className={
                      weights.profit >= 0 ? "text-profit" : "text-error"
                    }
                  >
                    {weights.profit > 0 ? "+" : ""}
                    {weights.profit.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground"> × Profit </span>
                  <span
                    className={weights.risk >= 0 ? "text-profit" : "text-error"}
                  >
                    {weights.risk > 0 ? "+" : ""}
                    {weights.risk.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground"> × Risk </span>
                  <span
                    className={
                      weights.sharpe >= 0 ? "text-profit" : "text-error"
                    }
                  >
                    {weights.sharpe > 0 ? "+" : ""}
                    {weights.sharpe.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground"> × Sharpe </span>
                  <span
                    className={
                      weights.drawdown >= 0 ? "text-profit" : "text-error"
                    }
                  >
                    {weights.drawdown > 0 ? "+" : ""}
                    {weights.drawdown.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground"> × Drawdown</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-profit"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Profit
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={weights.profit}
                      onChange={(e) =>
                        updateWeight("profit", parseFloat(e.target.value))
                      }
                      className="w-20 px-3 py-1 text-sm font-mono text-right border border-border/50 rounded-lg glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={weights.profit}
                    onChange={(e) =>
                      updateWeight("profit", parseFloat(e.target.value))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-error"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Risk Penalty
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={weights.risk}
                      onChange={(e) =>
                        updateWeight("risk", parseFloat(e.target.value))
                      }
                      className="w-20 px-3 py-1 text-sm font-mono text-right border border-border/50 rounded-lg glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={weights.risk}
                    onChange={(e) =>
                      updateWeight("risk", parseFloat(e.target.value))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-primary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Sharpe Ratio
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={weights.sharpe}
                      onChange={(e) =>
                        updateWeight("sharpe", parseFloat(e.target.value))
                      }
                      className="w-20 px-3 py-1 text-sm font-mono text-right border border-border/50 rounded-lg glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={weights.sharpe}
                    onChange={(e) =>
                      updateWeight("sharpe", parseFloat(e.target.value))
                    }
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-4 h-4 text-warning"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        Drawdown Penalty
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={weights.drawdown}
                      onChange={(e) =>
                        updateWeight("drawdown", parseFloat(e.target.value))
                      }
                      className="w-20 px-3 py-1 text-sm font-mono text-right border border-border/50 rounded-lg glass-insane text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={weights.drawdown}
                    onChange={(e) =>
                      updateWeight("drawdown", parseFloat(e.target.value))
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
