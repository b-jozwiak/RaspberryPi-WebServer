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
    chart: { type: "line", height: 350 },
    xaxis: { type: "datetime" },
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
        { name: "Temperature", data: [...prev[0].data, [new Date(d.time).getTime(), d.temperature]] },
        { name: "Humidity", data: [...prev[1].data, [new Date(d.time).getTime(), d.humidity]] }
      ]);
    });
    return () => socket.off("update");
  }, []);

  return <Chart options={options} series={series} type="line" height={350} />;
}

export default App;
