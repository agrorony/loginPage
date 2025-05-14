import React from 'react';
import Plot from 'react-plotly.js';

interface ExperimentPlotProps {
  data?: Partial<Plotly.PlotData>[]|null;
  layout?: Partial<Plotly.Layout>;
  config?: Partial<Plotly.Config>;
  style?: React.CSSProperties;
}

const ExperimentPlot: React.FC<ExperimentPlotProps> = (props) => {
  // Use default values if props are not provided
  const defaultData: Partial<Plotly.PlotData>[] = [
    {
      x: [1, 2, 3, 4],
      y: [10, 15, 13, 17],
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: 'blue' },
      name: 'Sample Data',
    },
  ];
  
  const defaultLayout = {
    title: { text: 'Sample Plot' },
    autosize: true,
    margin: { l: 50, r: 50, b: 50, t: 50 },
  };
  
  const defaultConfig = { responsive: true };
  const defaultStyle = { width: '100%', height: '100%' };

  // Safely extract props with fallbacks
  const safeData =  defaultData;
  const safeLayout = props.layout && typeof props.layout === 'object' ? props.layout : defaultLayout;
  const safeConfig = props.config && typeof props.config === 'object' ? props.config : defaultConfig;
  const safeStyle = props.style || defaultStyle;
  
  // Rendering with conditional check
  try {
    return (
      <div className="experiment-plot-container">
        <Plot
          data={safeData}
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