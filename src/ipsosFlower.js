//IpsosFlower.js
// Initial implementation of Insight Cloud Platform force graph representation.
// -----todo----- no checks for existence of data called.

// create an svg to draw in
var svg = d3.select("svg")
width = +svg.attr("width"),
height = +svg.attr("height");
svg.attr("class", "graph-svg-component");
var defs = svg.append("defs");
//change cursos style for drag
svg.style("cursor", "move");
// setup tooltip div
var div = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);
// load the graph
function getAllUrlParams(url) {

  // get query string from url (optional) or window
  var queryString = url ? url.split('?')[1] : window.location.search.slice(1);

  // we'll store the parameters here
  var obj = {};

  // if query string exists
  if (queryString) {

    // stuff after # is not part of query string, so get rid of it
    queryString = queryString.split('#')[0];

    // split our query string into its component parts
    var arr = queryString.split('&');

    for (var i = 0; i < arr.length; i++) {
      // separate the keys and the values
      var a = arr[i].split('=');

      // in case params look like: list[]=thing1&list[]=thing2
      var paramNum = undefined;
      var paramName = a[0].replace(/\[\d*\]/, function(v) {
        paramNum = v.slice(1, -1);
        return '';
      });

      // set parameter value (use 'true' if empty)
      var paramValue = typeof(a[1]) === 'undefined' ? true : a[1];

      // (optional) keep case consistent
      paramName = paramName.toLowerCase();
      paramValue = paramValue.toLowerCase();

      // if parameter name already exists
      if (obj[paramName]) {
        // convert value to array (if still string)
        if (typeof obj[paramName] === 'string') {
          obj[paramName] = [obj[paramName]];
        }
        // if no array index number specified...
        if (typeof paramNum === 'undefined') {
          // put the value on the end of the array
          obj[paramName].push(paramValue);
        }
        // if array index number specified...
        else {
          // put the value at that index number
          obj[paramName][paramNum] = paramValue;
        }
      }
      // if param name doesn't exist yet, set it
      else {
        obj[paramName] = paramValue;
      }
    }
  }

  return obj;
}
var fileName = getAllUrlParams().filename!=null ? getAllUrlParams().filename : "Mill.json";

