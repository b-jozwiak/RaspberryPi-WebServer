import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [series, setSeries] = useState([
    { name: "Temperature", data: [] },
    { name: "Humidity", data: [] }
  ]);

  const [options] = useState({
    chart: { type: "area", height: 400 },
    stroke: { curve: "smooth" }, // spline style
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false, // show local time
        format: "dd HH:mm" // day + hour:minute
      }
    },
    tooltip: {
      x: { format: "dd MMM HH:mm:ss" },
      y: {
        formatter: function (val, opts) {
          if (opts.seriesIndex === 0) {
            return val + " °C";
          } else {
            return val + " %";
          }
        }
      }
    },
    yaxis: [
      { title: { text: "Temperature (°C)" } },
      { opposite: true, title: { text: "Humidity (%)" } }
    ]
  });

  useEffect(() => {
    fetch("/history")
      .then(res => res.json())
      .then(rows => {
        setSeries([
          { name: "Temperature", data: rows.map(r => [new Date(r.time).getTime(), r.temperature]) },
          { name: "Humidity", data: rows.map(r => [new Date(r.time).getTime(), r.humidity]) }
        ]);
      });
  }, []);

  useEffect(() => {
    socket.on("update", d => {
      setSeries(prev => [
        { name: "Temperature", data: [...prev[0].data, [d.time, d.temperature]] },
        { name: "Humidity", data: [...prev[1].data, [d.time, d.humidity]] }
      ]);
    });
    return () => socket.off("update");
  }, []);

  return (
          <div style={{ width: "100vw", margin: "0 auto" }}>
            <Chart
              options={options}
              series={series}
              type="line"
              height={400}
              width="100%"
            />
          </div>
        );
}

export default App;
