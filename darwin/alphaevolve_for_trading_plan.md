# Final Plan: Implementing AlphaEvolve for Algorithmic Trading

This document outlines the complete, consolidated plan for building a framework to rapidly evolve and test algorithmic trading strategies, using the AlphaEvolve architecture on the Google Agent Development Kit (ADK) and Vertex AI.

## 1. Project Goal

The primary objective is to create a system that automates the discovery of novel, high-performing trading algorithms. The system will evolve an initial template algorithm through a process of mutation and selection, guided by a rigorous backtesting engine. The final output will be a diverse set of elite strategies, ready for forward-testing in a simulated paper-trading environment.

## 2. Overall Architecture

The system is designed as a **dual-evolutionary loop**:

1.  **Inner Loop (Code Evolution):** Evolves the trading algorithm's code, guided by a MAP-Elites database to ensure a diversity of strategies is explored.
2.  **Outer Loop (Prompt Evolution):** Periodically uses DSPy to optimize the prompts that guide the code evolution, making the creative mutation process itself more effective over time.

This will be orchestrated by a central `AlphaEvolveController` agent.

## 3. Core Components

#### **User-Provided Assets**

1.  **Initial Trading Algorithm:** A Python file containing a template trading algorithm. It must contain functions for decision-making (e.g., `on_tick`, `get_signal`) and have sections marked with `# EVOLVE-BLOCK-START` and `# EVOLVE-BLOCK-END` to designate the mutable logic.
2.  **Historical Datasets:** A collection of datasets (e.g., CSV files of price data) specified at configuration time. These will be used by the backtesting engine.

#### **Primary Agent: The Controller**

*   **`AlphaEvolveController` (`BaseAgent`):** This is the `root_agent` and central orchestrator. It manages the entire workflow, including the inner and outer evolutionary loops, and coordinates all other components.

#### **Evolutionary Engine Components**

1.  **`EvolverModule` (DSPy Module):**
    *   **Role:** The **Mutator**. This module, built with DSPy, replaces a static `LlmAgent`. Its purpose is to generate creative and effective code `diffs` to mutate the trading algorithm.
    *   **Optimization:** Its prompts will be periodically optimized by the `DSPyCompilerAgent`.

2.  **`ProgramDatabase` (with MAP-Elites):**
    *   **Role:** The **Selector and Strategy Archive**. This is the core of the quality diversity mechanism.
    *   **Implementation:** It will be a Python class implementing the MAP-Elites algorithm. It will maintain a multi-dimensional grid of the best-found trading algorithms, where the dimensions are key strategy features.
    *   **Example Feature Dimensions (The "Map"):**
        *   **Risk Profile:** e.g., Maximum Drawdown.
        *   **Activity Profile:** e.g., Average Trade Frequency.
        *   **Complexity Profile:** e.g., Number of indicators used.
    *   This ensures the system discovers the best algorithm for every *type* of trading style (e.g., best low-risk/low-frequency strategy, best high-risk/high-frequency strategy, etc.).

3.  **`DSPyCompilerAgent` (`BaseAgent`):**
    *   **Role:** The **Prompt Optimizer**.
    *   **Purpose:** Periodically, this agent will be called by the controller. It will take the collection of elite strategies from the `ProgramDatabase` as training data and use the DSPy compiler to generate improved prompts for the `EvolverModule`.

#### **Core Tools**

1.  **`evaluate_program` (The Backtester):**
    *   **Type:** `FunctionTool`.
    *   **Purpose:** To score a given algorithm. It will:
        1.  Load the historical datasets.
        2.  Run the algorithm's code against the data in a simulated backtest.
        3.  Calculate key performance indicators (KPIs) like `profit`, `sharpe_ratio`, `max_drawdown`.
        4.  Return a dictionary of these KPIs, including a final weighted `score`.

2.  **`extract_features` (The Strategy Analyzer):**
    *   **Type:** `FunctionTool`.
    *   **Purpose:** To analyze an algorithm and its backtest results to determine its position on the MAP-Elites grid. It will return a dictionary of the feature values (e.g., `{"max_drawdown": 0.15, "trade_frequency": 50}`).

## 4. The End-to-End Workflow

1.  **Setup:** The user provides the initial algorithm template and configures the location of the historical datasets.
2.  **Evolution:** The `AlphaEvolveController` starts the main loop.
    *   **For each generation (Inner Loop):**
        1.  It samples a diverse set of parent strategies and inspirations from the `ProgramDatabase` (MAP-Elites).
        2.  It calls the `EvolverModule` to generate a new code `diff`.
        3.  It applies the `diff` to create a new child algorithm.
        4.  It calls the `evaluate_program` tool to backtest the child and get its performance KPIs.
        5.  It calls the `extract_features` tool to get the child's feature vector.
        6.  It attempts to add the new child algorithm to the `ProgramDatabase`, which will only accept it if it is a new "elite" in its specific feature niche.
    *   **Periodically (Outer Loop):**
        1.  After N generations, the controller calls the `DSPyCompilerAgent`.
        2.  It passes the entire `ProgramDatabase` of elites as a high-quality training set.
        3.  The compiler agent generates and returns a new, more effective `EvolverModule`.
        4.  The controller replaces its old `EvolverModule` and continues the code evolution.
3.  **Forward-Testing (Post-Evolution):**
    *   Once the evolution process is complete, a final `ForwardTester` agent is run.
    *   This agent filters the `ProgramDatabase` for all elite algorithms that meet a user-defined threshold.
    *   It then uses a new tool (e.g., `paper_trading_api`) to deploy and monitor these elite strategies in a live, simulated paper-money account.
