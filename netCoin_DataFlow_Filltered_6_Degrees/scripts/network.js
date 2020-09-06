function network(Graph){

  var docSize = viewport(),
      width = docSize.width,
      height = docSize.height - 2,
      oldWidth = 0,
      oldHeight = 0,
      ctrlKey = false,
      images = false,
      heatmap = false,
      heatmapTriangle = false,
      options;

  var force = d3.layout.force()
      .on("tick", tick)
      .on("end", forceEnd);

  force.drag().on("dragstart", function(d) {
    d3.event.sourceEvent.preventDefault();
    d3.event.sourceEvent.stopPropagation();
  });

  body = d3.select("body");

  options = Graph.options;
  delete Graph.options;

  if(options.background)
    body.style("background",options.background);

  var splitMultiVariable = function(d,dataname){
    for (var p in d) {
      if(typeof d[p] == "string" && d[p].indexOf("|")!=-1)
        Graph[dataname].forEach(function(dd){
          if(dd[p])
            dd[p] = dd[p].split("|");
        });
    }
  }

  if(!Graph.links)
    Graph.links = [];
  Graph.links.forEach(function(d){
    splitMultiVariable(d,"links");
    d.source = Graph.nodes[d.Source];
    d.Source = d.source[options.nodeName];
    d.target = Graph.nodes[d.Target];
    d.Target = d.target[options.nodeName];
  });

  if(Graph.tree){
    Graph.nodes.forEach(function(d){
      d.childNodes = [];
      d.parentNode = false;
    });
    Graph.tree.forEach(function(d){
      Graph.nodes[d.Source].childNodes.push(Graph.nodes[d.Target]);
      Graph.nodes[d.Target].parentNode = Graph.nodes[d.Source];
    });
    Graph.tree = true;
  }
  
  var defaultColor = options.defaultColor? options.defaultColor : "#1f77b4", // nodes and areas default color
      defaultLinkColor = "#999", // links default color
      defaultShape = "circle", // node shape by default
      symbolTypes = ["circle","square","diamond","triangle-up","cross","triangle-down"], // list of available shapes
      nodeSizeRange = [0.5,4], // node size range
      linkWeightRange = [200,40], // link weight range (link distance)
      linkWidthRange = [1,5], // link width range
      axisExtension = 50, // pixels to increase the axes size
      infoPanelLeft = docSize.width * (2/3), // information panel left position
      noShowFields = ["Source","Target","x","y","source","target","index","px","py","fixed","id","selected","nodeSize","noShow","image", "childNodes", "parentNode"]; // not to show in sidebar controllers or tables

  ["nodeText","nodeInfo"].forEach(function(d){
    if(options[d])
      noShowFields.push(options[d]);
  });
  
  options.colorScalenodeColor = "RdBkGn"; // default linear scale for nodes
  options.colorScalelinkColor = "RdBkGn"; // default linear scale for linkss

  options.charge = function(size){ return -(size/2); }
  options.linkDistance = function(size){ return size/20; };

  if(options.cex)
    body.style("font-size", 10*options.cex + "px")
  else
    options.cex = 1;

  if(options.nodeItem)
    options.showImages = true;

  if(!Array.isArray(options.controls)){
    if(options.controls)
      options.controls = [options.controls];
    else
      options.controls = [];
  }
  if(options.controls.indexOf(1)!=-1)
    options.showSidebar = true;

  if(Array.isArray(options.axesLabels)){
    if(options.axesLabels.length>4)
      options.axesLabels.length = 4;
  }else{
    if(options.axesLabels)
      options.axesLabels = [options.axesLabels];
    else
      options.axesLabels = [];
  }

  if(!Array.isArray(options.degreeFilter)){
    if(options.degreeFilter)
      options.degreeFilter = [options.degreeFilter,Infinity];
  }

  Graph.nodes.forEach(function(d){
    delete d.degree;
    splitMultiVariable(d,"nodes");
    d.weight = 0;
  });

  if(options.controls.indexOf(3)!=-1){
      height = height - 200;
  }else if(options.controls.indexOf(2)!=-1){
      height = height - (38 + 12*options.cex);
  }

// main title
  if(options.main){
    body.append("div")
      .attr("class", "main")
      .html(options.main);
    height = height - 38;
  }

// panel
  var panel = body.append("div")
      .attr("class", "panel");

  if(options.main)
    panel.style("top","38px")

  var plot = panel.append("div")
      .attr("class", "plot")

  if(options.note){
    var divNote = panel.append("div")
      .attr("class", "note")
      .html(options.note);
    height = height - divNote.node().clientHeight;
  }

  plot.style({"width":width+"px","height":height+"px"});

if(options.controls.indexOf(2)+options.controls.indexOf(3)!=-2){
// panel dragbar
  var dragbar = panel.append("div")
      .attr("class","panel-dragbar")
      .style({"height":"5px","width":"100%","cursor":"row-resize"});

  var dragOffset;

  dragbar.call(d3.behavior.drag()
    .on("dragstart", function() {
      body.style("cursor","row-resize");
      plot.select("svg").remove();
      dragOffset = d3.mouse(body.node())[1]-height;
    })
    .on("drag", function() {
      var value = d3.mouse(body.node())[1];
      if(value > 200){
        height = value-dragOffset;
        plot.style("height",height+"px");
      }
    })
    .on("dragend", function() {
      body.style("cursor",null);
      plot.call(drawSVG);
    })
  );

// tables
  var tables = panel.append("div")
      .attr("class", "tables")

  if(options.controls.indexOf(3)!=-1){
    var tablesoffset = 14+12*options.cex*1.2;
    dragbar.style("margin-top",tablesoffset+"px")
    tables.style("min-height","150px")
    tables.append("div")
      .attr("class","switchNodeLink")
      .selectAll("div")
        .data(["nodes","links"])
        .enter().append("div")
          .style("top","-"+ tablesoffset +"px")
          .on("click",function(d){
              tables.selectAll("div.switchNodeLink > div").style("background",null)
              d3.select(this).style("background","#f5f5f5")
              tables.selectAll("div.nodes,div.links").style("display","none")
              tables.select("div."+d).style("display",null)
          })
          .append("h3")
            .text(function(d){ return texts[d]; })
    tables.select("div.switchNodeLink > div").style("background","#f5f5f5")
  }

  if(options.controls.indexOf(2)!=-1){
  if(options.help){
    iconButton(tables,"help",infoIcon_b64,"info",function(){
      var win = displayWindow();
      win.html(options.help);
    });
  }

  iconButton(tables,"xlsx",xlsxIcon_b64,texts.downloadtable,tables2xlsx);

  iconButton(tables,"pdf",pdfIcon_b64,texts.pdfexport,function(){ embedImages(svg2pdf); });

  iconButton(tables,"svg",svgIcon_b64,texts.svgexport,function(){ embedImages(svgDownload); });

  var buttonsSelect = tables.append("div")
                        .attr("class","selectButton")
  var selectButton = function(txt,clk){
        buttonsSelect.append("div")
          .text(txt)
          .on("click",clk)
      }

  selectButton(texts.selectall,selectAllNodes);
  selectButton(texts.tableselection,selectNodesFromTable);
  selectButton(texts.selectneighbors,selectNeighbors);
  selectButton(texts.isolateselection,isolateNodes);
  selectButton(texts.egoNet,egoNet);
  if(Graph.tree)
    selectButton(texts.expandcollapse,treeAction);
  selectButton(texts.resetfilter,deleteNoShow);
  }

  if(options.controls.indexOf(3)!=-1){
    tables.append("div").attr("class","nodes")
    tables.append("div").attr("class","links").style("display","none")
  }
}

  plot.call(drawSVG);

  var reload = false;
  if(options.mode=="h" || options.mode[0]=="h"){
    heatmap = true;
    reload = true;
    if(options.linkWidth){
       options.linkIntensity = options.linkWidth;
       delete options.linkWidth;
    }
  }

  // change degree to weight in node atributes
  ["Label","Size","Color","Shape","Text","Group","Legend","Info","OrderA","OrderD"].forEach(function(d){
    if(options["node"+d] && options["node"+d]=="degree"){
      options["node"+d] = "weight";
      reload = true;
    }
  });
  if(reload && !options.degreeFilter) drawNet();
  applyDegreeFilter();

  displaySidebar();

  if(options.helpOn)
    displayWindow().html(options.help);

function displaySidebar(){
  var sidebar = body.select("div.sidebar"),
      sidebarOffset = 190 * Math.sqrt(options.cex),
      dragbar = body.select("body>div.dragbar");

  if(sidebar.empty()){

    sidebar = body.append("div")
      .attr("class", "sidebar")
      .style("width", sidebarOffset-15 + "px")

    if(typeof multiGraph != 'undefined'){
      var multiSel = sidebar.append("div")
        .attr("class","subSidebar multigraph");
      multiSel.append("h3").text(texts.netselection+":");
      multiGraph.graphSelect(multiSel);
    }

  // dragbar
  if(dragbar.empty()){
    dragbar = body.append("div")
      .attr("class","dragbar")
      .style({"width":"5px","cursor":"col-resize","position":"absolute","top":"0px","left":(sidebarOffset-5) + "px","z-index":1});

    dragbar.call(d3.behavior.drag()
      .on("dragstart", function() {
        body.style("cursor","col-resize");
        if(options.showSidebar)
          plot.select("svg").remove();
      })
      .on("drag", function() {
        var value = d3.mouse(body.node())[0];
        if(value > 177 && value < 400){
          dragbar.style("left", value + "px")
          sidebar.style("width", (value-10) + "px")
          if(options.showSidebar){
            panel.style("left", (value+5) + "px")
            width = docSize.width - 25 - value;
            plot.style("width",width+"px");
          }
        }
      })
      .on("dragend", function() {
        body.style("cursor",null);
        d3.selectAll(".sidebar select.attrSel").each(function(){ 
          this.__onchange();
        });
        if(options.showSidebar)
          plot.call(drawSVG);
      })
    );
  }

  }else{
    sidebar.selectAll("div.sidebar>div:not(.multigraph)").remove();
  }

  if(options.showSidebar){

    sidebarOffset = parseInt(sidebar.style("width"))+15;
    panel.style("left", sidebarOffset + "px");

  var divControl, applyFuncObject;
    
// sidebar nodes
  var sideNodes = sidebar.append("div")
    .attr("class","subSidebar nodes")

  sideNodes.append("h3").text(texts.nodes);

  var visData = heatmap?["Label","Color","Shape","Legend","OrderA","OrderD"]:["Label","Size","Color","Shape","Legend","Group"];
  divControl = sideNodes.append("div")
      .attr("class", "nodeAuto")
  addController(divControl, Graph.nodes, false, visData);

  sideNodes.call(filterSwitch);

  applyFuncObject = {};
  applyFuncObject[texts.filter] = applyFilter;
  applyFuncObject[texts.select] = applySelection;
  applyFuncObject[texts.egoNet] = function(query,data){
        applySelection(query,data);
        egoNet();
    };

  divControl = sideNodes.append("div")
      .attr("class","nodeSelect filter");
  addController(divControl, Graph.nodes, applyFuncObject);

// sidebar links
  var sideLinks = sidebar.append("div")
      .attr("class", "subSidebar links")

  sideLinks.append("h3").text(texts.links);

  visData = heatmap?["Intensity","Color","Text"]:["Width","Weight","Color","Text"];
  divControl = sideLinks.append("div")
      .attr("class", "linkAuto");
  addController(divControl, Graph.links, false,visData);

  sideLinks.call(filterSwitch);

  applyFuncObject = {};
  applyFuncObject[texts.filter] = applyFilter;
  divControl = sideLinks.append("div")
      .attr("class","linkSelect filter");
  addController(divControl, Graph.links, applyFuncObject);

// sidebar simple/advanced button
  var advanced = false;
  sidebar.append("div")
    .style("text-align","right")  
    .append("a")
      .text(texts.simpleadvanced)
      .on("click", function(){
        d3.event.preventDefault();
        if(advanced)
          sidebar.selectAll(".advanced").style("display","none")
        else
          sidebar.selectAll(".advanced").style("display",null)
        advanced = !advanced;
      })

    // change node d3 weight attribute name
    d3.selectAll('.sidebar .subSidebar.nodes select option[value=weight]').text(texts.degree);

  }else{
    sidebarOffset = 0;
    panel.style("left", null);
  }
  dragbar.style("height",(8 + parseInt(sidebar.style("height"))) + "px");
  width = docSize.width - sidebarOffset - 20;
  plot.select("svg").remove();
  plot.style("width",width+"px");
  plot.call(drawSVG);

  function filterSwitch(sel){
    sel.append("h4")
      .on("click", function(){
        var div = d3.select(this.parentNode).select(".filter"),
            show = div.style("display")!="block";
        d3.select(this).html(texts.filter + (show?" &#9662;":" &#9656;"))
        div.style("display",show?"block":null);
        if(show)
          div.select("select.attrSel").node().__onchange();
      })
      .html(texts.filter+" &#9656;");
  }
}

function addController(contr, data, applyFunc, visData){
  var attrData = d3.keys(data[0]),
      typeData = contr.attr("class").slice(0, 4);

  var i = 0,
      index = -1;
  for(var i = 0; i < noShowFields.length; i++){
    index = attrData.indexOf(noShowFields[i]);
    if(index > -1)
      attrData.splice(index,1);
  }

if(visData){

  var selectVisual = function(sel){
    var sels = sel.selectAll("visSel")
        .data(visData)
      .enter().append("div")
        .attr("class","visSel")
        .property("value",String)
    sels.append("span")
          .text(function(d){ return texts[d]; });
    sels.append("select")
    .on("change", function(){
      var visual = this.parentNode.value,
          attr = this.value,
          applyFunc = function(pickerProperty){ applyAuto(typeData,visual,attr,pickerProperty); }
      if(visual=="Color"||visual=="Group"){
        if(dataType(data,attr) == "number"){
          displayPicker(attr,applyFunc);
          return;
        }
      }
      applyFunc(false);
    })
    .selectAll("option")
        .data(attrData)
      .enter().append("option")
        .property("selected",function(d){
          var visual = this.parentNode.parentNode.value;
          if(options[typeData+visual]==d)
            return true;
          else
            return null;
        })
        .property("value",String)
        .text(String)
    sel.append("div").attr("class","clear")
  }

  var displayPicker = function(attr,callback){
    var picker = displayWindow(),
        scaleKeys = d3.keys(colorScales),
        fontsize = parseInt(picker.style("font-size"));
    picker.append("h2").text(texts.selectacolorscale+"\""+attr+"\"");
    picker
              .append("ul")
              .attr("class","picker")
              .selectAll("li")
              .data(scaleKeys)
                .enter().append("li")
                .property("val",String)
                .on("click",function(){
                  callback(this.val);
                  d3.select(picker.node().parentNode).remove();
                })
                .append("canvas")
                  .attr("id", function(d){ return "canvas"+d; })
                  .attr("width",fontsize*6)
                  .attr("height",fontsize)
                  .text(String)
    scaleKeys.forEach(function(d){
      var c = document.getElementById("canvas"+d);
      var ctx = c.getContext("2d");

      // Create gradient
      var grd = ctx.createLinearGradient(0,0,fontsize*6,0);
      grd.addColorStop(0,colorScales[d][0]);
      grd.addColorStop(0.5,colorScales[d][1]);
      grd.addColorStop(1,colorScales[d][2]);

      // Fill with gradient
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,fontsize*6,fontsize);
    });
  }

  attrData.unshift("-"+texts.none+"-");
  contr.call(selectVisual);

}else{

  var attrSelect = contr.append("select")
      .attr("class","attrSel");

  attrSelect.selectAll("option")
    .data(attrData)
    .enter().append("option")
      .property("value",String)
      .text(String)

    var selectedValues = {};

    var changeQuery = function(opA,opB){
      var key = attrSelect.property("value"),
          query = new Query(txtQuery.property("value")),
          b = opB == "=";
      selectedValues[key].forEach(function(d,i){
        if(typeof d == 'number'){
          if(b)
            opB = i==0?">":"<";
          else
            opB = i==0?"<":">";
        }
        query.add2Query(key,d,opA,opB);
      });

      txtQuery.property("value",query.query);
    }

    var changeAttrSel = function(val){
      valSelector.html("")
      var type = dataType(data,val);
      if(type == 'number'){
        var extent = d3.extent(data, function(d){ return d[val]; }),
            baseWidth = parseInt(valSelector.style("width"));
        if(!selectedValues[val])
          selectedValues[val] = extent;
        brushSlider(valSelector,extent,selectedValues[val],function(s){ selectedValues[val] = s; },baseWidth);
      }else{
        var dat = data.map(function(d){ return d[val]; });
        if(type != 'string')
          dat = dat.reduce(function(a,b) { return b ? a.concat(b) : a; }, []);
        valSelector.style("height",null);
        valSelector.append("select")
          .attr("multiple","multiple")
          .on("blur", function() { loadSelValues(val); })
          .selectAll("option")
        .data(d3.set(dat).values().sort())
          .enter().append("option")
          .property("value",function(d){ return d.replace(/\'/g, "\\'"); })
          .text(stripTags)
          .each(function(d){ if(selectedValues[val] && selectedValues[val].indexOf(d)!=-1)this.selected = true; })
      }
    }

    var loadSelValues = function(val){
      selectedValues[val] = [];
      valSelector.selectAll("option").each(function(){
        if(this.selected)
          selectedValues[val].push(this.value);
      })
      if(selectedValues[val].length == 0)
        delete selectedValues[val];
    }

  attrSelect.on("change", function() { 
    changeAttrSel(this.value);
  })

  var valSelector = contr.append("div")
      .attr("class","valSel")
      .style("margin-bottom",0);

  var advanced = contr.append("div")
        .attr("class","advanced")
        .style("display","none");

  advanced.append("button")
      .text("And")
      .on("click", function(){ changeQuery("and","="); });

  advanced.append("button")
      .text("Or")
      .on("click", function(){ changeQuery("or","="); });

  advanced.append("button")
      .text("Nand")
      .on("click", function(){ changeQuery("and","not"); });

  advanced.append("button")
      .text("Nor")
      .on("click", function(){ changeQuery("or","not"); });

  var txtQuery = advanced.append("textarea")
    .attr("name","query")
    .property("value","")
    .on("focus", function(){ txtQuery.style("height", "160px") })
    .on("blur", function(){ txtQuery.style("height", null) })

  contr.append("button")
      .text(texts.clear)
      .on("click", function(){
        selectedValues = {};
        changeAttrSel(attrSelect.property("value"));
        txtQuery.property("value","");
      });

  changeAttrSel(attrSelect.property("value"));

  if(typeof applyFunc == 'object'){
    var prepareQuery = function(){
      var query = null;
      if(txtQuery){
        if(advanced.style("display")=="none"){
          query = selectedValues2str(selectedValues,data);
        }else{
          query = new Query(txtQuery.property("value"));
          query = query.toJS();
        }
      }
      return query;
    }
    for(i in applyFunc){
      contr.append("button")
        .text(i)
        .on("click", function(){ 
          applyFunc[this.textContent](prepareQuery(),data); 
        });
    }
  }
}
} // end of addController
  
function applyDegreeFilter(){
  if(options.degreeFilter){
    var query = "d.weight >= " + options.degreeFilter[0] + " && d.weight <= " + options.degreeFilter[1];
    applyFilter(query,Graph.nodes);
  }
}

function applyFilter(query,data){
  data.forEach(function(d){ 
      if(eval(query)){
        delete d.noShow;
      }else{
        d.noShow = true;
        delete d.selected;
      }
  });
  drawNet();
}

function applySelection(query,data){
  data.forEach(function(d){
    if(eval(query))
      d.selected = true;
    else
      delete d.selected;
  });
  drawNet();
}

function applyAuto(item, visual, attr, pickerProperty){
    if(pickerProperty==false || attr=="-"+texts.none+"-")
        delete options["colorScale"+item+visual];
    else
        options["colorScale"+item+visual] = pickerProperty;
    if(attr=="-"+texts.none+"-")
        delete options[item+visual];
    else
        options[item+visual] = attr;
    if(item+visual == "nodeOrderA")
        delete options.nodeOrderD;
    if(item+visual == "nodeOrderD")
        delete options.nodeOrderA;
    if((item+visual == "nodeColor" && !options["colorScalenodeColor"]) || item+visual == "nodeShape")
        options.showLegend = true;
    drawNet();
}

function Query(q){
  this.query = q,
  this.ops = [" && "," || "," == "," != ","d['","']"],
  this.rpl = [" and "," or "," \\= "," not ","\\[","\\]"];
}

Query.prototype = {
  toJS: function() {
    var js = this.query;
    for(var i = 0;i<this.ops.length;i++)
      js = js.replace(new RegExp(this.rpl[i],"g"),this.ops[i]);
    return js!=""?js:"true";
  },
  add2Query: function(key,val,opA,opB) {
    var str = ((this.query != "")?" " + opA + " ":"")+"[" + key + "] " + opB + " '" + val + "'";
    this.query = this.query+str;
  }
}

function drawSVG(sel){
  var shiftKey = false,
    saved = {};

  var zoom = d3.behavior.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", zoomed);

  adaptLayout();

  force.size([width, height]);

  body
    .on("keydown", keyflip)
    .on("keyup", keyflip)

  
  var svg = sel.append("svg")
      .attr("xmlns","http://www.w3.org/2000/svg")
      .attr("width", width)
      .attr("height", height);

    svg.append("style")
     .text("text { font-family: sans-serif; font-size: "+body.style("font-size")+"; } "+
".scale text { font-size: 120%; fill: #444; } "+
".legend text.title { text-anchor: end; font-size: 160%; } "+
".link { opacity: .6; fill: none; } "+
".linkText, .axisLabel { stroke-width: 0.5px; font-size: 100%; fill: #999; } "+
".node { cursor: pointer; }"+
".node > path { stroke: #000; } "+
".node > circle { stroke: none; fill: none; } "+
".label { stroke-width: 0.5px; font-size: 100%; fill: #444; } "+
".shadow { stroke: #fff; stroke-width: 3px; stroke-opacity: .8; }"+
".area { opacity: 0.2; stroke-width:3; } "+
".axis { stroke: #aaa; }"+
".node.selected path, .node.selected circle { stroke: yellow; } "+
"g.heatmap path.cluster { stroke: #666; fill: none; }"+
".cellText { stroke-width: 0.6px; }"+
".cellText { fill: #fff; stroke: #fff; }");

  var defs = svg.append("defs");
  d3.keys(colorScales).forEach(function(d){ addGradient(defs,d,colorScales[d]); });

  defs.append("clipPath")
    .attr("id","heatmapClip")
    .append("rect")
      .attr("x",-((height*2)-width)/2)
      .attr("y",0)
      .attr("width",height*2)
      .attr("height",height)

  svg.call(zoom).on("dblclick.zoom",null);

  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style({"pointer-events":"all"})
    .on("dblclick",function(){
        d3.event.stopPropagation();
        deleteNoShow();
        applyDegreeFilter();
    })

  var net = svg.append("g")
    .attr("class","net")

  var brush = svg.append("g")
    .attr("class","brush")
    .call(d3.svg.brush()
        .x(d3.scale.identity().domain([0, width]))
        .y(d3.scale.identity().domain([0, height]))
        .on("brushend", function() {
          d3.selectAll(".legend > g > text").style("stroke",function(){
            delete this.parentNode.selected;
            return null;
          });
          var extent = d3.event.target.extent();
          if(extent[0][0]==extent[1][0] && extent[0][1]==extent[1][1]){
            d3.selectAll(".node").classed("selected", function(d) { return d.selected = false; });
          }else{
            extent[0][0] = 1/saved.scale * (extent[0][0] - saved.translate[0]);
            extent[0][1] = 1/saved.scale * (extent[0][1] - saved.translate[1]);
            extent[1][0] = 1/saved.scale * (extent[1][0] - saved.translate[0]);
            extent[1][1] = 1/saved.scale * (extent[1][1] - saved.translate[1]);
            d3.selectAll(".node").classed("selected", function(d) {
              return d.selected = d.selected ^ (extent[0][0] <= d.x && d.x < extent[1][0] && extent[0][1] <= d.y && d.y < extent[1][1]);
            });
          }
          d3.event.target.clear();
          d3.select(this).call(d3.event.target);
          showTables();
        }))

  brush.style("display","none");

  svg.append("g").attr("class","scale")
    .attr("transform", "translate("+(width-320)+",20)");

  var buttons = svg.append("g")
      .attr("class", "buttons")
      .attr("transform", "translate(20,20)")

  var sliders = buttons.append("g")
      .attr("class","sliders")
      .attr("transform",!options.showSidebar && !options.main && typeof multiGraph != 'undefined' && !d3.select(".sidebar").empty() ? "translate("+(parseInt(d3.select(".sidebar").style("width"))+15)+",0)":null)
      .style("opacity",options.stopped?0:null);

  var size = Math.min(width,height);

  if(typeof options.charge == 'function')
    options.charge = options.charge(size);
  if(typeof options.linkDistance == 'function')
    options.linkDistance = options.linkDistance(size);

  var chargeRange = [0,-(size*2)],
      linkDistanceRange = [0,size*3/4];

  if(options.charge<chargeRange[1])
    options.charge = chargeRange[1];
  if(options.linkDistance>linkDistanceRange[1])
    options.linkDistance = linkDistanceRange[1];

  displaySlider(sliders, 5*options.cex, chargeRange, texts.repulsion, 'charge');

  displaySlider(sliders, 20*options.cex, linkDistanceRange, texts.distance, 'linkDistance');

  drawNet();

  function zoomed() {
    if(!shiftKey){
      net.attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");
    }
  }

  function keyflip() {
    ctrlKey = d3.event.ctrlKey | d3.event.metaKey;
    shiftKey = d3.event.shiftKey;

    if(shiftKey){
        if(heatmap){
          Graph.nodes.forEach(function(d){
            delete d.selected;
          });
          showTables();
        }
        if(!saved.scale){
          saved.scale = zoom.scale();
          saved.translate = zoom.translate();
          brush.style("display",null);
        }
    }else{
        if(saved.scale){
          brush.style("display","none");
          zoom.scale(saved.scale)
          zoom.translate(saved.translate);
          saved = {};
        }
    }

  }

  function displaySlider(sliders, y, domain, txt, name){
    var scale = d3.scale.linear()
        .domain(domain)
        .range([0, 200])
        .clamp(true);

    var brush = d3.svg.brush()
        .x(scale)
        .extent([0, 0])
        .on("brush", brushed);

        sliders = sliders.append("g")
            .attr("class","slider "+name)

    var x = 0;

    sliders.append("text")
        .attr("x", x + 210)
        .attr("y", y + 3*options.cex)
        .text(txt);

    var slider = sliders.append("g")
        .attr("transform", "translate("+ x +","+ y +")")
        .attr("class", "x axis brushSlider")
        .call(d3.svg.axis()
          .scale(scale)
          .orient("bottom")
          .tickSize(0)
              .ticks(0))
        .append("g")
          .attr("class", "slider")
          .call(brush);

        slider.select(".background")
          .attr({"height":10,"y":-5})
          .style("cursor","pointer");

    var handle = slider.append("circle")
        .attr("class", "handle")
        .attr("r", 6);

    slider
        .call(brush.extent([options[name],options[name]]))
        .call(brush.event);

    slider.selectAll(".extent, .resize").remove();

    function brushed() {
      var value = brush.extent()[0];

      if (d3.event.sourceEvent && d3.event.sourceEvent.type!="click") {
        if("stopPropagation" in d3.event.sourceEvent){
          d3.event.sourceEvent.stopPropagation();
          value = scale.invert(d3.mouse(this)[0]);
          brush.extent([value, value]);
        }
      }

      handle.attr("cx", scale(value));
          options[name] = value;
          force[name](value);
          force.start();
    }
  }
}

function drawNet(){
  loadSVGbuttons();

  d3.select(".sliders").transition()
    .duration(500)
        .style("opacity",heatmap||options.stopped?0:1);
  
  var svg = d3.select(".plot svg g.net");

  var gScale = d3.select(".plot svg g.scale");
  gScale.selectAll("*").remove();

  if(Graph.tree){
    var hideChildren = function(d){
      d.childNodes.forEach(function(d){
        d.noShow = true;
        d.selected = false;
        hideChildren(d);
      });
    }
    Graph.nodes.filter(function(d){
      if(!d.noShow && d.childNodes.length)
        hideChildren(d);
    });
  }

  var nodes = Graph.nodes.filter(function(d){
    d.weight = 0;
    return !d.noShow;
  });
  if(nodes.length==0)
    return 0;

  var links = Graph.links.filter(function(d){ return !d.noShow && !d.target.noShow && !d.source.noShow; });

  for(var i=1; i<links.length; i++){
    for(var j = i-1; j>=0; j--){
      if((links[i].Source == links[j].Source && links[i].Target == links[j].Target)||(links[i].Source == links[j].Target && links[i].Target == links[j].Source)){
        if(!links[j].linkNum)
          links[j].linkNum = 1;
        links[i].linkNum = links[j].linkNum + 1;
        break;
      }
    }
  }

  force
    .nodes(nodes)
    .links(links)
    .start();

  // compute colors
  var colorNodesScale = setColorScale('nodes',"nodeColor"),
      colorGroupsScale = setColorScale('nodes',"nodeGroup"),
      colorLinksScale = setColorScale('links',"linkColor"),
  colorNodes = colorNodesScale?function(d){ return colorNodesScale(d[options.nodeColor]); }:defaultColor,
  colorGroups = colorGroupsScale?(function(d){ return colorGroupsScale(d[options.nodeGroup]); }):defaultColor,
  colorLinks = colorLinksScale?(function(d){ return colorLinksScale(d[options.linkColor]); }):defaultLinkColor;

  // compute link attributes
  if(heatmap){
    var getLinkIntensity = getNumAttr('links','linkIntensity',[0.1,1],1);
  }else{
    var getLinkDistance = getNumAttr('links','linkWeight',linkWeightRange,options.linkDistance),
        getLinkWidth = getNumAttr('links','linkWidth',linkWidthRange,1);

    // compute node size
    var getNodeSize = getNumAttr('nodes','nodeSize',nodeSizeRange,options.showImages?3:1);
    nodes.forEach(function(d){ d.nodeSize = getNodeSize(d); });

    // compute shapes
    var getShape = function() { return defaultShape; };
    if(options.nodeShape){
      var symbolList = d3.scale.ordinal()
         .range(symbolTypes)
         .domain(d3.map(Graph.nodes, function(d) { return d[options.nodeShape]; }).keys());

      getShape = function(d) { return symbolList(d[options.nodeShape]); }
    }
  }

  svg.attr("clip-path", heatmap&&heatmapTriangle?"url(#heatmapClip)":null);
  if(heatmap){ // draw heatmap

    svg.selectAll("*").remove();
    svg = svg.append("g")
               .attr("class","heatmap")

    var side = Math.min(width, height) - 100,
        mtop = (height - side),
        mleft = (width - side)/2;
    svg.attr("transform", heatmapTriangle? "translate(" + (width - (Math.sqrt(side*side*2))) / 2 + "," + height + ")rotate(-45)" : "translate(" + mleft + "," + mtop + ")");

    var x = d3.scale.ordinal().rangeBands([0, side]),
        matrix = [],
        n = nodes.length;

    nodes.forEach(function(node, i) {
      node.index = i;
      matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i}; });
    });

    links.forEach(function(link) {
      var val = options.linkIntensity?link[options.linkIntensity]:1,
          valColor = options.linkColor?link[options.linkColor]:1,
          loadMatrix = function(i,j){
            matrix[i][j][options.linkIntensity] = val;
            matrix[i][j].color = valColor;
            if(options.linkText)
              matrix[i][j].txt = link[options.linkText];
          }
      if(options.linkBipolar)
        val = Math.abs(val);
      loadMatrix(link.source.index,link.target.index);
      if(!options.showArrows || heatmapTriangle)
        loadMatrix(link.target.index,link.source.index);
    });

  if(options.nodeOrderA || options.nodeOrderD){
    if(options.nodeOrderA)
      options.nodeOrder = options.nodeOrderA;
    else
      options.nodeOrder = options.nodeOrderD;
    x.domain(d3.range(n).sort(function(a, b) {
          a = nodes[a][options.nodeOrder];
          b = nodes[b][options.nodeOrder]
          if(options.nodeOrderD)
            b = [a, a = b][0];
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        }));
  }else
    x.domain(d3.range(n));

  svg.append("rect")
      .style("fill","#eee")
      .attr("width", side)
      .attr("height", side);

  var row = svg.selectAll(".row")
      .data(matrix)
    .enter().append("g")
      .attr("class", "row")
      .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
      .each(rowFunc);

  row.append("line")
      .attr("x2", side)
    .style("stroke","#fff");

  appendText(row,true);
      
  var column = svg.selectAll(".column")
      .data(matrix)
    .enter().append("g")
      .attr("class", "column")
      .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

  column.append("line")
      .attr("x1", -side)
    .style("stroke","#fff");

  appendText(column,false);

  if(options.nodeOrder){
    var clusters = nodes.map(function(d){ return d[options.nodeOrder]; }).sort(function(a, b) { 
          if(options.nodeOrderD)
            b = [a, a = b][0];
          return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        }),
        step = NaN,
        lines = {};
    for(var i=0; i<clusters.length; i++){
      if(step!=String(clusters[i])){
        step = String(clusters[i]);
        lines[step] = [i,i];
      }else
        lines[step][1] = i;
    }
    svg.selectAll(".cluster")
        .data(d3.values(lines))
      .enter().append("path")
        .attr("class","cluster")
        .attr("d",function(d){
            var x1 = d[0]*x.rangeBand() + x.rangeBand()/2,
                x2 = d[1]*x.rangeBand() + x.rangeBand()/2;
            return "M"+x1+",-6L"+x1+",-12L"+x2+",-12L"+x2+",-6";
        })

    delete options.nodeOrder;
  }

  function appendText(sel,row){
    if(options.nodeLabel){
    sel.append("text")
      .attr("class","label")
      .attr("x", row? (heatmapTriangle? side + 6 : -6) : ((heatmapTriangle?-1:1) * (options.nodeOrder?18:6)))
      .attr("y", (!row & heatmapTriangle? -1 : 1) * (x.rangeBand() / 2))
      .attr("text-anchor", row ^ heatmapTriangle? "end" : "start")
      .attr("transform", !row & heatmapTriangle? "rotate(180)" : null)
      .attr("dy", ".32em")
      .style("fill",colorNodesScale? function(d, i) { return colorNodesScale(nodes[i][options.nodeColor]); } : null)
      .style("opacity",0)
      .text(function(d, i) { return (!row ? nodes[i][options.nodeLabel] : nodes[i][options.nodeName]); })
      .on("click",function(d,i){
        var name = nodes[i][options.nodeName];
        nodes.forEach(function(p){
            if(ctrlKey)
              p.selected = p.selected ^ name == p[options.nodeName];
            else
              p.selected = name == p[options.nodeName];
        });
        showTables();
      })
      .on("dblclick", row | !options.linkIntensity ? function(){
        Graph.links.forEach(function(d){
          if(!d.noShow && (((!options.showArrows || heatmapTriangle)&&d.target.selected)||(d.source.selected))){
                d.source.neighbor = d.target.neighbor = true;
          }
        });
        Graph.nodes.forEach(function(d){
          d.noShow = d.noShow || (!d.neighbor && !d.selected);
          delete d.neighbor;
        });
        drawNet();
      } : function(d,i){
        var order = d3.transpose(matrix)[i].sort(function(a,b){
              var aIntensity = a[options.linkIntensity]?a[options.linkIntensity]:0,
                  bIntensity = b[options.linkIntensity]?b[options.linkIntensity]:0;
              if(bIntensity==aIntensity){
                if(a.y==i) return -1;
                if(b.y==i) return 1;
                return a.y-b.y;
              }else
                return bIntensity-aIntensity;
            }).map(function(p){ return p.y; })
        x.domain(order);

        var t = svg.transition().duration(2500);

        svg.selectAll("path.cluster").remove();

        t.selectAll(".column .label").attr("x",((heatmapTriangle?-1:1) * 6))

        t.selectAll(".row")
          .delay(function(d, i) { return x(i) * 4; })
          .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
         .selectAll(".cell")
          .delay(function(d) { return x(d.x) * 4; })
          .attr("x", function(d) { return x(d.x); });

        t.selectAll(".row .cellText")
          .delay(function(d) { return x(d.x) * 4; })
          .attr("x", function(d) { return x(d.x) + x.rangeBand()/2; });

        t.selectAll(".column")
          .delay(function(d, i) { return x(i) * 4; })
          .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
      })
      .on("mouseover", function(){
        d3.select(this).style("stroke",d3.select(this).style("fill"));
      })
      .on("mouseout", mouseout)
      .transition()
      .duration(500)
      .style("opacity",1)
    }
  }

  function rowFunc(row) {
    d3.select(this).selectAll(".cell")
        .data(row.filter(function(d) { return d[options.linkIntensity]; }))
      .enter().append("rect")
        .attr("class", "cell")
        .attr("x", function(d) { return x(d.x); })
        .attr("width", x.rangeBand())
        .attr("height", x.rangeBand())
        .style("fill-opacity", getLinkIntensity)
        .style("fill", colorLinksScale?function(d) { return colorLinksScale(d.color); }:defaultColor)
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)
        .on("click",click)
        .on("dblclick",dblclick)
    if(options.linkText){
      d3.select(this).selectAll(".cellText")
        .data(row.filter(function(d) { return d[options.linkIntensity]; }))
      .enter().append("text")
        .attr("class", "cellText")
        .attr("x", function(d) { return x(d.x) + x.rangeBand()/2; })
        .attr("y", x.rangeBand()/2)
        .attr("dy", ".32em")
        .attr("text-anchor", "middle")
        .style("font-size", x.rangeBand()*2/5 + "px")
        .on("mouseover", mouseover)
        .text(function(d){
            if(!isNaN(+d.txt))
              return d3.round(d.txt,1);
            return d.txt;
        })
    }
  }

  function mouseover(p) {
    d3.selectAll(".row .label").style("stroke", function(d, i) {
      var color = d3.select(this).style("fill");
      if(i == p.y) return color; else return null;
    });
    d3.selectAll(".column .label").style("stroke", function(d, i) {
      var color = d3.select(this).style("fill");
      if(i == p.x) return color; else return null;
    });
  }

  function mouseout() {
    d3.selectAll(".label").style("stroke", null);
  }
  
  function click(p){
    links.forEach(function(l){ checkNeighbors(l,p); });
    nodes.forEach(function(n){
      n.selected = !n.noShow && n.neighbor;
      delete n.neighbor;
    });
    showTables();
  }

  function dblclick(p){
    links.forEach(function(l){ checkNeighbors(l,p); });
    nodes.forEach(function(n){
      n.selected = (!n.noShow && (n.index == p.x || n.index == p.y))? true : false;
      n.noShow = n.noShow || !n.neighbor;
      delete n.neighbor;
    });
    drawNet();
  }

    function checkNeighbors(l,p){
      if(!l.noShow && (((!options.showArrows || heatmapTriangle)&&(l.target.index==p.x || l.target.index==p.y)) || (l.source.index==p.x || l.source.index==p.y))){
        l.source.neighbor = l.target.neighbor = true;
      }
    }

  }else{ // draw network

    svg.select("g.heatmap").remove();

  //hide link distance slider for link weight representation or no links
  d3.select(".slider.linkDistance").style("display",!links.length || options.linkWeight?"none":null)

  //update link distance
  force
      .linkDistance(getLinkDistance)
      .start();

  //axes
  var axes = svg.selectAll(".axis")
      .data([[0,1],[1,0]])
    .enter().append("line")
      .attr("class","axis")
      .style("opacity",0)

  var axesLabelsAnchors = ["start","middle","end","middle"],
      axesLabels = svg.selectAll(".axisLabel")
        .data(options.axesLabels)
    .enter().append("text")
      .attr("class","axisLabel")
      .style("opacity",0)
      .text(String)
      .attr("text-anchor",function(d,i){
        return axesLabelsAnchors[i];
      })

  // labels
  var label = svg.selectAll(".label")
      .data(options.nodeLabel ? nodes : [], function(d) { return d[options.nodeName]; });

  label.exit().remove();

  var labelEnter = label.enter().insert("g",".axis")
    .attr("class", "label")
    .style("opacity", 0)

  labelEnter.append("text")
    .attr("class", "shadow")
    .attr("y", 4)

  labelEnter.append("text")
    .attr("y", 4)

  label.selectAll("text")
    .attr("x", function(d) { return 10+(d.nodeSize-1)*4; })
    .text(function(d) { return d[options.nodeLabel]; });

  labelEnter.transition()
      .duration(500)
      .style("opacity", 1);

  // nodes
  var node = svg.selectAll(".node")
      .data(nodes, function(d) { return d[options.nodeName]; });

  node.exit().remove();

  var nodeEnter = node.enter().insert("g",".label")
    .attr("class", "node")
        .on("click", function(d) {
          body.select("div.tooltip").style("display","none").html("");
          if(ctrlKey)
            d3.select(this).classed("selected", d.selected = !d.selected);
          else
            node.classed("selected", function(p) { return p.selected = d[options.nodeName] == p[options.nodeName]; });
          showTables();
          displayInfoPanel(d,options.nodeInfo);             
        })
        .on("dblclick", function(d) {
          d3.event.stopPropagation();
          if(Graph.tree && ctrlKey){
            d3.select(this).classed("selected", d.selected = true);
            treeAction();
          }else
            egoNet();
        })
        .call(force.drag);

  if(options.nodeText)
    tooltip(nodeEnter,options.nodeText);

  if(!options.nodeItem){
    nodeEnter.append("path")
  }else{

    node.selectAll("image, g, path, circle").remove();
    if(options.showImages){
      if(options.nodeItem == 'image'){
        node.append("circle")
        .attr("cx",0)
        .attr("cy",0)
        .attr("r",5.5);
        node.append("image")
        .attr("xlink:href", function(d){ return d.image; })
        .attr("x",-5)
        .attr("y",-5)
        .attr("width",10)
        .attr("height",10);
      }
      if(options.nodeItem == 'pie'){
        node.apend("g").call(addPie);
      }
    }else{
      node.append("path");
    }
  }

  node.selectAll(".node>path")
      .attr("d", d3.svg.symbol().type(getShape))
      .attr("stroke-width", function(d) { return 1/d.nodeSize; })
      .attr("fill", colorNodes);

  node.classed("selected", function(d) { return d.selected; });

  node.selectAll(".node > *").attr("transform", function(d) { return "scale("+d.nodeSize+")"; });

  var linkId = function(d){
    return "link_"+d3.range(0,d.Source.length).map(function(i){ return d.Source.charCodeAt(i); }).join("") + "_" + 
           d3.range(0,d.Target.length).map(function(i){ return d.Target.charCodeAt(i); }).join("") +
           (d.linkNum ? "_" + d.linkNum : "");
  };

  // links
  var link = svg.selectAll(".link")
        .data(links, linkId);

  link.exit().remove();

  link.enter().insert("path",".node")
      .attr("class", "link");

  link.attr("stroke-width", getLinkWidth)
      .attr("stroke", colorLinks)
      .attr("marker-end", (options.showArrows) ? function(d){ return "url(#"+linkId(d)+")"; } : null);


  // arrows
  if(options.showArrows){
    var marker = d3.select(".plot svg defs").selectAll("marker")
    .data(links, linkId);

    marker.exit().remove();

    marker.enter().append("marker")
      .attr("id", linkId)
      .attr("markerUnits", "userSpaceOnUse")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("orient", "auto")
      .append("path")

    var log2lwidth = function(d){ return Math.log(getLinkWidth(d)+1)/Math.log(2); }

    marker.attr("viewBox",function(d){
        var w = log2lwidth(d);
        return "0 "+(-3*w)+" 10 "+(6*w);
      })
      .attr("markerHeight", function(d){ return 8*log2lwidth(d); })
      .style("fill",colorLinks);

    marker.select("path") 
      .attr("d",function(d){
        var w = log2lwidth(d);
        return "M0,"+(-3*w)+"L10,"+(-0.5*w)+"L10,"+(0.5*w)+"L0,"+(3*w);
      })
  }

  // link text
  var linkText = svg.selectAll(".linkText")
        .data(options.linkText?links:[], linkId)

  linkText.exit().remove();

  linkText.enter().insert("text",".node")
      .attr("class", "linkText")

  linkText.text(function(d) { 
    var txt = d[options.linkText];
    return typeof txt == 'number'?formatter(txt):txt;
  });

  var groups = [];
  if(options.nodeGroup){
    groups = d3.map(nodes.filter(function(d){ return d[options.nodeGroup] !== null; }), function(d){ return d[options.nodeGroup]; }).keys();
    groups = groups.map(function(d){
      var dd = {};
      dd[options.nodeGroup] = d;
      dd.xExt = [0,0];
      dd.yExt = [0,0];
      return dd;
    });
  }

  // areas
  var area = svg.selectAll(".area")
        .data(groups)

  area.exit().remove();

  area.enter().insert("rect",".link")
    .attr("class", "area")
    .attr("rx", 10)

  area.style("stroke",colorGroups)
    .style("fill",function(d) { return d3.rgb(colorGroups(d)).brighter(0.6); });
  }

  // display legends
  var dat;
  if(options.nodeLegend){
    dat = nodes.map(function(d){ return d[options.nodeLegend]; });
    if(dataType(nodes,options.nodeLegend) == 'object')
      dat = dat.reduce(function(a,b) { return a.concat(b); }, []);
    dat = d3.set(dat).values();
    displayLegend(gScale,options.nodeLegend,"#000000","circle",dat.sort(sortAsc));
  }

  if(options.nodeColor && !options.colorScalenodeColor){
    dat = d3.map(nodes.filter(function(d){ return d[options.nodeColor]!==null; }), function(d){ return d[options.nodeColor]; }).keys();
    displayLegend(gScale,options.nodeColor,colorNodesScale,"circle",dat.sort(sortAsc));
  }

  if(options.nodeShape){
    dat = d3.map(nodes, function(d){ return d[options.nodeShape]; }).keys();
    displayLegend(gScale,options.nodeShape,"#000000",symbolList,dat.sort(sortAsc));
  }

  if(!heatmap && options.showImages){
    if(options.nodeItem == 'image'){
      var dat2 = false;
      if(options.imageNames){
        dat = nodes.map(function(d){ return [d[options.imageNames],d.image]; })
        dat.sort(function(a,b){
          return sortAsc(a[0],b[0]);
        })
        dat2 = d3.map(dat, function(d){ return d[0]; }).keys()
        dat = d3.map(dat, function(d){ return d[1]; }).keys()
        if(dat2.length!=dat.length)
          dat2 = false;
      }else{
        dat = d3.map(nodes, function(d){ return d.image; }).keys();
      }
      if(!dat2){
        dat.sort(function(a,b){
          a = getImageName(a);
          b = getImageName(b);
          return sortAsc(a,b);
        })
      }
      displayLegend(gScale,options.imageLegend,'image',dat2,dat);
    }
    if(options.nodeItem == 'pie')
      displayLegend(gScale,"pie",d3.scale.ordinal().range(categoryColors.slice(0,10)),"square",options.pieLegend);
  }

  showTables();

  function sortAsc(a,b){
        if(!isNaN(+a) && !isNaN(+b)){
            a = +a;
            b = +b;
        }
        return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }
}

