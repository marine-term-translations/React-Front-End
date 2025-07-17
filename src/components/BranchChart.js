import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Spinner } from "react-bootstrap";
import { Chart, ArcElement } from "chart.js";

Chart.register(ArcElement);

const BranchChart = ({ emptyFieldCounts, totalFields }) => {
  if (!emptyFieldCounts) {
    return <Spinner animation="border" size="sm" />;
  }

  const chartData = {
    labels: Object.keys(emptyFieldCounts).map(
      (lang) => `${lang} (${totalFields[lang] - emptyFieldCounts[lang]})`
    ),
    datasets: [
      {
        data: Object.entries(emptyFieldCounts)
          .map(([lang, count]) => [totalFields[lang] - count, count])
          .flat(),
        backgroundColor: Object.entries(emptyFieldCounts)
          .map(([lang, count], index) => [
            `rgba(255, 99, 132, ${1 - index * 0.1})`,
            `rgba(75, 192, 192, ${1 - index * 0.1})`,
          ])
          .flat(),
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return <Doughnut data={chartData} options={chartOptions} />;
};

export default BranchChart;
