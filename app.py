from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/simulator')
def simulator():
    return render_template('simulator.html')

@app.route('/api/detect_cycle', methods=['POST'])
def detect_cycle():
    """
    Expects JSON:
    {
        "nodes": [{"id": "P1", "type": "process"}, {"id": "R1", "type": "resource"}],
        "links": [{"source": "P1", "target": "R1"}]
    }
    """
    data = request.json
    nodes = data.get('nodes', [])
    links = data.get('links', [])
    
    # Build adjacency list
    adj = {node['id']: [] for node in nodes}
    for link in links:
        # source and target can be objects or strings from d3
        source_id = link['source']['id'] if isinstance(link['source'], dict) else link['source']
        target_id = link['target']['id'] if isinstance(link['target'], dict) else link['target']
        if source_id in adj:
            adj[source_id].append(target_id)
            
    # DFS for cycle detection
    visited = {}
    rec_stack = {}
    cycle_path = []
    
    def dfs(node, path):
        visited[node] = True
        rec_stack[node] = True
        path.append(node)
        
        for neighbor in adj.get(node, []):
            if not visited.get(neighbor):
                if dfs(neighbor, path):
                    return True
            elif rec_stack.get(neighbor):
                cycle_start_idx = path.index(neighbor)
                cycle_path.extend(path[cycle_start_idx:])
                cycle_path.append(neighbor)
                return True
                
        rec_stack[node] = False
        path.pop()
        return False
        
    has_cycle = False
    for node in adj:
        if not visited.get(node):
            if dfs(node, []):
                has_cycle = True
                break
                
    return jsonify({
        "has_cycle": has_cycle,
        "cycle_path": cycle_path,
        "message": "Deadlock detected!" if has_cycle else "No deadlock detected."
    })

@app.route('/api/bankers', methods=['POST'])
def bankers():
    """
    Expects JSON:
    {
        "processes": ["P1", "P2", "P3"],
        "resources": ["R1", "R2", "R3"],
        "allocation": [[0,1,0], [2,0,0], [3,0,2]],
        "max": [[7,5,3], [3,2,2], [9,0,2]],
        "available": [3,3,2]
    }
    """
    data = request.json
    processes = data.get('processes', [])
    allocation = data.get('allocation', [])
    max_demand = data.get('max', [])
    available = data.get('available', [])
    
    num_p = len(processes)
    num_r = len(available) if available else 0
    
    # Calculate Need matrix
    need = []
    for i in range(num_p):
        need.append([max_demand[i][j] - allocation[i][j] for j in range(num_r)])
        
    finish = [False] * num_p
    safe_sequence = []
    work = available.copy()
    
    step_log = []
    
    count = 0
    while count < num_p:
        found = False
        for i in range(num_p):
            if not finish[i]:
                # Check if need <= work
                can_allocate = all(need[i][j] <= work[j] for j in range(num_r))
                if can_allocate:
                    step_log.append(f"Process {processes[i]} can execute (Need <= Available).")
                    for j in range(num_r):
                        work[j] += allocation[i][j]
                    finish[i] = True
                    safe_sequence.append(processes[i])
                    step_log.append(f"Process {processes[i]} finished. New Available: {work}")
                    found = True
                    count += 1
        
        if not found:
            break
            
    is_safe = count == num_p
    
    if is_safe:
        step_log.append(f"System is in a SAFE state. Sequence: {safe_sequence}")
    else:
        step_log.append("System is in an UNSAFE state. Potential deadlock.")
        
    return jsonify({
        "is_safe": is_safe,
        "safe_sequence": safe_sequence,
        "step_log": step_log,
        "need_matrix": need
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
