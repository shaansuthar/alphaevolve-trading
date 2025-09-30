"use client";

import { useState } from "react";
import Image from "next/image";
import EvolveView from "./components/views/EvolveView";
import PortfolioView from "./components/views/PortfolioView";
import ThemeToggle from "./components/ThemeToggle";

export default function DarwinApp() {
  const [activeTab, setActiveTab] = useState("evolve");

  return (
    <div className="min-h-screen bg-background">
      {/* INSANE Header */}
      <header className=" top-0 z-50 animate-fade-in-up">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-fire animate-pulse-glow">
                  <Image
                    src="/logo.png"
                    alt="Darwin Logo"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                {/* <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-success to-emerald-400 rounded-full border-3 border-background animate-pulse"></div> */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-xl animate-rotate-glow"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gradient tracking-tight text-glow">
                  QuantEvolve
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  Evolutionary Trading Algorithm
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-8">
              <div className="hidden md:flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass-insane">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="text-foreground font-medium">Status:</span>
                  <span className="text-success font-semibold">Active</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full glass-insane">
                  <span className="text-foreground font-medium">P&L:</span>
                  <span className="text-success font-mono font-bold text-lg">
                    $134,283.83
                  </span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="order-b border-border/20 mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex space-x-3">
              <button
                onClick={() => setActiveTab("evolve")}
                className={`relative px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  activeTab === "evolve"
                    ? "text-white animate-gradient"
                    : "text-muted-foreground hover:text-foreground glass-insane"
                }`}
              >
                <span className="relative z-10">Evolve</span>
                {activeTab === "evolve" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl animate-gradient"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-lg"></div>
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab("portfolio")}
                className={`relative px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                  activeTab === "portfolio"
                    ? "text-white animate-gradient"
                    : "text-muted-foreground hover:text-foreground glass-insane"
                }`}
              >
                <span className="relative z-10">Portfolio</span>
                {activeTab === "portfolio" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl animate-gradient"></div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-lg"></div>
                  </>
                )}
              </button>
            </div>

            {/* Generate Button */}
            {activeTab === "evolve" && (
              <button className="relative group text-white font-bold text-base px-8 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
                <span className="relative z-10 flex items-center space-x-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  <span>Generate</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-accent/80 to-primary/80 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur-md"></div>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "evolve" && <EvolveView />}
        {activeTab === "portfolio" && <PortfolioView />}
      </main>
    </div>
  );
}
