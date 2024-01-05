import * as d3 from 'd3';

export const markerSymbol = (item, symbol, size, color) => {
  switch (symbol) {
    case 'circle': {
      item
        .append('path')
        .attr('d', d3.symbol().type(d3.symbolCircle).size(2 * size))
        .attr('transform', `translate(${size / 2}, ${size / 2})`)
        .attr('stroke', 'none')
        .attr('fill', color);
      break;
    }        
    case 'square': {
      item
        .append('path')
        .attr('d', d3.symbol().type(d3.symbolSquare).size(2 * size))
        .attr('transform', `translate(${size / 2}, ${size / 2})`)
        .attr('stroke', 'none')
        .attr('fill', color);
      break;
    } 
    case 'triangle':       
    case 'triangleUp': {
      item
        .append('path')
        .attr('d', d3.symbol().type(d3.symbolTriangle).size(2 * size))
        .attr('transform', `translate(${size / 2}, ${size / 2})`)
        .attr('stroke', 'none')
        .attr('fill', color);
      break;
    }        
    case 'triangleDown': {
      item
        .append('path')
        .attr('d', d3.symbol().type(d3.symbolTriangle).size(2 * size))
        .attr('transform', `translate(${size / 2}, ${size / 2}) rotate(180 0 0)`)
        .attr('stroke', 'none')
        .attr('fill', color);
      break;
    }        
  }

};