function tick() {
    d3.selectAll(".link").attr("d", function(d,i) {
      var tx = d.target.x,
          ty = d.target.y;

      if(options.showArrows || d.linkNum){
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y;

        var dr = Math.sqrt((dx * dx) + (dy * dy));
      }

      if(options.showArrows){
        var radius = (d.target.nodeSize*4.514),
            offsetX = (dx * radius) / dr,
            offsetY = (dy * radius) / dr;

        tx = tx - offsetX;
        ty = ty - offsetY;
      }

      if(d.linkNum){
        var offset = (Math.ceil(d.linkNum/2))*10;

        var midpoint_x = (d.source.x + tx) / 2,
            midpoint_y = (d.source.y + ty) / 2;

        var offSetX = offset*(dy/dr),
            offSetY = offset*(dx/dr);

        if(d.linkNum%2 ^ (d.Target<d.Source)){
          offSetX = midpoint_x + offSetX;
          offSetY = midpoint_y - offSetY;
        }else{
          offSetX = midpoint_x - offSetX;
          offSetY = midpoint_y + offSetY;
        }

        return "M" + d.source.x + "," + d.source.y +
               "Q" + offSetX + "," + offSetY +
               " " + tx + "," + ty;
      }else
        return "M" + d.source.x + "," + d.source.y + "L" + tx + "," + ty;
    });

    d3.selectAll(".linkText").each(function(d){
      if(d.linkNum && d.linkNum%2==0)
        d3.select(this).attr("text-anchor", "end")

      if(d.linkNum){
        d3.select(this).attr("dy",(Math.floor(d.linkNum/2)%2==0? -1 : 1) * ((6*Math.ceil(d.linkNum/2))-3))
        d3.select(this).attr("dx",(d.linkNum%2==0? -1 : 1) * (Math.ceil(d.linkNum/2)*6))
      }

      d3.select(this)
        .attr("x", ((d.target.x)+(d.source.x))/2)
        .attr("y", ((d.target.y)+(d.source.y))/2);
    })

    d3.selectAll(".node, .net > .label").attr("transform", function(d){  return "translate(" + d.x + "," + d.y + ")"; });

    if(options.nodeGroup){
      d3.selectAll(".area").each(function(dd){
          var points = d3.selectAll(".node").filter(function(d){ return d[options.nodeGroup]==dd[options.nodeGroup]; }).data();
          dd.xExt = d3.extent(points,function(d){ return d.x;});
          dd.yExt = d3.extent(points,function(d){ return d.y;});
      })
        .attr("x", function(d){ return d.xExt[0]-3 })
        .attr("y", function(d){ return d.yExt[0]-3 })
        .attr("width", function(d){ return d.xExt[1]-d.xExt[0]+6 })
        .attr("height", function(d){ return d.yExt[1]-d.yExt[0]+6 });
    }
}

