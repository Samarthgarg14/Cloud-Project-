// Global state for RAG
let nodes = [];
let links = [];
let simulation;
let svg, linkGroup, nodeGroup, labelGroup;
let width, height;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initD3();
});

// --- UI Logic ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function logMessage(msg, type = 'info', targetLog = 'rag-log-content') {
    const logContainer = document.getElementById(targetLog);
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `> ${msg}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// --- RAG / D3.js Logic ---

function initD3() {
    const container = document.getElementById('d3-container');
    if(!container) return;
    
    // Use fallback initially
    width = container.clientWidth || 800;
    height = container.clientHeight || 600;

    svg = d3.select("#d3-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`);
        
    // Keep graph perfectly scaled and centered if window resizes or flex layout shifts
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
                svg.attr("viewBox", `0 0 ${width} ${height}`);
                if (simulation) {
                    simulation.force("center", d3.forceCenter(width / 2, height / 2));
                    simulation.alpha(0.3).restart();
                }
            }
        }
    });
    resizeObserver.observe(container);

    // Define arrow markers for graph links
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25) // push arrow away from center
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", "var(--text-muted)")
        .attr("d", "M0,-5L10,0L0,5");
        
    svg.append("defs").append("marker")
        .attr("id", "arrow-cycle")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("fill", "var(--danger)")
        .attr("d", "M0,-5L10,0L0,5");

    linkGroup = svg.append("g").attr("class", "links");
    nodeGroup = svg.append("g").attr("class", "nodes");
    labelGroup = svg.append("g").attr("class", "labels");

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(40));
}

function updateGraph() {
    // Links
    let link = linkGroup.selectAll("line").data(links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);
    link.exit().remove();
    let linkEnter = link.enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");
    link = linkEnter.merge(link);

    // Nodes
    let node = nodeGroup.selectAll("g.node-element").data(nodes, d => d.id);
    node.exit().remove();
    
    let nodeEnter = node.enter().append("g")
        .attr("class", "node-element")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Draw circles for processes, rects for resources
    nodeEnter.each(function(d) {
        if (d.type === 'process') {
            d3.select(this).append("circle")
                .attr("class", "node process")
                .attr("r", 25);
        } else {
            d3.select(this).append("rect")
                .attr("class", "node resource")
                .attr("width", 44)
                .attr("height", 44)
                .attr("x", -22)
                .attr("y", -22)
                .attr("rx", 6); // rounded corners
        }
    });

    node = nodeEnter.merge(node);

    // Labels
    let label = labelGroup.selectAll("text").data(nodes, d => d.id);
    label.exit().remove();
    let labelEnter = label.enter().append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .text(d => d.id);
    label = labelEnter.merge(label);

    simulation.nodes(nodes).on("tick", ticked);
    simulation.force("link").links(links);
    simulation.alpha(1).restart();

    function ticked() {
        // Constrain nodes to stay within the viewBox bounds
        const padding = 35;
        node.each(function(d) {
            d.x = Math.max(padding, Math.min(width - padding, d.x));
            d.y = Math.max(padding, Math.min(height - padding, d.y));
        });

        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
        label.attr("x", d => d.x).attr("y", d => d.y);
    }
}

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}
function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}
function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// --- App Functions ---

function addNode() {
    const id = document.getElementById('node-id').value.trim();
    const type = document.getElementById('node-type').value;
    
    if (!id) return;
    if (nodes.find(n => n.id === id)) {
        logMessage(`Node ${id} already exists`, 'error');
        return;
    }
    
    nodes.push({ id, type });
    updateGraph();
    logMessage(`Added ${type} node: ${id}`, 'success');
    document.getElementById('node-id').value = '';
}

function addEdge() {
    const source = document.getElementById('edge-source').value.trim();
    const target = document.getElementById('edge-target').value.trim();
    
    if (!source || !target) return;
    
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);
    
    if (!sourceNode || !targetNode) {
        logMessage("Source or target node not found", 'error');
        return;
    }
    
    // OS Rule 1: No Process->Process or Resource->Resource edges
    if (sourceNode.type === targetNode.type) {
        logMessage(`Invalid: Cannot connect ${sourceNode.type} directly to ${targetNode.type}`, 'error');
        return;
    }
    
    // Check if edge already exists
    const exists = links.find(l => 
        (l.source.id === source || l.source === source) && 
        (l.target.id === target || l.target === target)
    );
    if (exists) {
        logMessage("Edge already exists", 'error');
        return;
    }
    
    // OS Rule 2: A process cannot request a resource it already holds
    const reverseExists = links.find(l => 
        (l.source.id === target || l.source === target) && 
        (l.target.id === source || l.target === source)
    );
    if (reverseExists) {
        logMessage(`Invalid: ${source} and ${target} are already connected in reverse`, 'error');
        return;
    }
    
    // OS Rule 3: Single instance resource can only be assigned to ONE process at a time
    if (sourceNode.type === 'resource') {
        const alreadyAssigned = links.find(l => 
            (l.source.id === source || l.source === source)
        );
        if (alreadyAssigned) {
            logMessage(`Invalid: Resource ${source} is already assigned to another process`, 'error');
            return;
        }
    }

    links.push({ source, target });
    updateGraph();
    
    let action = sourceNode.type === 'process' ? 'requests' : 'is assigned to';
    logMessage(`Edge added: ${source} ${action} ${target}`, 'info');
    
    document.getElementById('edge-source').value = '';
    document.getElementById('edge-target').value = '';
}

