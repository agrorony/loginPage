import React from 'react';
import Plot from 'react-plotly.js';

interface ExperimentPlotProps {
  data?: Partial<Plotly.PlotData>[];
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  style?: React.CSSProperties;
}

const ExperimentPlot: React.FC<ExperimentPlotProps> = ({
  data = [
    {
      x: [1, 2, 3, 4],
      y: [10, 15, 13, 17],
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: 'blue' },
      name: 'Sample Data',
    },
  ],
  layout = {
    title: { text: 'Sample Plot' },
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50 },
  },
  config = { responsive: true },
  style = { width: '100%', height: '100%' },
}) => {
  // Debugging Logs
  console.log('ExperimentPlot Props:', { data, layout, config, style });

  if (!Array.isArray(data)) {
    console.error('Invalid data prop passed to ExperimentPlot. Expected an array but got:', data);
    return <div>Error: Invalid data passed to the plot.</div>;
  }

  if (typeof layout !== 'object') {
    console.error('Invalid layout prop passed to ExperimentPlot. Expected an object but got:', layout);
    return <div>Error: Invalid layout passed to the plot.</div>;
  }

  return (
    <Plot
      data={data}
      layout={layout}
      config={config}
      style={style}
    />
  );
};

export default ExperimentPlot;