function forceEnd(){
  //update axes
    var nodes = Graph.nodes.filter(function(d){ return !d.noShow; }),
        extX = d3.extent(nodes, function(d){ return d.x; }),
        extY = d3.extent(nodes, function(d){ return d.y; });
    if(width - extX[1] < extX[0])
      extX[0] = width - extX[1];
    else
      extX[1] = width - extX[0];
    if(height - extY[1] < extY[0])
      extY[0] = height - extY[1];
    else
      extY[1] = height - extY[0];
    var size = Math.max((extX[1]-extX[0]),(extY[1]-extY[0]));
    size = size + axisExtension;

    d3.selectAll(".net .axis")
        .attr("x1",function(d){ return (d[0]*size/2) + (width-size)/2; })
        .attr("y1",function(d){ return (d[1]*size/2) + (height-size)/2; })
        .attr("x2",function(d){ return (size/(d[0]+1)) + (width-size)/2; })
        .attr("y2",function(d){ return (size/(d[1]+1)) + (height-size)/2; })
        .style("opacity",+options.showAxes)

    d3.selectAll(".net .axisLabel")
      .style("opacity",+options.showAxes)
      .attr("x",function(d,i){
        switch(i){
          case 1:
            return size/2 + (width-size)/2;
          case 2:
            return (width-size)/2 - 2;
          case 3:
            return size/2 + (width-size)/2;
          default:
            return size + (width-size)/2;
        }
      })
      .attr("y",function(d,i){
        switch(i){
          case 1:
            return (height-size)/2 - 2;
          case 2:
            return size/2 + (height-size)/2 + 4*options.cex;
          case 3:
            return size + (height-size)/2 + 8*options.cex;
          default:
            return size/2 + (height-size)/2 + 4*options.cex;
        }
      })
}

