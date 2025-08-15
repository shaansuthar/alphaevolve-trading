#!/usr/bin/env python
"""Streamlit GUI to run and monitor AlphaEvolve experiments."""

from __future__ import annotations

import asyncio
import os
import textwrap
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

import matplotlib.pyplot as plt
import pandas as pd
import streamlit as st

from alphaevolve import AlphaEvolve
from alphaevolve.config import settings
from alphaevolve.evaluator.backtest import (
    _find_strategy,
    _load_module_from_code,
    _run_backtest,
)
from alphaevolve.store.sqlite import ProgramStore
from examples import config as example_config

# Default code shown in the sidebar seed text area
DEFAULT_SEED_CODE = (
    Path(__file__).resolve().parent.parent / "examples" / "sma_momentum.py"
).read_text()

st.set_page_config(page_title="AlphaEvolve", layout="wide")

st.title("🧬 AlphaEvolve GUI")

# --------------------------------------------------------------------
# Sidebar controls
# --------------------------------------------------------------------
exp_name = st.sidebar.text_input("Experiment", value="my_exp")
iterations = st.sidebar.number_input("Iterations", 1, 1000, 10, step=1)
seed_code = st.sidebar.text_area(
    "Seed strategy code", value=DEFAULT_SEED_CODE, height=300
)
TOP_K = st.sidebar.slider("Top K strategies", 3, 50, 10)

# Tune example configuration values
symbols_raw = st.sidebar.text_input(
    "Symbols (comma-separated)", value=example_config.DEFAULT_SYMBOLS_RAW
)
start_date = st.sidebar.text_input("Start date", value=example_config.START_DATE)
hof_metric = st.sidebar.text_input("Hall-of-Fame metric", value=example_config.HOF_METRIC)
enable_prompt = st.sidebar.checkbox(
    "Enable prompt evolution", value=example_config.ENABLE_PROMPT_EVOLUTION
)
multi_branch = st.sidebar.checkbox(
    "Multi-branch mutation", value=example_config.MULTI_BRANCH_MUTATION
)
branch_metrics = st.sidebar.text_input(
    "Branch metrics (comma-separated)",
    value=",".join(example_config.BRANCH_METRICS),
)

run_btn = st.sidebar.button("Run evolution")
delete_btn = st.sidebar.button("Delete experiment")

# SQLite file for the selected experiment
DB_DIR = Path(settings.sqlite_db).expanduser().parent
DB_DIR.mkdir(parents=True, exist_ok=True)
db_path = DB_DIR / f"{exp_name}.db"
store = ProgramStore(db_path)

if delete_btn:
    if db_path.exists():
        os.remove(db_path)
    st.experimental_rerun()

progress_bar = st.sidebar.empty()
status_box = st.sidebar.empty()

# Placeholder for hall-of-fame table while running
table_placeholder = st.empty()

if run_btn:
    # Update example configuration from sidebar
    example_config.DEFAULT_SYMBOLS_RAW = symbols_raw
    example_config.DEFAULT_SYMBOLS = tuple(
        s.strip().upper() for s in symbols_raw.split(",") if s.strip()
    )
    example_config.START_DATE = start_date
    example_config.HOF_METRIC = hof_metric
    example_config.ENABLE_PROMPT_EVOLUTION = enable_prompt
    example_config.MULTI_BRANCH_MUTATION = multi_branch
    example_config.BRANCH_METRICS = [
        m.strip() for m in branch_metrics.split(",") if m.strip()
    ]

    # Write seed code to a temporary file for AlphaEvolve
    tmp_seed = Path("/tmp/gui_seed.py")
    tmp_seed.write_text(seed_code)
    ae = AlphaEvolve([str(tmp_seed)], experiment_name=exp_name)
    for i in range(int(iterations)):
        for ctrl in ae.controllers:
            asyncio.run(ctrl._spawn(None))
        progress_bar.progress((i + 1) / iterations)
        status_box.write(f"Iteration {i + 1}/{iterations}")
        hof_rows = store.top_k(k=TOP_K, metric=example_config.HOF_METRIC)
        table = pd.DataFrame(
            [
                {
                    "id": r["id"],
                    "sharpe": r["metrics"]["sharpe"],
                    "calmar": r["metrics"]["calmar"],
                    "cagr": r["metrics"]["cagr"],
                    "max-dd": r["metrics"]["max_drawdown"],
                    "total-ret": r["metrics"]["total_return"],
                }
                for r in hof_rows
            ]
        )
        table_placeholder.dataframe(table, use_container_width=True)
    status_box.write("Evolution finished")

# --------------------------------------------------------------------
# Hall of Fame display
# --------------------------------------------------------------------
hof_rows = store.top_k(k=TOP_K, metric=example_config.HOF_METRIC)

if not hof_rows:
    st.info("Hall‑of‑Fame is empty – run the evolution first.")
    st.stop()

table = pd.DataFrame(
    [
        {
            "id": r["id"],
            "sharpe": r["metrics"]["sharpe"],
            "calmar": r["metrics"]["calmar"],
            "cagr": r["metrics"]["cagr"],
            "max-dd": r["metrics"]["max_drawdown"],
            "total-ret": r["metrics"]["total_return"],
        }
        for r in hof_rows
    ]
)

st.dataframe(table, use_container_width=True)

selected_id = st.selectbox("Select a program to inspect", table["id"].tolist())
selected = store.get(selected_id)

col_code, col_chart = st.columns([1, 2])

with col_code:
    st.subheader("Source code")
    st.code(textwrap.dedent(selected["code"]))

with col_chart:
    st.subheader("Equity curve (fresh back‑test)")
    try:
        mod = _load_module_from_code(selected["code"])
        strat_cls = _find_strategy(mod)
        kpis = _run_backtest(strat_cls)
    except Exception as e:
        st.error(f"Failed to back‑test: {e}")
    else:
        from alphaevolve.evaluator.loader import load_ohlc, add_feeds_to_cerebro
        import backtrader as bt

        symbols = example_config.DEFAULT_SYMBOLS
        df = load_ohlc(symbols, start=example_config.START_DATE)
        cerebro = bt.Cerebro()
        add_feeds_to_cerebro(df, cerebro)
        cerebro.addstrategy(strat_cls)
        cerebro.broker.set_cash(100_000)
        strat_instance = cerebro.run(maxcpus=1)[0]
        curve = pd.Series(
            [pt["value"] for pt in strat_instance.equity_curve],
            index=[pt["date"] for pt in strat_instance.equity_curve],
            name="equity",
        )

        fig, ax = plt.subplots()
        curve.plot(ax=ax)
        ax.set_ylabel("Portfolio value ($)")
        ax.set_title(f"Equity curve – Sharpe {kpis['sharpe']:.2f}")
        st.pyplot(fig)

