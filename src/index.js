import ReactDOM from "react-dom";
import cubejs from "@cubejs-client/core";
// import Chart from "@qognicafinance/react-lightweight-charts";
import Chart from "./components/LightWeightCharts";
import { useRef } from "react";

import { QueryRenderer } from "@cubejs-client/react";
import { Spin } from "antd";
import React, { useEffect, useMemo, useState } from "react";
import { useDeepCompareMemo } from "use-deep-compare";

import "./index.css";

const useDrilldownCallback = ({
  datasets,
  labels,
  onDrilldownRequested,
  pivotConfig
}) => {
  return React.useCallback(
    (elements) => {
      if (elements.length <= 0) return;
      const { datasetIndex, index } = elements[0];
      const { yValues } = datasets[datasetIndex];
      const xValues = [labels[index]];

      if (typeof onDrilldownRequested === "function") {
        onDrilldownRequested(
          {
            xValues,
            yValues
          },
          pivotConfig
        );
      }
    },
    [datasets, labels, onDrilldownRequested, pivotConfig]
  );
};

const LineChartRenderer = ({ resultSet, pivotConfig, title }) => {
  const [seriesRef, setSeriesRef] = useState();
  const [chartRef, setChartRef] = useState();
  const [indicator, setIndicator] = useState({});

  const singleChart = resultSet.series(pivotConfig).length == 1;

  const datasets = useDeepCompareMemo(
    () =>
      resultSet.series(pivotConfig).map((s, index) => {
        return {
          legend: singleChart ? null : s.title.replace(", Ticker Close", ""),
          data: s.series
            .map((i) => {
              if (i.x == "∅") return null;
              // if (typeof i.x !== "string") {
              return { time: i.x, value: i.value };
              // }
            })
            .filter((n) => n),
          // yValues: [s.key],
          options: {
            topColor: "rgba(19, 68, 193, 0.4)",
            bottomColor: "rgba(0, 120, 255, 0.0)",
            lineColor: "rgba(19, 40, 153, 1.0)",
            lineWidth: 3
          }
        };
      }),
    [resultSet, pivotConfig]
  );
  const data = {
    labels: resultSet.categories(pivotConfig).map((c) => c.x),
    datasets
  };

  // const getElementAtEvent = useDrilldownCallback({
  //   datasets: data.datasets,
  //   labels: data.labels,
  //   pivotConfig,
  //   onDrilldownRequested
  // });

  const options = {
    timeScale: {
      // borderVisible: false,
      tickMarkFormatter: (time) => {
        // from https://jsfiddle.net/TradingView/350xh1zu/ which came from "Tick marks formatter" example at https://www.tradingview.com/lightweight-charts/
        const date = new Date(time.year, time.month, time.day);
        const formattedTick =
          date.getFullYear() +
          "/" +
          (date.getMonth() + 1) +
          "/" +
          date.getDate();
        console.log({ formattedTick });
        return formattedTick;
      }
    },
    layout: {
      fontFamily: "Inter"
    },
    timeScale: {
      borderVisible: false
    },
    rightPriceScale: {
      scaleMargins: {
        top: 0.35,
        bottom: 0.2
      },
      borderVisible: false
    },
    grid: {
      horzLines: {
        color: "#eee",
        visible: false
      },
      vertLines: {
        color: "#ffffff"
      }
    },
    crosshair: {
      horzLine: {
        visible: false,
        labelVisible: false
      },
      vertLine: {
        visible: true,
        style: 0,
        width: 2,
        color: "rgba(32, 38, 46, 0.1)",
        labelVisible: false
      }
    }
  };

  const initIndicator = () => {
    const data = datasets[0]?.data;
    const dataLast = data[data.length - 1];

    setIndicator({
      price: dataLast.value,
      title,
      date:
        dataLast.time.year +
        " - " +
        dataLast.time.month +
        " - " +
        dataLast.time.day,
      singleChart
    });
  };

  useEffect(() => {
    if (chartRef) {
      if (singleChart) {
        initIndicator();
      }

      chartRef.subscribeCrosshairMove((param) => {
        if (singleChart) {
          const price = param.seriesPrices.get(seriesRef[0]);
          setIndicator({
            price: (Math.round(price * 100) / 100).toFixed(2),
            title,
            date:
              param.time.year +
              " - " +
              param.time.month +
              " - " +
              param.time.day
          });
        }

        return;
      });
    }
  }, [chartRef]);

  const dateStr = "dateStr";
  return (
    <div className="charts-wrapper">
      <div className="three-line-legend">
        <div style={{ fontSize: "24px", margin: "4px 0px", color: "#20262E" }}>
          {indicator.title}
        </div>
        <div style={{ fontSize: "22px", margin: "4px 0px", color: "#20262E" }}>
          {indicator.price}
        </div>
        <div>{indicator.date}</div>
      </div>
      <Chart
        options={options}
        areaSeries={datasets}
        autoWidth
        // autoHeight
        height="400"
        chartRef={setChartRef}
        seriesRef={setSeriesRef}
      />
    </div>
  );
};

const cubejsApi = cubejs(
  // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzQ1NTE3Mjd9.vpSA6uDyKKmhDkD0WXB7FWtt0CpiaH4mvHT2lwFqn7c",
  {
    apiUrl:
      "https://crazy-crothersville.gcp-europe-west2-a.cubecloudapp.dev/dev-mode/dev-leo-59bf4a2f/cubejs-api/v1"
  }
);

const renderChart = ({
  resultSet,
  error,
  pivotConfig,
  onDrilldownRequested,
  title,
  ...props
}) => {
  if (error) {
    return <div>{error.toString()}</div>;
  }

  if (!resultSet) {
    return <Spin />;
  }

  return (
    <LineChartRenderer
      resultSet={resultSet}
      pivotConfig={pivotConfig}
      onDrilldownRequested={onDrilldownRequested}
      title={title}
    />
  );
};

const ChartRenderer = () => {
  const [filters, setFilters] = useState([]);
  const [title, setTitle] = useState([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryString = window.location.search || {};
      const urlParams = new URLSearchParams(queryString);
      const symbol = urlParams.get("symbol");
      const title = urlParams.get("title");
      if (title) {
        setTitle(title);
      } else {
        setTitle(symbol);
      }

      if (symbol) {
        setFilters([
          {
            member: "Ticker.symbol",
            operator: "equals",
            values: [symbol]
          }
        ]);
      }
    }
  }, []);

  return (
    <QueryRenderer
      query={{
        measures: ["Ticker.close"],
        timeDimensions: [
          {
            dimension: "Ticker.timestamp",
            granularity: "day"
          }
        ],
        order: {
          "Ticker.timestamp": "asc"
        },
        dimensions: ["Ticker.symbol"],
        limit: 5000,
        filters: filters
      }}
      cubejsApi={cubejsApi}
      resetResultSetOnChange={false}
      render={(props) =>
        renderChart({
          ...props,
          title,
          chartType: "line",
          pivotConfig: {
            x: ["Ticker.timestamp.day"],
            y: ["Ticker.symbol", "measures"],
            fillMissingDates: false,
            joinDateRange: false
          }
        })
      }
    />
  );
};

const rootElement = document.getElementById("root");
ReactDOM.render(<ChartRenderer />, rootElement);