function setColorScale(item,itemAttr){
    if(options[itemAttr]){
      var data = !(item=='nodes' && options[itemAttr]=='weight') ? Graph[item] : force[item](),
          scale;
      if(options["colorScale"+itemAttr] && dataType(data,options[itemAttr]) == "number"){
        var colorDomain = d3.extent(data.filter(function(d){ return d !== null; }), function(d) { return d[options[itemAttr]]; }),
            nameScale = options["colorScale"+itemAttr];
        if(options[item.slice(0, 4)+"Bipolar"]){
          var absmax = Math.max(Math.abs(colorDomain[0]),Math.abs(colorDomain[1]));
          colorDomain = [-absmax,+absmax];
        }
        if((itemAttr=="nodeColor" && !heatmap) || (itemAttr=="linkColor" && heatmap))
          displayScale(colorDomain, "url(#"+nameScale+")");
        scale = d3.scale.linear().range(colorScales[nameScale])
          .domain([colorDomain[0],d3.mean(colorDomain),colorDomain[1]]);
      }else{
        options["colorScale"+itemAttr] = null;
        scale = d3.scale.ordinal().range(categoryColors)
          .domain(d3.map(data.filter(function(d){ return d[options[itemAttr]] !== null; }), function(d){ return d[options[itemAttr]]; }).keys());
      }
      return function(d){
               return (d === null)? (item == "nodes"? "#ffffff" : "#000000") : scale(d);
             };
    }else{
      return false;
    }
  }