d3.json("data/" + fileName, function(error, graph) {
  //Generic Nodes --- to do replace with MLS data model
  // set the nodes
  var nodes_data = graph.nodes_data;
  // links between nodes
  var links_data = graph.links_data;
  // node visuals
  var nodeColors = graph.display[0].colors;
  var nodeShapes = graph.display[1].shapes;
  var nodeTypes = graph.display[2].types;
  // graph options

  var shape_active = getAllUrlParams().nodeshapes!=null ? getAllUrlParams().nodeshapes :graph.graph[0].nodeShapes;
  var size_active = getAllUrlParams().nodesizes!=null ? getAllUrlParams().nodesizes :graph.graph[0].nodeSizes;
  var linkColor_active = getAllUrlParams().linkcolors!=null ? getAllUrlParams().linkcolors :graph.graph[0].linkColors;
  var fastGraph = getAllUrlParams().fastgraph!=null ? getAllUrlParams().fastgraph :graph.graph[0].fastGraph;
  console.log(shape_active);
  // relative shape sized -- to do actually think about what this pseudo algo does---
  var ratio = (width * height) / nodes_data.length
  var r = ratio * 0.005;
  var minRadius = 6;
  var maxRadius = 15;
  r = (r < minRadius) ? minRadius : r;
  r = (r > maxRadius) ? maxRadius : r;
  var radiusShapeMultiplier = shape_active ? 10:20;
  var radiusShapeTrendOffset = radiusShapeMultiplier - 10;
  var radiusShapeTrendMultiplier = 1 + r / 10;
  // graph simulation settings
  var forceStrengthMultiplier = 4;
  var graphSimV = fastGraph ? 0.5 : 0.2;
  var graphSimAlphaMin = fastGraph ? 0.003 : 0.001;
  var graphSimAlphaD = fastGraph ? 0.03 : 0.01;
  //set up the simulation
  //nodes
  var simulation = d3.forceSimulation()
    .nodes(nodes_data);
  //add forces
  simulation
    .force("charge_force", d3.forceManyBody().strength(-r * forceStrengthMultiplier)) //(function(d, i){return i==0 ? -r*15 : -r*8;}))
    .force("center_force", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(r + r / 2).iterations(10))
    .velocityDecay(graphSimV)
    .alphaMin(graphSimAlphaMin)
    .alphaDecay(graphSimAlphaD)
  .force("forcex", d3.forceX(width / 2).strength(function(d) {
  	return width > height ? width/height*0.001 : height/width*0.005
  }))
  .force("forcey", d3.forceY(height / 2).strength(function(d) {
  	return width > height ? width/height*0.005 : height/width*0.001
  }))
  ;

  //graph update ticker
  simulation.on("tick", tickActions);

  //Create the link force
  var link_force = d3.forceLink(links_data)
    .id(function(d) {
      return d.id;
    })
  simulation.force("links", link_force)

  //add encompassing group for the zoom
  var g = svg.append("g")
    .attr("class", "everything");

  //draw lines for the links
  var lineType = fastGraph ? "line" : "path";
  var link = g.append("g")
    .attr("class", "links")
    .attr("stroke-width", r / 15)
    .selectAll("line")
    .data(links_data)
    .enter().append(lineType)
    .attr("fill", "transparent")
    .attr("class", function(d) {
      return linkColor_active && d.type == "tension" ? "tension" : "similar"
    });

  //draw shapes for the nodes
  var node = g.append("g")
    .attr("class", "nodes")
    .selectAll("path")
    .data(nodes_data)
    .enter()
    .append("path")
    .attr("d", d3.symbol()
      .type(function(d) {
        if (!shape_active) {
          var nodeSymbolType = d3.symbolCircle;
        } else {
          switch (nodeShapes[nodeTypes.indexOf(d.types)]) {
            case "square":
              nodeSymbolType = d3.symbolSquare;
              break;
            case "triangle":
              nodeSymbolType = d3.symbolTriangle;
              break;
            case "rhombus":
              nodeSymbolType = d3.symbolDiamond;
              break;
            default:
              nodeSymbolType = d3.symbolCircle;
          }
        }
        return nodeSymbolType;
      })
      .size(function(d) {
        return size_active ? (radiusShapeTrendOffset + d.trending * radiusShapeTrendMultiplier) * r : radiusShapeMultiplier * r;
      })
    )
    .attr("stroke-width", r / 15)
    .attr("fill", function(d) {
      var radGrad = defs.append("radialGradient")
        .attr("id", d.id)
        .attr("fx", "25%")
        .attr("fy", "15%")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")
        .attr("spreadMethod", "pad");
      radGrad.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "azure")
        .attr("stop-opacity", 1);
      radGrad.append("stop")
        .attr("offset", "100%")
        .attr("id", "nodeStopColor")
        .attr("stop-color", nodeColors[nodeTypes.indexOf(d.types)])
        .attr("stop-opacity", 1);

      if (!fastGraph) {
        return "url(#" + d.id + ")";
      } else {
        return nodeColors[nodeTypes.indexOf(d.types)];
      }
    })
    .on('mouseover', fade(0.1))
    .on('mouseout', fade(1));

  //add drag capabilities
  var drag_handler = d3.drag()

    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  drag_handler(node);

  //add zoom capabilities
  var zoom_handler = d3.zoom()
    .scaleExtent([0.1, 8])
    .on("zoom", zoom_actions);

  zoom_handler(svg);

  //Zoom functions
  function zoom_actions() {
    g.attr("transform", d3.event.transform)
  }


  // The complete tickActions function
  function tickActions() {
    node.attr("transform", function(d) {
      return "translate(" + (d.x) + "," + (d.y) + ")";
    });

    //update link positions
    if (fastGraph) {
      link.attr("x1", function(d) {
          return d.source.x;
        })
        .attr("y1", function(d) {
          return d.source.y;
        })
        .attr("x2", function(d) {
          return d.target.x;
        })
        .attr("y2", function(d) {
          return d.target.y;
        });
    } else {
      link
        .attr("d", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + d.source.x + "," + d.source.y + "A" + dr + " " + dr + " 0 0 1 " + d.target.x + " " + d.target.y;
        });
    }
  }
  //Helper functions
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  const linkedByIndex = {};
  links_data.forEach(d => {
    linkedByIndex[`${d.source.id},${d.target.id}`] = 1;
  });

  function isConnected(a, b) {
    return linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;
  }

  function fade(opacity) {
    return d => {
      node.style('stroke-opacity', function(o) {
        const thisOpacity = isConnected(d, o) ? 1 : opacity;
        this.setAttribute('fill-opacity', thisOpacity);
        return thisOpacity;
      });
      if (opacity != 1) {
        div.transition()
          .duration(500)
          .style("opacity", .8);
        div.html(titleCase(d.title))
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY) + "px");
      } else {
        div.transition()
          .duration(500)
          .style("opacity", 0);
      }

      link.style('stroke-opacity', o => (o.source === d || o.target === d ? 1 : opacity));
      link.attr('marker-end', o => (opacity === 1 || o.source === d || o.target === d ? 'url(#end-arrow)' : 'url(#end-arrow-fade)'));
    };
  }

  function titleCase(str) {
    str = str.toLowerCase();
    str = str.split(' ');
    for (var i = 0; i < str.length; i++) {
      str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' '); // ["I'm", "A", "Little", "Tea", "Pot"].join(' ') => "I'm A Little Tea Pot"
  }
});
