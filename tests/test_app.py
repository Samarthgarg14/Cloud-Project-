import pytest
import json
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_route(client):
    """Test that the index route returns 200."""
    rv = client.get('/')
    assert rv.status_code == 200
    assert b"Deadlock Visualizer" in rv.data

def test_simulator_route(client):
    """Test that the simulator route returns 200."""
    rv = client.get('/simulator')
    assert rv.status_code == 200

def test_detect_cycle_no_deadlock(client):
    """Test cycle detection with no cycle."""
    payload = {
        "nodes": [{"id": "P1", "type": "process"}, {"id": "R1", "type": "resource"}],
        "links": [{"source": "P1", "target": "R1"}]
    }
    rv = client.post('/api/detect_cycle', 
                     data=json.dumps(payload), 
                     content_type='application/json')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert data["has_cycle"] == False

def test_detect_cycle_with_deadlock(client):
    """Test cycle detection with a simple cycle."""
    payload = {
        "nodes": [
            {"id": "P1", "type": "process"},
            {"id": "R1", "type": "resource"},
            {"id": "P2", "type": "process"},
            {"id": "R2", "type": "resource"}
        ],
        "links": [
            {"source": "P1", "target": "R1"},
            {"source": "R1", "target": "P2"},
            {"source": "P2", "target": "R2"},
            {"source": "R2", "target": "P1"}
        ]
    }
    rv = client.post('/api/detect_cycle', 
                     data=json.dumps(payload), 
                     content_type='application/json')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert data["has_cycle"] == True

def test_bankers_algorithm_safe(client):
    """Test Banker's Algorithm with a known safe state."""
    payload = {
      "processes": ["P0", "P1"],
      "available": [3, 3],
      "max": [[3, 2], [3, 2]],
      "allocation": [[0, 1], [2, 0]]
    }
    rv = client.post('/api/bankers', 
                     data=json.dumps(payload), 
                     content_type='application/json')
    assert rv.status_code == 200
    data = json.loads(rv.data)
    assert data["is_safe"] == True