function getNumAttr(item,itemAttr,range,def){
    if(options[itemAttr]){
      var data = !(item=='nodes' && options[itemAttr]=='weight') ? Graph[item] : force[item]();
      if(data.length){
        if(dataType(data,options[itemAttr]) == "number"){
          var attrDomain = d3.extent(data, function(d) { return options.linkBipolar? Math.abs(d[options[itemAttr]]) : +d[options[itemAttr]]; });
          if(attrDomain[0]!=attrDomain[1]){
            var scaleAttr = d3.scale.linear()
              .range(range)
              .domain(attrDomain);

            return function(d){
              if(d[options[itemAttr]] === null && (itemAttr == 'linkWidth' || itemAttr == 'linkIntensity'))
                return 0;
              if(options.linkBipolar){
                return scaleAttr(Math.abs(d[options[itemAttr]]));
              }else{
                if(d[options[itemAttr]] === null && attrDomain[0]<0)
                  return range[0];
                return scaleAttr(+d[options[itemAttr]]);
              }
            }
          }
        }
      }
    }
    return function(){ return def; }
}

function addGradient(defs,id, stops){
  var offset = 100/(stops.length-1);
  var gradient = defs.append("linearGradient")
    .attr("id",id)
    .attr("x1","0%")
    .attr("y1","0%")
    .attr("x2","100%")
    .attr("y2","0%");

  stops.forEach(function(d, i){
    gradient
    .append("stop")
    .attr("offset",(offset*i)+"%")
    .style("stop-color",d);
  });
}