function clearGraph() {
    nodes = [];
    links = [];
    updateGraph();
    document.getElementById('rag-log-content').innerHTML = '';
    logMessage("Graph cleared", 'info');
}

async function checkDeadlock() {
    logMessage("Analyzing Wait-For Graph...", 'info');
    
    // Reset styles
    d3.selectAll('.node').classed('cycle', false);
    d3.selectAll('.link').classed('cycle', false).attr('marker-end', 'url(#arrow)');

    try {
        const response = await fetch('/api/detect_cycle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, links })
        });
        
        const result = await response.json();
        
        if (result.has_cycle) {
            logMessage(`DEADLOCK DETECTED! Cycle: ${result.cycle_path.join(' -> ')}`, 'error');
            highlightCycle(result.cycle_path);
        } else {
            logMessage("System is safe. No cycles found.", 'success');
        }
    } catch (error) {
        logMessage("Error connecting to server", 'error');
    }
}

function highlightCycle(path) {
    // Highlight nodes
    d3.selectAll('.node-element').each(function(d) {
        if (path.includes(d.id)) {
            d3.select(this).select('.node').classed('cycle', true);
        }
    });
    
    // Highlight links
    d3.selectAll('.link').each(function(d) {
        const sid = d.source.id || d.source;
        const tid = d.target.id || d.target;
        
        // check if this link is part of the cycle path
        let isCycleLink = false;
        for (let i = 0; i < path.length - 1; i++) {
            if (path[i] === sid && path[i+1] === tid) {
                isCycleLink = true;
                break;
            }
        }
        
        if (isCycleLink) {
            d3.select(this)
              .classed('cycle', true)
              .attr('marker-end', 'url(#arrow-cycle)');
        }
    });
}

// --- Banker's Algorithm Logic ---

async function runBankers() {
    const inputStr = document.getElementById('bankers-input').value;
    const logContainer = document.getElementById('bankers-log-content');
    const resultContainer = document.getElementById('bankers-results');
    
    logContainer.innerHTML = '';
    resultContainer.innerHTML = 'Running...';
    
    let data;
    try {
        data = JSON.parse(inputStr);
    } catch (e) {
        logMessage("Invalid JSON format in Banker's input", 'error', 'bankers-log-content');
        resultContainer.innerHTML = '<span style="color:var(--danger)">Error: Invalid JSON</span>';
        return;
    }
    
    try {
        const response = await fetch('/api/bankers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        // Render step log
        result.step_log.forEach(log => {
            let type = 'info';
            if (log.includes('SAFE')) type = 'success';
            if (log.includes('UNSAFE') || log.includes('deadlock')) type = 'error';
            logMessage(log, type, 'bankers-log-content');
        });
        
        // Render Need matrix
        let html = `<h4>Calculated Need Matrix</h4>
            <table class="matrix-table">
                <tr><th>Process</th>`;
                
        for(let i=0; i<data.available.length; i++) html += `<th>R${i}</th>`;
        html += `</tr>`;
        
        result.need_matrix.forEach((row, idx) => {
            html += `<tr><td>${data.processes[idx]}</td>`;
            row.forEach(val => html += `<td>${val}</td>`);
            html += `</tr>`;
        });
        html += `</table>`;
        
        if (result.is_safe) {
            html += `<div style="padding: 1rem; background: rgba(0,255,102,0.1); border-left: 4px solid var(--success); margin-top: 1rem;">
                <strong>Safe Sequence found!</strong><br>
                ${result.safe_sequence.join(' &rarr; ')}
            </div>`;
        } else {
            html += `<div style="padding: 1rem; background: rgba(255,0,60,0.1); border-left: 4px solid var(--danger); margin-top: 1rem;">
                <strong>UNSAFE STATE</strong><br>
                System may deadlock.
            </div>`;
        }
        
        resultContainer.innerHTML = html;
        
    } catch (error) {
        logMessage("Error connecting to server", 'error', 'bankers-log-content');
        resultContainer.innerHTML = '<span style="color:var(--danger)">Server Error</span>';
    }
}
