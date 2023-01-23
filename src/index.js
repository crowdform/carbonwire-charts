import ReactDOM from "react-dom";
import cubejs from "@cubejs-client/core";
import Chart from "@qognicafinance/react-lightweight-charts";

import { QueryRenderer } from "@cubejs-client/react";
import { Spin } from "antd";
import React, { useMemo } from "react";
import { useDeepCompareMemo } from "use-deep-compare";

const useDrilldownCallback = ({
  datasets,
  labels,
  onDrilldownRequested,
  pivotConfig,
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
            yValues,
          },
          pivotConfig
        );
      }
    },
    [datasets, labels, onDrilldownRequested, pivotConfig]
  );
};

const LineChartRenderer = ({
  resultSet,
  pivotConfig,
  onDrilldownRequested,
}) => {
  const datasets = useDeepCompareMemo(
    () =>
      resultSet.series(pivotConfig).map((s, index) => ({
        legend: s.title,
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
          // color: "#f48fb1",
          // lineStyle: 0,
          // lineWidth: 1,
          // crosshairMarkerVisible: true,
          // crosshairMarkerRadius: 6,
          // crosshairMarkerBorderColor: "#ffffff",
          // crosshairMarkerBackgroundColor: "#2296f3"
          // lineType: 2
        },
      })),
    [resultSet, pivotConfig]
  );
  const data = {
    labels: resultSet.categories(pivotConfig).map((c) => c.x),
    datasets,
  };

  const getElementAtEvent = useDrilldownCallback({
    datasets: data.datasets,
    labels: data.labels,
    pivotConfig,
    onDrilldownRequested,
  });

  const options = {
    timeScale: {
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
      },
    },
  };

  return (
    <Chart
      options={options}
      lineSeries={datasets}
      autoWidth
      // autoHeight
      height="400"
      // options={commonOptions}
      // getElementAtEvent={getElementAtEvent}
    />
  );
};

const cubejsApi = cubejs(
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2NzQ1NTE3Mjd9.vpSA6uDyKKmhDkD0WXB7FWtt0CpiaH4mvHT2lwFqn7c",
  {
    apiUrl:
      "https://crazy-crothersville.gcp-europe-west2-a.cubecloudapp.dev/dev-mode/dev-leo-a5392253/cubejs-api/v1",
  }
);

const renderChart = ({
  resultSet,
  error,
  pivotConfig,
  onDrilldownRequested,
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
    />
  );
};

const ChartRenderer = () => {
  const queryString = window?.location?.search || {};
  const urlParams = new URLSearchParams(queryString);
  const symbol = urlParams.get("symbol");

  const filters = () => {
    if (symbol) {
      return [
        {
          member: "Ticker.symbol",
          operator: "equals",
          values: [symbol],
        },
      ];
    }
    return [];
  };

  return (
    <QueryRenderer
      query={{
        measures: ["Ticker.close"],
        timeDimensions: [
          {
            dimension: "Ticker.timestamp",
            granularity: "day",
          },
        ],
        order: {
          "Ticker.timestamp": "asc",
        },
        dimensions: ["Ticker.symbol"],
        limit: 5000,
        filters: filters(),
      }}
      cubejsApi={cubejsApi}
      resetResultSetOnChange={false}
      render={(props) =>
        renderChart({
          ...props,
          chartType: "line",
          pivotConfig: {
            x: ["Ticker.timestamp.day"],
            y: ["Ticker.symbol", "measures"],
            fillMissingDates: false,
            joinDateRange: false,
          },
        })
      }
    />
  );
};

const rootElement = document.getElementById("root");
ReactDOM.render(<ChartRenderer />, rootElement);