function displayInfoPanel(d,i){
  if(i && d[i]){
    d3.select("div.infopanel").remove();
    var div = body.append("div")
          .attr("class","infopanel"),
        infoHeight = d3.select("div.tables").node().getBoundingClientRect().top
      - parseInt(div.style("top"))
      - parseInt(div.style("border-top-width"))
      - parseInt(div.style("border-bottom-width"))
      - parseInt(div.style("padding-top"))
      - parseInt(div.style("padding-bottom"));
    div.style("left",infoPanelLeft+"px");
    div.style("height",infoHeight+"px");
    div.append("div")
      .attr("class","drag")
      .call(d3.behavior.drag()
        .on("drag", function() {
          infoPanelLeft = d3.mouse(body.node())[0]-parseInt(div.style("border-left-width"));
          div.style("left",infoPanelLeft+"px");
        })
      )
    div.append("div")
          .attr("class","close-button")
          .html("&#x2716;")
          .on("click", function(){ div.remove() });
    div.append("div").html(d[i]);
  }
}

function addPie(nodeItem){
  var color = d3.scale.ordinal().range(categoryColors.slice(0,10));

  var arc = d3.svg.arc()
    .outerRadius(5)
    .innerRadius(0);

  var pie = d3.layout.pie()
    .sort(null);

  nodeItem.each(function(d){
    var g = d3.select(this).selectAll(".arc")
      .data(pie(JSON.parse(d.pie)))
    .enter().append("path")
      .attr("class", "arc")
      .attr("d", arc)
      .style("fill", function(d,i) { return color(i); })
      .style("stroke-width",1)
  });
}

function loadSVGbuttons(){
  var buttons = d3.select(".plot svg g.buttons"),
      dat = [],
      datStopResume = {txt: texts.stopresume, callback: stopResumeNet},
      datSidebar = {txt: texts.showhidesidebar, callback: function(){
        options.showSidebar = !options.showSidebar;
        displaySidebar();
      }, gap: 5},
      datDirectional = {txt: texts.directional, callback: function(){
        options.showArrows = !options.showArrows;
        drawNet(); 
      }},
      datLegend = {txt: texts.showhidelegend, callback: function(){
        options.showLegend = !options.showLegend;
        clickHide(d3.selectAll(".scale"), options.showLegend);
      }},
      datAxes = {txt: texts.showhideaxes, callback: function(){
        options.showAxes = !options.showAxes;
        clickHide(d3.selectAll(".net .axis"), options.showAxes);
        clickHide(d3.selectAll(".net .axisLabel"), options.showAxes);
      }},
      datImages = {txt: texts.showhideimages, callback: function(){
        options.showImages = !options.showImages;
        drawNet();
      }},
      datMode = {txt: texts.netheatmap, callback: function(){
        heatmap = !heatmap;
        if(heatmap){
          if(options.linkWidth){
              options.linkIntensity = options.linkWidth;
              delete options.linkWidth;
          }
        }else{
          if(options.linkIntensity){
              options.linkWidth = options.linkIntensity;
              delete options.linkIntensity;
          }
        }
        displaySidebar();
      }, gap: 5},
      datReset = {txt: texts.reset, callback: function(){ location.reload(); }},
      datPyramid = {txt : texts.trianglesquare, callback: function(){
        heatmapTriangle = !heatmapTriangle;
        drawNet();
      }};

  if(heatmap)
    dat = [datPyramid];
  else
    dat = [datStopResume];

  dat.push(datSidebar);
  dat.push(datDirectional);
  dat.push(datLegend);
  if(!heatmap) dat.push(datAxes);
  if(options.nodeItem) dat.push(datImages);

  if(Array.isArray(options.mode))
    dat.push(datMode);
  else
    datReset.gap = 5;

  dat.push(datReset);
  
  var gButton = buttons.selectAll(".button")
        .data(dat, function(d){ return d.txt; })

  gButton.exit().remove();

  gButton.enter().append("g")
    .attr("class","button")
    .each(function(d,i){

  d3.select(this).append("rect")
    .attr("x",0)
    .attr("y",5*(options.cex-1))
    .attr("rx",2)
    .attr("ry",2)
    .attr("width",30)
    .attr("height",10)
    .on("click",function(){
      d.callback();
    });

  d3.select(this).append("text")
      .attr("x",35)
    .attr("y",9*options.cex)
    .text(d.txt);

    })

  var count = 50;
  gButton.attr("transform",function(d){
      if(d.gap)
        count = count + d.gap;
      var val = "translate(0,"+count+")";
      count = count + 15*options.cex;
      return val;
  })
}

function selectAllNodes(){
  if(!Graph.nodes.filter(function(d){ return d.selected; }).length)
    Graph.nodes.forEach(function(d){
      if(!d.noShow)
        d.selected = true;
    });
  else
    Graph.nodes.forEach(function(d){
      delete d.selected;
    });
  drawNet();
}

function isolateNodes(){
  if(!Graph.nodes.filter(function(d){ return d.selected; }).length){
    displayWindow(texts.alertnonodes);
  }else{
    Graph.nodes.forEach(function(d){
      if(!d.selected)
        d.noShow = true;
    });
    drawNet();
  }
}

function deleteNoShow(){
  Graph.nodes.forEach(function(d){ delete d.noShow; });
  drawNet();
}

function selectNeighbors(){
  if(!Graph.nodes.filter(function(d){ return d.selected; }).length){
    displayWindow(texts.alertnonodes);
  }else{
    Graph.links.forEach(function(d){
      if(!d.noShow)
        if(d.source.selected || d.target.selected)
          d.source.neighbor = d.target.neighbor = true;
    });
    Graph.nodes.forEach(function(d){
      d.selected = !d.noShow && d.neighbor;
      delete d.neighbor;
    });
    drawNet();
  }
}

function egoNet(){
  if(!Graph.nodes.filter(function(d){ return d.selected; }).length){
    displayWindow(texts.alertnonodes);
  }else{
    Graph.links.forEach(function(d){
      if(!d.noShow)
        if(d.source.selected || d.target.selected)
          d.target.neighbor = d.source.neighbor = true;
    });
    Graph.nodes.forEach(function(d){
      d.noShow = d.noShow || (!d.neighbor && !d.selected);
      delete d.neighbor;
    });
    drawNet();
  }
}

function treeAction(){
  if(!Graph.nodes.filter(function(d){ return d.selected; }).length)
    Graph.nodes.forEach(function(d){
      if(!d.noShow)
        d.selected = true;
    });
  Graph.nodes.forEach(function(d){
    if(!d.selected)
      return;
    if(d.childNodes.length){
      d.childNodes.forEach(function(c){ delete c.noShow; });
      d.noShow = true;
      delete d.selected;
    }else{
      var return2roots = function(d){
        if(d.parentNode){
          return2roots(d.parentNode);
        }else
          delete d.noShow;
        };
      return2roots(d);
    }
  });
  drawNet();
}

function stopResumeNet(){
  d3.selectAll(".node").each(function(d){
    if(options.stopped)
      delete d.fixed;
    else
      d.fixed = 1;
  });
  if(options.stopped){
    d3.select(".sliders").transition()
    .duration(500)
        .style("opacity",1);
    force.resume();
  }else{
    d3.select(".sliders").transition()
    .duration(500)
        .style("opacity",0);
  }
  options.stopped = !options.stopped;
}

function clickHide(items, show) {
    items.transition()
      .duration(500)
      .style("opacity", +show);
}

function displayLegend(scale, txt, color, shape, dat){
  var y = scale.node().getBBox().height;
  if(y!=0)
    y = y + 40*options.cex;
  else
    y = y + 20*options.cex;

  if(dat.length > (height-y)/(20*options.cex) - 1.1)
    return 0;

  var key = (color == "image")? "image" : txt;

  var legend = scale.append("g")
    .attr("class","legend")
    .attr("transform", "translate(290,"+y+")")

  legend.append("text")
      .attr("class","title")
      .attr("x", -10)
      .attr("y", 5)
      .text(txt)
      .on("click",egoNet)

  if(d3.select(".legend .filter").empty()){
    legend.append("path")
        .attr("class","filter")
        .style({"fill":"#666","cursor":"pointer"})
        .attr("transform","scale(0.08)translate(-60,-70)")
        .attr("d","M110.1,16.4L75.8,56.8l0.3,1l50.6-10.2v32.2l-50.9-8.9l-0.3,1l34.7,39.1l-28.3,16.5L63.7,78.2L63,78.5   l-18.5,49L17.2,111l34.1-39.8v-0.6l-50,9.2V47.6l49.3,9.9l0.3-0.6L17.2,16.7L45.5,0.5l17.8,48.7H64L82.1,0.5L110.1,16.4z")
        .on("click", egoNet)
        .append("title")
          .text(texts.egoNet)
  }

  var g = legend.selectAll("g")
      .data(dat)
    .enter().append("g")
      .attr("transform", function(d, i){ return "translate(0," + (22+i*20)*options.cex + ")"; })
      .on("click", function(d){
        if(ctrlKey){
          if(this.selected)
            delete this.selected;
          else
            this.selected = key;
        }else{
          d3.selectAll(".legend > g").property("selected",null)
          this.selected = key;
        }
        d3.selectAll(".legend > g > text").style("stroke",function(){
            return this.parentNode.selected? "black" : null;
        });
        legendSelected();
        d3.selectAll(".node").classed("selected",function(d){ return d.selected; })
        showTables();
      })
      .on("dblclick", function(){
        if(Graph.tree && ctrlKey){
          this.selected = key;
          legendSelected();
          treeAction();
        }else
          isolateNodes();
      })

  function legendSelected(){
        var selecteds = d3.selectAll(".legend > g").filter(function(){ return this.selected; })
        Graph.nodes.forEach(function(d){
           d.selected = false;
           if(!d.noShow){
             selecteds.each(function(p){
               if((p=="null" && d[this.selected]===null) || (p=="0" && d[this.selected]===0) || (d[this.selected] && (d[this.selected]==p || (typeof d[this.selected] == 'object' && d[this.selected].indexOf(p)!=-1))))
                 d.selected = true;
             });
           }
        });
  }

  if(key == "image")
    g.append("image")
        .attr("xlink:href", String)
        .attr("x",-6)
        .attr("y",-8)
        .attr("width",16)
        .attr("height",16);
  else
    g.append("path")
      .attr("d", d3.svg.symbol().type(shape))
      .style("fill", color);

  g.append("text")
      .attr("x", -10)
      .attr("y", 4*options.cex)
      .style("text-anchor", "end")
      .text((key == "image") ? (shape? function(d,i){ return shape[i]; } : getImageName) : stripTags)

  scale.transition()
    .duration(500)
    .style("opacity",+options.showLegend);
}

