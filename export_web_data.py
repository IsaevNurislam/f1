"""
Export F1 race telemetry data to JSON format for web visualization.
"""
import json
import sys
from src.f1_data import get_race_telemetry, get_driver_colors, load_race_session, enable_cache
import numpy as np

def export_to_json(year=2025, round_number=12, output_file="docs/data/race_data.json"):
    """Export race telemetry to JSON format."""
    
    # Load session
    session = load_race_session(year, round_number)
    print(f"Loaded session: {session.event['EventName']} - {session.event['RoundNumber']}")
    
    # Enable cache
    enable_cache()
    
    # Get telemetry
    race_telemetry = get_race_telemetry(session)
    
    # Get track layout from fastest lap
    example_lap = session.laps.pick_fastest()
    if example_lap is not None:
        track_data = example_lap.get_telemetry()
        track_points = []
        for _, point in track_data.iterrows():
            track_points.append({
                "x": float(point['X']),
                "y": float(point['Y'])
            })
    else:
        track_points = []
    
    # Get driver info - use abbreviation as key to match frame data
    drivers = session.drivers
    driver_info = {}
    
    # Get driver colors using fastf1's color mapping
    import fastf1.plotting
    color_map = fastf1.plotting.get_driver_color_mapping(session)
    
    for driver_num in drivers:
        driver = session.get_driver(driver_num)
        driver_code = driver['Abbreviation']
        
        # Get color from the color map (uses abbreviation as key)
        color_hex = color_map.get(driver_code, '#FFFFFF')
        
        driver_info[driver_code] = {
            "abbreviation": driver_code,
            "team": driver['TeamName'],
            "full_name": driver['FullName'],
            "number": driver_num,
            "color": color_hex
        }
    
    # Process frames - limit to reduce file size
    frames_data = []
    frame_count = len(race_telemetry['frames'])
    
    # Sample every Nth frame to reduce size (keep 1 frame every 2 seconds for smoother loading)
    sample_rate = 50
    
    for i, frame in enumerate(race_telemetry['frames']):
        if i % sample_rate != 0 and i != frame_count - 1:
            continue
            
        frame_data = {
            "time": float(frame['t']),
            "lap": int(frame['lap']),
            "positions": {}
        }
        
        for driver_code, pos in frame['drivers'].items():
            frame_data['positions'][driver_code] = {
                "x": float(pos['x']) if not np.isnan(pos['x']) else None,
                "y": float(pos['y']) if not np.isnan(pos['y']) else None,
                "position": int(pos['position']) if 'position' in pos else 0,
                "lap": int(pos['lap']),
                "tyre": int(pos['tyre']),
                "speed": float(pos['speed']),
                "gear": int(pos['gear']),
                "drs": int(pos['drs'])
            }
        
        frames_data.append(frame_data)
    
    # Create export data
    export_data = {
        "event": {
            "name": session.event['EventName'],
            "round": int(session.event['RoundNumber']),
            "year": year,
            "country": session.event['Country'],
            "location": session.event['Location']
        },
        "track": track_points,
        "drivers": driver_info,
        "frames": frames_data,
        "metadata": {
            "total_frames": len(frames_data),
            "sample_rate": sample_rate,
            "original_frames": frame_count
        }
    }
    
    # Write to file
    with open(output_file, 'w') as f:
        json.dump(export_data, f, separators=(',', ':'))
    
    print(f"✅ Exported {len(frames_data)} frames to {output_file}")
    print(f"   File size: {len(json.dumps(export_data)) / 1024:.2f} KB")
    print(f"   Drivers: {len(driver_info)}")
    print(f"   Track points: {len(track_points)}")

if __name__ == "__main__":
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    round_number = int(sys.argv[2]) if len(sys.argv) > 2 else 12
    
    export_to_json(year, round_number)
