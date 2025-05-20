import React from 'react';
import Plot from 'react-plotly.js';

interface ExperimentPlotProps {
  data?: Partial<Plotly.PlotData>[] | null;
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  style?: React.CSSProperties;
}

// Render nothing if no data is provided
const ExperimentPlot: React.FC<ExperimentPlotProps> = (props) => {
  // If data is not available or empty, show a placeholder
  if (!Array.isArray(props.data) || props.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data to plot. Please select X, Y, and time range, then fetch data.
      </div>
    );
  }

  const safeLayout = props.layout && typeof props.layout === 'object' ? props.layout : {
    title: { text: 'Experiment Plot' },
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50 },
  };
  const safeConfig = props.config && typeof props.config === 'object' ? props.config : { responsive: true };
  const safeStyle = props.style || { width: '100%', height: '100%' };

  // Debugging logs for all props and types
  console.log("===== ExperimentPlot Debugger =====");
  console.log("data (raw):", props.data);
  console.log("layout:", safeLayout);
  console.log("config:", safeConfig);
  console.log("style:", safeStyle);

  try {
    return (
      <div className="experiment-plot-container">
        <Plot
          data={props.data}
          layout={safeLayout}
          config={safeConfig}
          style={safeStyle}
          useResizeHandler={true}
        />
      </div>
    );
  } catch (error) {
    console.error('Error rendering plot:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
        Error rendering plot. Please check console for details.
      </div>
    );
  }
};

export default ExperimentPlot;