function getImageName(path){
  var name = path.split("/");
  name = name.pop().split(".");
  name.pop();
  return name.join(".");
}

function stripTags(txt){
  return txt.replace(/(<([^>]+)>)/ig,"");
}

function displayScale(domain, fill){
    var scale = d3.select(".plot svg .scale");

    scale.style("opacity",0);

    scale.append("rect")
    .attr("x",0)
    .attr("y",0)
    .attr("height",10)
    .attr("width",300)
    .attr("rx",2)
    .attr("fill", fill);
    scale.append("text")
    .attr("x",0)
    .attr("y",12*options.cex + 12)
    .text(formatter(domain[0]));
    scale.append("text")
    .attr("x",300)
    .attr("y",12*options.cex + 12)
    .attr("text-anchor", "end")
    .text(formatter(domain[domain.length-1]));
    scale.transition()
    .duration(500)
    .style("opacity",+options.showLegend);
}

function showTables() {
  var noShow = noShowFields.slice(options.showCoordinates ? 4 : 2),

  tableWrapper = function(dat, name){
    var table = d3.select("div.tables div."+name),
    columns = d3.keys(dat[0]),
    drawTable = function(d){
      var tr = table.append("tr"),
        currentItem;
      if(d[options.nodeName])
        currentItem = d3.selectAll(".node.selected>path").filter(function(p){ return p[options.nodeName] == d[options.nodeName]; });
      else
        currentItem = d3.selectAll(".link").filter(function(p){ return (p.Source == d.Source) && (p.Target == d.Target); });
      columns.forEach(function(col){
          var txt = d[col],
              textAlign = null;
          if(txt == null)
            txt = "";
          if(typeof txt == 'object')
            txt = txt.join("; ");
          if(typeof txt == 'number'){
            txt = formatter(txt);
            textAlign = "right";
          }
          tr.append("td").html(txt)
              .style("text-align",textAlign)
              .on("mousedown",function(){ d3.event.preventDefault(); });
      });
      tr.on("mouseover",function(){ currentItem.style("stroke","red"); })
        .on("mouseout",function(){ currentItem.style("stroke",null); })
        .on("click",function(){
          var origin = this;
          table.selectAll("tr").classed("selected", function(){
            var selected = d3.select(this).classed("selected");
            if(ctrlKey)
              selected = selected ^ this === origin;
            else
              selected = this === origin;
            return selected;
          })
        });
    },

    drawHeader = function() {
        var thead = table.append("thead"),
            tbody = table.append("tbody"),
            desc = false;
        columns.forEach(function(d){
          var sort1 = function(a,b){
              var rv = [1,-1];
              a = a[d]==null?Infinity:a[d][options.nodeName]?a[d][options.nodeName]:a[d];
              b = b[d]==null?Infinity:b[d][options.nodeName]?b[d][options.nodeName]:b[d];
              if(typeof a == "number" && typeof b == "number"){
                if(!desc)
                  rv = rv.reverse();
              }else{
                if(desc)
                  rv = rv.reverse();
              }
              if (a > b) {
                return rv[0];
              }
              if (a < b) {
                return rv[1];
              }
              return 0;
            };
          thead.append("th")
            .text(d)
            .on("click",function(){
              tbody.html("");
              dat.sort(sort1);
              desc = !desc;
              dat.forEach(drawTable);
            });
        });
        return tbody;
    }

    table.html("");
    table.append("div")
      .attr("class","title")
      .html("<span>"+texts[name+"attributes"] + "</span> ("+dat.length+" "+texts.outof+" "+Graph[name].length+")");
    table = table.append("div");
    if(dat.length==0){
      table.style("cursor",null);
      table.on('mousedown.drag', null);
      table.text(texts.noitemsselected);
    }else{
      table = table.append("table");
      table.on("mousedown", function(){ d3.event.stopPropagation(); })
      table = drawHeader();
      dat.forEach(drawTable);
      table.each(function(){
        var twidth = this.parentNode.offsetWidth;
        d3.select(this.parentNode.parentNode)
            .style({"width":(twidth+8)+"px","cursor":"col-resize"})
            .call(d3.behavior.drag()
              .on("drag",function(){
                var coorx = d3.mouse(this)[0],
                    self = d3.select(this),
                    selfTable = self.select("table");
                selfTable.style("width",(coorx-8)+"px");
                if(selfTable.node().offsetWidth > (coorx-8))
                  selfTable.style("width",selfTable.node().offsetWidth+"px");
                else
                  self.style("width",coorx+"px");
              })
            )
      })
    }
  },

  size = Math.min(width,height),

  x = d3.scale.linear()
    .range([-width/size,+width/size])
    .domain([0,width]),

  y = d3.scale.linear()
    .range([height/size,-height/size])
    .domain([0,height]),

  cleanData = function(d){
    var dReturn = {}, key;
    for(key in d)
      if(noShow.indexOf(key)==-1)
        dReturn[key] = d[key];
    if(dReturn["x"])
      dReturn["x"] = d3.round(x(dReturn["x"]),2);
    if(dReturn["y"])
      dReturn["y"] = d3.round(y(dReturn["y"]),2);
    return dReturn;
  }

  var nodesData = Graph.nodes.filter(function(d){ return !d.noShow && d.selected; }).map(cleanData),
      linksData = Graph.links.filter(function(d){ return !d.noShow && (d.source.selected && d.target.selected); }).map(cleanData);
  tableWrapper(nodesData,"nodes");
  tableWrapper(linksData,"links");

  d3.selectAll(".tables .nodes th")
    .filter(function(){ return this.textContent == "weight"; })
      .text(texts.degree);
}

function tables2xlsx(){
      var nodes = [],
          links = [],
          tableNodes = d3.select(".tables .nodes table"),
          tableLinks = d3.select(".tables .links table"),
          loadData = function(table){
            var items = [];
            items.push([]);
            table.selectAll("th").each(function(){
              items[0].push(d3.select(this).text());
            })
            table.selectAll("tr").each(function(){
              var row = [];
              d3.select(this).selectAll("td").each(function(){
                var dat = d3.select(this).text();
                if(d3.select(this).style("text-align")=="right") dat = +dat;
                row.push(dat);
              })
              items.push(row);
            })
            return items;
          }
      if(!tableNodes.empty()){
        nodes = loadData(tableNodes);
      }
      if(!tableLinks.empty()){
        links = loadData(tableLinks);
      }
      if(nodes.length == 0 && links.length == 0)
        displayWindow(texts.noitemsselected);
      else
        downloadExcel({nodes: nodes, links: links}, d3.select("head>title").text());
}

function selectNodesFromTable(){
        var names = [],
            index = 0,
            trSelected;
        if(d3.select("div.tables div.nodes").style("display")=="block"){
          trSelected = d3.selectAll("div.nodes table tr.selected");
          if(!trSelected.empty()){
            d3.selectAll("div.nodes table th").each(function(d,i){
              if(this.textContent == options.nodeName)
                index = i+1;
            })
            trSelected
              .each(function(){
                names.push(d3.select(this).select("td:nth-child("+index+")").text());
              })
              .classed("selected",false);
          }
        }else{
          trSelected = d3.selectAll("div.links table tr.selected");
          if(!trSelected.empty()){
            trSelected
              .each(function(){
                for(var i=1; i<=2; i++){
                  index = d3.select(this).select("td:nth-child("+i+")").text();
                  if(names.indexOf(index)==-1)
                    names.push(index);
                }
              })
              .classed("selected",false);
          }
        }
        if(!trSelected.empty()){
          Graph.nodes.forEach(function(d){
            d.selected = names.indexOf(d[options.nodeName]) != -1;
          });
          drawNet();
        }
}

function adaptLayout(){
  var anyFixed = false;
  for(var i=0; i<Graph.nodes.length; i++){
    if(Graph.nodes[i].fixed){
      anyFixed = true;
      break;
    }
  }
  if(anyFixed){
  var size = Math.min(width,height),
      xdim, ydim, xrange, yrange,
      centerDim = function(dim){
        if(dim[0]==dim[1]){
          dim[0] = dim[0] - 1;
          dim[1] = dim[1] + 1;
        }
        return dim;
      }

  if(oldWidth && oldHeight){
    var oldSize = Math.min(oldWidth,oldHeight);
    xdim = [(oldWidth-oldSize)/2,(oldWidth-oldSize)/2+oldSize];
    ydim = [(oldHeight-oldSize)/2,(oldHeight-oldSize)/2+oldSize];
    xrange = [(width-size)/2,(width-size)/2+size];
    yrange = [(height-size)/2,(height-size)/2+size];
  }else{
    xdim = centerDim(d3.extent(Graph.nodes,function(d){ return d.x }));
    ydim = centerDim(d3.extent(Graph.nodes,function(d){ return d.y }));
    size = size/1.2;
    xrange = [(width-size)/2,(width-size)/2+size];
    yrange = [(height-size)/2+size,(height-size)/2];
  }

  oldWidth = width;
  oldHeight = height;

  var x = d3.scale.linear()
    .range(xrange)
    .domain(xdim);

  var y = d3.scale.linear()
    .range(yrange)
    .domain(ydim);

  Graph.nodes.forEach(function(d){
    delete d.px;
    delete d.py;
    if(d.fixed){
      d.x = x(d.x);
      d.y = y(d.y);
    }else{
      delete d.x;
      delete d.y;
      options.stopped = false;
    }
  });
  }
}

function embedImages(callback){

  var docSize = viewport(),
      loading = body.append("div")
      .attr("class","loading")
      .style({"width":docSize.width+"px","height":docSize.height+"px"});

  loading.append("p")
    .text(texts.loading)

  if(options.showImages){
    if(options.nodeItem == 'image' && !images){

      images = {};

      var imgLinks = d3.set(Graph.nodes.map(function(d){ return d.image; })).values();

      var loadImage = function(i){
        var imgSrc = imgLinks[i++];
        var img = new Image();
        img.onload = function() {
          var canvas = document.createElement("canvas");
          canvas.width = this.width;
          canvas.height = this.height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(this, 0, 0);
          try{
            images[imgSrc] = [canvas.toDataURL(),[canvas.width,canvas.height]];
          }catch(e){
            options.showImages = false;
            drawNet();
            i = imgLinks.length;
          }finally{
            if(i<imgLinks.length){
              loadImage(i);
            }else{
              callback();
              loading.remove();
            }
          }
        }
        img.src = imgSrc;
      }

      loadImage(0);
      return 0;
    }
    if(options.nodeItem == 'pie'){
      options.showImages = false;
      drawNet();
    }
  }
  callback();
  loading.remove();
}

