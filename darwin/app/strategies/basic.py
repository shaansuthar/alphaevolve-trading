from decimal import Decimal
from nautilus_trader.config import StrategyConfig
from nautilus_trader.model import Bar, BarType
from nautilus_trader.model import InstrumentId
from nautilus_trader.model.enums import OrderSide
from nautilus_trader.model.objects import Quantity
from nautilus_trader.trading.strategy import Strategy


# Configuration definition
class MyStrategyConfig(StrategyConfig, kw_only=True):
    instrument_id: InstrumentId   # example value: "ETHUSDT-PERP.BINANCE"
    bar_type: BarType             # example value: "ETHUSDT-PERP.BINANCE-15-MINUTE[LAST]-EXTERNAL"
    trade_size: Decimal
    order_id_tag: str
    fast_ema_period: int = 10
    slow_ema_period: int = 20


# Strategy definition
class MyStrategy(Strategy):
    def __init__(self, config: MyStrategyConfig) -> None:
        # Always initialize the parent Strategy class
        # After this, configuration is stored and available via `self.config`
        super().__init__(config)

        # Custom state variables
        self.time_started = None
        self.count_of_processed_bars: int = 0
        self.position_opened = False
        self.position_closed = False
        self.bars_to_hold = 650  # Hold position for 650 bars to capture price change from 4.58 to 4.84

    def on_start(self) -> None:
        self.time_started = self.clock.utc_now()    # Remember time, when strategy started
        self.subscribe_bars(self.config.bar_type)   # See how configuration data are exposed via `self.config`

    def on_bar(self, bar: Bar):
        self.count_of_processed_bars += 1           # Update count of processed bars
        
        # Buy on first bar
        if not self.position_opened:
            self.log.info(f"Bar {self.count_of_processed_bars}: Price={bar.close}, Opening LONG position")
            
            # Create a market order to BUY
            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.BUY,
                quantity=Quantity.from_str(str(self.config.trade_size)),
            )
            
            # Submit the order
            self.submit_order(order)
            self.position_opened = True
            
        # Close position after holding for specified bars
        elif self.position_opened and not self.position_closed and self.count_of_processed_bars >= self.bars_to_hold:
            self.log.info(f"Bar {self.count_of_processed_bars}: Price={bar.close}, Closing position")
            
            # Create a market order to SELL (close the position)
            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.SELL,
                quantity=Quantity.from_str(str(self.config.trade_size)),
            )
            
            # Submit the order
            self.submit_order(order)
            self.position_closed = True
            
        else:
            self.log.info(f"Bar {self.count_of_processed_bars}: Price={bar.close}, Holding position")

