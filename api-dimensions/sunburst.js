import data from "./data.json" assert {type: "json"};


// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sunburst

//Essentially it consumes a JSON object and returns another object with additional data for each node. 
//For example each node now contains the original data, as well as the depth and height of the node in the tree, 
//as well as a copy of the parent node and all of the children nodes.
const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

//ajoute les attributs suivants dans l'objet root lors du partitionnement afin d'avoir les coordonnées pour chaque arc
// x0 : starting angle in radians
// x1 : ending angle in radians
// y0 : inner radius
// y1 : outer radius
const hierarchy = d3.hierarchy(data)
    .sort((a, b) => b.value - a.value)
    .count();
const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
root.each(d => {
    //for hover to identify each node
    d.uuid = self.crypto.randomUUID();
    //for mapping a node with an html text
    d.path = d.ancestors().map(d => d.data.name).reverse().join("/");
    //for zoomable
    d.current = d;
});

const sort = (a, b) => d3.descending(a.value, b.value); // how to sort nodes prior to layout
//const getlabel = d => d.label; // given a node d, returns the name to display on the rectangle
const link = null; // given a node d, its link (if any)
const linkTarget = "_blank"; // the target attribute for links (if any)
const width = 928; // outer width, in pixels
const height = width; // outer height, in pixels
const margin = 1; // shorthand for margins
const marginTop = margin; // top margin, in pixels
const marginRight = margin; // right margin, in pixels
const marginBottom = margin; // bottom margin, in pixels
const marginLeft = margin; // left margin, in pixels
const padding = 1; // separation between arcs
const fill = "#ccc"; // fill for arcs (if no color encoding)
const fillOpacity = 0.6; // fill opacity for arcs


// rayon du cercle interne
const radius = width / 6;
const startAngle = 0; // the starting angle for the sunburst
const endAngle = 2 * Math.PI; // the ending angle for the sunburst

// Construct an arc generator.
//les attributs x0,x1,Y0 et y1 ont été créés lors de la partition sur l'objet root
const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

// création de l'élement SVG qui sera ajouté dans le DOM, équivalent <svg>    
const svg = d3.create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    .style("font", "10px sans-serif");

const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
    .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
    .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
    .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
    //.attr("class", "sunburst-node-arc")
    .attr("d", d => arc(d.current));

//on change le look du pointeur sur les éléments clickables    
path
    .filter(d => d.children)
    .style("cursor", "pointer")

path.on("click", clicked);

//on change la couleur des arcs lorsque le pointeur passe dessus
path.filter(d => d.children)
    .on("mouseover", hoverIn);
path.filter(d => d.children)
    .on("mouseout", hoverOut);


//ajout du title mais pas visible car hover surchargé
const format = d3.format(",d");
path.append("title")
    .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

//title = la fonction pour trouver le titre d'un element de data, ie ce qui s'affiche sur le mouse-over
//const title = (d, n) => `${n.ancestors().reverse().map(d => d.data.name).join(">")}`;
//path.append("title").text(d => title(d.data, d));

//ajout du label dans les arcs
const label = svg.append("g")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .attr("transform", d => labelTransform(d.current))
    .text(d => d.data.label);

//ajout du cercle central clickable
const parent = svg.append("g")
    .attr("class", "circle")
    .append("circle")
    .datum(root)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .style("cursor", "pointer");

parent.on("click", clicked);

const parentLabel = svg.selectAll(".circle")
    .append("text").text(root.data.label)
    .attr("fill-opacity", 1)
    .attr("text-anchor", "middle")
    .attr("class", "center-circle")
    .attr("font-weight", 900); //bold

//ajout du svg au DOM
container.append(svg.node());
insertHtmlDetail(null);



function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
}

function clicked(event, p) {
    clickedDetail(event, p);
    if ((p.data.name == "api-governance") || (p.children)) {
        clickedZoom(event, p);
    }
}


function clickedDetail(event, p) {
    console.log("path of clicked element = " + p.path);
    //let filePath = p.path.replaceAll("/", "_");
    insertHtmlDetail("./details/" + p.path + ".html");
}


// Handle zoom on click.
function clickedZoom(event, p) {

    console.log('clikced : ' + event);

    parent.datum(p.parent || root);
    parentLabel.text(p.data.label || root.label);

    root.each(d => d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
    });

    const t = svg.transition().duration(750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    d3.selectAll("path")
        .transition(t)
        .tween("data", d => {
            const i = d3.interpolate(d.current, d.target);
            return t => d.current = i(t);
        })
        .filter(function (d) {
            return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")

        .attrTween("d", d => () => arc(d.current));

    label.filter(function (d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
    }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
}

function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    //TODO DBUG !!!!!!
    //return (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10
}

function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}

function hoverIn(event, p) {
    const fillOpacity = Number(path.filter(e => { return e.uuid == p.uuid }).attr("fill-opacity"));
    path.filter(e => { return e.uuid == p.uuid }).attr("fill-opacity", fillOpacity + 0.2);
}

function hoverOut(event, p) {
    const fillOpacity = Number(path.filter(e => { return e.uuid == p.uuid }).attr("fill-opacity"));
    path.filter(e => { return e.uuid == p.uuid }).attr("fill-opacity", fillOpacity - 0.2);
}



async function insertHtmlDetail(filePath) {
    let defaultPath = "./details/api-governance.html";
    let html = null;
    //console.log("filePath = " + filePath);

    try {
        if (filePath != null) {
            html = await d3.text(filePath);
        } else {
            html = await d3.text(defaultPath);
        }
    } catch (error) {
        console.log("error fetching");
        html = await d3.text(defaultPath);
    }
    console.log("html = " + html);

    //console.log("html fetched = " + html);
    d3.select("#detail").html(html);
}