function svgDownload(){

  var svg = d3.select(".panel>.plot>svg"),
      title = d3.select("head>title").text()+'.svg';
  svg.selectAll(".buttons").style("display","none");
  if(options.main){
    svg.append("text")
      .attr("class","main")
      .attr({"x":+svg.attr("width")/2, "y":30})
      .style({"text-anchor":"middle", "font-size":d3.select("div.main").style("font-size")})
      .text(options.main);
  }
  if(options.note){
    svg.append("text")
      .attr("class","note")
      .attr({"x":10, "y":+svg.attr("height")-10})
      .style({"font-size":d3.select("div.note").style("font-size")})
      .text(options.note);
  }
  var svgString = new XMLSerializer().serializeToString(svg.node());
  if(images){
    var zip = new JSZip();
    zip.file(title, svgString);
    var dir = zip.folder("images");
    d3.entries(images).forEach(function(d){
      dir.file(d.key.split("/").pop(),d.value[0].substring(22),{base64: true});
    });
    zip.generateAsync({type:"blob"})
    .then(function(content) {
        fileDownload(content, (title.split(".")[0])+".zip");
    });
  }else{
    var svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    fileDownload(svgBlob, title);
  }
  svg.select("svg>text.main").remove()
  svg.select("svg>text.note").remove()
  svg.selectAll(".buttons").style("display",null);
}

function svg2pdf(){

  var doc = new jsPDF((width>height)?"l":"p","pt",[width,height]);

  doc.polygon = pdfPolygon;

  doc.setTextColor(68);

  d3.selectAll("div.main").each(function(){
    doc.setFontSize(parseInt(d3.select(this).style("font-size")));
    doc.setFontType("bold");
    doc.text(12, 28, this.textContent);
  })

  doc.setFontType("normal");

  d3.selectAll("div.note").each(function(){
    doc.setFontSize(parseInt(d3.select(this).style("font-size")));
    doc.text(12, height-12, this.textContent);
  })

  if(d3.select(".scale").style("opacity")!=0){
    if(!d3.select(".scale>rect").empty()) {
      var colors = colorScales[d3.select(".scale rect").attr("fill").replace(/(url\()|(\))/g, "").replace("#","")];
          var canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 10;
          var ctx = canvas.getContext("2d");
  var grd = ctx.createLinearGradient(0,0,300,0);
  grd.addColorStop(0,colors[0]);
  grd.addColorStop(0.5,colors[1]);
  grd.addColorStop(1,colors[2]);
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,300,10);
          var uri = canvas.toDataURL();
      doc.addImage(uri, 'PNG', (width-320), 20, 300, 10);
      doc.setFontSize(parseInt(d3.select(".scale>text").style("font-size")));
      d3.selectAll(".scale>text").each(function(){
        var x = parseInt(d3.select(this).attr("x"))+(width-320),
        y = parseInt(d3.select(this).attr("y"))+20,
        t = d3.select(this).text();
        doc.text(x, y, t);
      });
    }

    if(!d3.select(".scale .legend").empty()) {
      d3.selectAll(".scale .legend").each(function(){
        var sel = d3.select(this),
        y = d3.transform(sel.attr("transform")).translate[1]+10,
        fontSize = parseInt(sel.select(".title").style("font-size")),
        t = sel.select(".title").text(),
        txtWidth = doc.getStringUnitWidth(t) * fontSize;
        doc.setFontSize(fontSize);
        doc.text(width-txtWidth-60, y+10, t)
        fontSize = parseInt(sel.selectAll("g>text").style("font-size"));
        doc.setFontSize(fontSize);
        sel.selectAll("g").each(function(d,i){
          var el = d3.select(this),
              gy = d3.transform(el.attr("transform")).translate[1],
              x = width-60,
              t = el.select("text").text(),
              txtWidth = doc.getStringUnitWidth(t) * fontSize;
          if(el.select("image").empty()){
            var color = d3.rgb(el.select("path").style("fill")),
                d = el.select("path").attr("d");
            doc.setFillColor(color.r,color.g,color.b);
            doc.polygon(d,x,y+gy,[1,1],"F");
          }else{
            var imgSrc = el.select("image").attr("href");
            if(images[imgSrc]){
              var imageSize = images[imgSrc][1],
                  imgHeight = imageSize[1]*10/imageSize[0];
              doc.addImage(images[imgSrc][0], 'PNG', x, y+gy-4, 10, imgHeight);
            }
          }
          doc.text(x-txtWidth-10, y+gy+4, t);
        });
      })
    }
  }

  var transform = d3.select(".net").attr("transform"),
      translate = [0,0],
      scale = 1;

  if(transform){
    transform = d3.transform(transform);
    translate = transform.translate;
    scale = transform.scale[0];
  }

  doc.setLineWidth(scale);

  var areas = [];
  d3.selectAll(".area").each(function(){
    var d = {};
      d.colorf = applyOpacity(d3.rgb(d3.select(this).style("fill")),0.2,{r:255,g:255,b:255});
      d.colord = applyOpacity(d3.rgb(d3.select(this).style("stroke")),0.2,{r:255,g:255,b:255});
      d.x = (parseFloat(d3.select(this).attr("x"))*scale)+translate[0];
      d.y = (parseFloat(d3.select(this).attr("y"))*scale)+translate[1];
      d.width = parseFloat(d3.select(this).attr("width"))*scale;
      d.height = parseFloat(d3.select(this).attr("height"))*scale;
    areas.push(d);
  });
  areas.sort(function(a,b){
    var areaA = a.width * a.height,
        areaB = b.width * b.height;
    if (areaA < areaB) {
      return 1;
    }
    if (areaA > areaB) {
      return -1;
    }
    return 0;
  });
  areas.forEach(function(d){
    doc.setFillColor(d.colorf.r,d.colorf.g,d.colorf.b);
    doc.setDrawColor(d.colord.r,d.colord.g,d.colord.b);
    doc.roundedRect(d.x,d.y,d.width,d.height,10,10,"FD");
  });

  d3.selectAll(".link").each(function(){
    var self = d3.select(this),
        color = applyOpacity(d3.rgb(self.attr("stroke")),0.6,{r:255,g:255,b:255}),
        w = self.attr("stroke-width")*scale;
    doc.setDrawColor(color.r,color.g,color.b);
    doc.setLineWidth(w);
    var points = self.attr("d");
    points = points.replace("M","");
    points = points.split("L");
    if(points.length<2)
      return;
    points[0] = points[0].split(/[,| ]/).filter(function(d){ return d.length>0; });
    points[1] = points[1].split(/[,| ]/).filter(function(d){ return d.length>0; });

    var  x1 = (parseFloat(points[0][0])*scale)+translate[0],
         x2 = (parseFloat(points[1][0])*scale)+translate[0],
         y1 = (parseFloat(points[0][1])*scale)+translate[1],
         y2 = (parseFloat(points[1][1])*scale)+translate[1];

    doc.line(x1, y1, x2, y2);

    if(options.showArrows){
      doc.setFillColor(color.r,color.g,color.b);
      var dx = x2-x1,
          dy = y2-y1,
          dr = Math.sqrt(dx*dx+dy*dy),
        tx = dx/dr*8,
        ty = dy/dr*8,
        x3 = x2-(ty/2)-tx,
        y3 = y2+(tx/2)-ty,
        x4 = x2+(ty/2)-tx,
        y4 = y2-(tx/2)-ty;
      doc.triangle(x4,y4,x2,y2,x3,y3,"F")
    }
  });

  if(!d3.select(".linkText").empty())
    doc.setFontSize(parseInt(d3.select(".linkText").style("font-size"))*scale);
  doc.setTextColor(143);
  d3.selectAll(".linkText").each(function(){
    var x = (parseFloat(d3.select(this).attr("x"))*scale)+translate[0],
        y = (parseFloat(d3.select(this).attr("y"))*scale)+translate[1],
        t = d3.select(this).text();
    doc.text(x, y, t);
  });

  d3.selectAll(".node").each(function(){
    var item = d3.select(this.childNodes[0]),
        color = d3.rgb(item.attr("fill")),
        sColor = d3.rgb(item.style("stroke")),
        size = d3.transform(item.attr("transform")),
        size = size.scale[0]*scale,
        position = d3.transform(d3.select(this).attr("transform")),
        x = (parseFloat(position.translate[0])*scale)+translate[0],
        y = (parseFloat(position.translate[1])*scale)+translate[1];
    if(d3.select(this).select('image').empty()){
      doc.setLineWidth(parseInt(item.style("stroke-width")));
      doc.setDrawColor(sColor.r,sColor.g,sColor.b);
      doc.setFillColor(color.r,color.g,color.b);
      var points = item.attr("d");
      doc.polygon(points, x, y, [size,size], 'FD');
    }else{
      var imgSrc = item.attr("href");
      if(images[imgSrc]){
        var imageSize = images[imgSrc][1],
            imgHeight = imageSize[1]*10/imageSize[0];
        doc.addImage(images[imgSrc][0], 'PNG', x-5*size, y-(imgHeight/2)*size, 10*size, imgHeight*size);
      }
    }
  });

  doc.setFontSize(parseInt(d3.select(".label text").style("font-size"))*scale);
  doc.setTextColor(64);
  d3.selectAll(".label").each(function(){
    var item = d3.select(this),
        position = d3.transform(item.attr("transform")),
        x = (parseFloat(position.translate[0])*scale)+translate[0],
        y = (parseFloat(position.translate[1])*scale)+translate[1],
        txt = item.select("text");
    x = x+parseFloat(txt.attr("x"));
    y = y + 3;
    txt = txt.text();
    doc.text(x, y, txt);
  });

  doc.save(d3.select("head>title").text()+".pdf");
}

window.onresize = function(){
  docSize = viewport();
  width = docSize.width;
  height = docSize.height - 2;

  width = width - parseInt(panel.style("left")) - 20;
  if(options.controls.indexOf(3)!=-1){
      height = height - 160;
  }else if(options.controls.indexOf(2)!=-1){
      height = height - (38 + 12*options.cex);
  }

  plot.select("svg").remove();
  plot.style("width",width+"px");
  plot.style("height",height+"px");
  plot.call(drawSVG);
}

} // network function end

if(typeof multiGraph == 'undefined'){
  window.onload = function(){
    network(JSON.parse(d3.select("#data").text()));
  };
}
