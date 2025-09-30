import runpy
import tempfile
import urllib.request
from nautilus_trader.backtest.node import BacktestDataConfig
from nautilus_trader.backtest.node import BacktestEngineConfig
from nautilus_trader.backtest.node import BacktestNode
from nautilus_trader.backtest.node import BacktestRunConfig
from nautilus_trader.backtest.node import BacktestVenueConfig
from nautilus_trader.config import ImportableStrategyConfig
from nautilus_trader.config import LoggingConfig
from nautilus_trader.model import Quantity
from nautilus_trader.model import QuoteTick
from nautilus_trader.persistence.catalog import ParquetDataCatalog


with tempfile.NamedTemporaryFile("wb", suffix=".py", delete=False) as f:
    f.write(urllib.request.urlopen(
    "https://raw.githubusercontent.com/nautechsystems/nautilus_data/main/nautilus_data/hist_data_to_catalog.py"
    ).read())

runpy.run_path(f.name, run_name="__main__")

catalog = ParquetDataCatalog("./")
# catalog = ParquetDataCatalog.from_env()
print(catalog.instruments())