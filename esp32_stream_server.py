"""
ESP32-CAM Video Streaming Server with Drowsiness Detection
Flask server that fetches frames from ESP32-CAM, processes them with MediaPipe,
and streams annotated video with detection overlays to React frontend.
"""

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np
import tensorflow as tf
import pickle
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os
from threading import Lock
from collections import deque

# ============================================
# Configuration
# ============================================

ESP32_CAM_URL = "http://192.168.4.1/capture"
MODEL_PATH = 'face_landmarker.task'
TFLITE_MODEL_PATH = 'drowsiness_model.tflite'
SCALER_PATH = 'scaler.pkl'

# Flask app setup
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# ============================================
# Global State
# ============================================

class DetectionState:
    def __init__(self):
        self.is_connected = False
        self.source = None
        self.detector_ready = False
        self.detection_active = False
        self.lock = Lock()
        
        # Detection statistics
        self.stats = {
            'total_frames': 0,
            'drowsy_frames': 0,
            'alert_frames': 0,
            'blinks_30s': 0,
            'yawns_60s': 0,
            'consecutive_drowsy': 0
        }
        
        # Latest detection data
        self.latest = {
            'ear': 0.0,
            'mar': 0.0,
            'left_ear': 0.0,
            'right_ear': 0.0,
            'prediction': 0.0,
            'status': 'No face detected',
            'alert_type': None,
            'timestamp': None
        }
        
        # Time-windowed counters
        self.blink_times = deque(maxlen=100)
        self.yawn_times = deque(maxlen=100)
        
        # Previous states for event detection
        self.prev_ear = 0.3
        self.eyes_closed = False

state = DetectionState()

# ============================================
# Load Models
# ============================================

print("=" * 60)
print("ESP32-CAM DROWSINESS DETECTION SERVER")
print("=" * 60)

# Load TFLite model
try:
    interpreter = tf.lite.Interpreter(model_path=TFLITE_MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("✓ TFLite model loaded")
except Exception as e:
    print(f"✗ Error loading TFLite model: {e}")
    interpreter = None

# Load scaler
try:
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
    print("✓ Scaler loaded")
except Exception as e:
    print(f"✗ Error loading scaler: {e}")
    scaler = None

# Download MediaPipe model if needed
if not os.path.exists(MODEL_PATH):
    print(f"\nDownloading MediaPipe Face Landmarker model...")
    model_url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    try:
        urllib.request.urlretrieve(model_url, MODEL_PATH)
        print(f"✓ Model downloaded: {MODEL_PATH}")
    except Exception as e:
        print(f"✗ Download failed: {e}")

# Initialize MediaPipe Face Landmarker
BaseOptions = python.BaseOptions
FaceLandmarker = vision.FaceLandmarker
FaceLandmarkerOptions = vision.FaceLandmarkerOptions
VisionRunningMode = vision.RunningMode

options_image = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5
)

print("✓ MediaPipe Face Landmarker initialized")

# MediaPipe landmark indices
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [61, 291, 0, 17, 84, 314, 405, 321, 375, 291]

# ============================================
# Detection Functions
# ============================================

def calculate_ear(eye_landmarks):
    """Calculate Eye Aspect Ratio"""
    A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
    B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
    C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
    ear = (A + B) / (2.0 * C + 1e-6)
    return ear

def calculate_mar(mouth_landmarks):
    """Calculate Mouth Aspect Ratio"""
    A = np.linalg.norm(mouth_landmarks[1] - mouth_landmarks[7])
    B = np.linalg.norm(mouth_landmarks[2] - mouth_landmarks[6])
    C = np.linalg.norm(mouth_landmarks[3] - mouth_landmarks[5])
    D = np.linalg.norm(mouth_landmarks[0] - mouth_landmarks[4])
    mar = (A + B + C) / (3.0 * D + 1e-6)
    return mar

def update_time_windows():
    """Update time-windowed counters (blinks in 30s, yawns in 60s)"""
    current_time = time.time()
    
    # Remove old blinks (older than 30 seconds)
    while state.blink_times and current_time - state.blink_times[0] > 30:
        state.blink_times.popleft()
    
    # Remove old yawns (older than 60 seconds)
    while state.yawn_times and current_time - state.yawn_times[0] > 60:
        state.yawn_times.popleft()
    
    state.stats['blinks_30s'] = len(state.blink_times)
    state.stats['yawns_60s'] = len(state.yawn_times)

# ============================================
# ESP32-CAM Frame Fetching
# ============================================

def get_esp32_frame():
    """Fetch a single frame from ESP32-CAM"""
    try:
        # Set timeout to 3 seconds
        req = urllib.request.Request(ESP32_CAM_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=3) as response:
            img_array = np.asarray(bytearray(response.read()), dtype=np.uint8)
            frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            return frame
    except Exception as e:
        print(f"Error fetching ESP32-CAM frame: {e}")
        return None

# ============================================
# Frame Processing with Detection
# ============================================

def process_frame(frame):
    """Process frame with drowsiness detection and add overlays"""
    if frame is None:
        return None
    
    h, w = frame.shape[:2]
    
    # Convert to RGB for MediaPipe
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    # Default status
    status_text = "👤 No face detected"
    status_color = (0, 0, 255)
    bg_color = (50, 50, 50)
    
    with state.lock:
        state.stats['total_frames'] += 1
        update_time_windows()
    
    try:
        # Detect face landmarks
        with FaceLandmarker.create_from_options(options_image) as landmarker:
            detection_result = landmarker.detect(mp_image)
        
        if detection_result.face_landmarks and interpreter and scaler:
            face_landmarks = detection_result.face_landmarks[0]
            
            # Extract eye coordinates
            left_eye_coords = [[face_landmarks[idx].x * w, face_landmarks[idx].y * h] for idx in LEFT_EYE]
            right_eye_coords = [[face_landmarks[idx].x * w, face_landmarks[idx].y * h] for idx in RIGHT_EYE]
            mouth_coords = [[face_landmarks[idx].x * w, face_landmarks[idx].y * h] for idx in MOUTH]
            
            left_eye = np.array(left_eye_coords)
            right_eye = np.array(right_eye_coords)
            mouth = np.array(mouth_coords)
            
            # Calculate features
            left_ear = calculate_ear(left_eye)
            right_ear = calculate_ear(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0
            mar = calculate_mar(mouth)
            ear_diff = abs(left_ear - right_ear)
            
            # Detect blinks (EAR drops below threshold then rises)
            if avg_ear < 0.22 and not state.eyes_closed:
                state.eyes_closed = True
            elif avg_ear >= 0.22 and state.eyes_closed:
                state.eyes_closed = False
                state.blink_times.append(time.time())
            
            # Detect yawns (MAR above threshold)
            if mar > 0.6:
                if not state.yawn_times or time.time() - state.yawn_times[-1] > 2:
                    state.yawn_times.append(time.time())
            
            # Prepare features for model
            features = np.array([[avg_ear, left_ear, right_ear, ear_diff, mar]], dtype=np.float32)
            features_scaled = scaler.transform(features).astype(np.float32)
            
            # Run inference
            interpreter.set_tensor(input_details[0]['index'], features_scaled)
            interpreter.invoke()
            prediction = interpreter.get_tensor(output_details[0]['index'])[0][0]
            
            is_drowsy = prediction > 0.65
            
            # Update statistics
            with state.lock:
                if is_drowsy:
                    state.stats['drowsy_frames'] += 1
                    state.stats['consecutive_drowsy'] += 1
                else:
                    state.stats['alert_frames'] += 1
                    state.stats['consecutive_drowsy'] = 0
                
                # Determine alert type
                alert_type = None
                if state.stats['consecutive_drowsy'] >= 15:
                    status_text = "⚠️ DROWSINESS ALERT!"
                    status_color = (0, 0, 255)
                    bg_color = (0, 0, 150)
                    alert_type = "CRITICAL"
                elif avg_ear <= 0.25:
                    status_text = "🚨 ALERT: EAR"
                    status_color = (0, 165, 255)
                    bg_color = (0, 50, 100)
                    alert_type = "EAR"
                elif mar > 0.6:
                    status_text = "🚨 ALERT: YAWN"
                    status_color = (0, 165, 255)
                    bg_color = (0, 50, 100)
                    alert_type = "YAWN"
                elif state.stats['blinks_30s'] > 20:
                    status_text = "🚨 ALERT: BLINK"
                    status_color = (0, 165, 255)
                    bg_color = (0, 50, 100)
                    alert_type = "BLINK"
                elif is_drowsy:
                    status_text = "😴 Drowsy Detected"
                    status_color = (0, 165, 255)
                    bg_color = (0, 50, 100)
                    alert_type = "DROWSY"
                else:
                    status_text = "✓ ACTIVE"
                    status_color = (0, 255, 0)
                    bg_color = (0, 80, 0)
                
                # Update latest detection data
                state.latest = {
                    'ear': float(avg_ear),
                    'mar': float(mar),
                    'left_ear': float(left_ear),
                    'right_ear': float(right_ear),
                    'prediction': float(prediction),
                    'status': status_text,
                    'alert_type': alert_type,
                    'timestamp': time.time()
                }
            
            # Draw landmarks - EYES (green)
            for point in left_eye:
                cv2.circle(frame, (int(point[0]), int(point[1])), 2, (0, 255, 0), -1)
            cv2.polylines(frame, [left_eye.astype(int)], True, (0, 255, 0), 1)
            
            for point in right_eye:
                cv2.circle(frame, (int(point[0]), int(point[1])), 2, (0, 255, 0), -1)
            cv2.polylines(frame, [right_eye.astype(int)], True, (0, 255, 0), 1)
            
            # Draw landmarks - MOUTH (blue)
            for point in mouth[::2]:
                cv2.circle(frame, (int(point[0]), int(point[1])), 2, (255, 0, 0), -1)
            cv2.polylines(frame, [mouth.astype(int)], True, (255, 0, 0), 1)
            
            # Draw metrics overlay (semi-transparent)
            overlay = frame.copy()
            cv2.rectangle(overlay, (10, h - 120), (300, h - 10), (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            
            y_offset = h - 100
            ear_color = (0, 255, 0) if avg_ear > 0.25 else (0, 0, 255)
            cv2.putText(frame, f"EAR: {avg_ear:.3f}", (20, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, ear_color, 1)
            
            y_offset += 25
            mar_color = (0, 255, 0) if mar < 0.6 else (0, 0, 255)
            cv2.putText(frame, f"MAR: {mar:.3f}", (20, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, mar_color, 1)
            
            y_offset += 25
            cv2.putText(frame, f"Blinks: {state.stats['blinks_30s']} | Yawns: {state.stats['yawns_60s']}", 
                       (20, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
    
    except Exception as e:
        print(f"Detection error: {e}")
    
    # Draw status bar at top
    cv2.rectangle(frame, (0, 0), (w, 60), bg_color, -1)
    cv2.putText(frame, status_text, (20, 40), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
    
    # Draw source label (bottom left)
    cv2.putText(frame, "ESP32-CAM", (10, h - 10), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    # Draw XIAO status (bottom right) - placeholder for now
    cv2.putText(frame, "XIAO: OFF", (w - 100, h - 10), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    return frame

# ============================================
# Video Streaming Generator
# ============================================

def generate_frames():
    """Generate MJPEG stream from ESP32-CAM"""
    while state.is_connected:
        frame = get_esp32_frame()
        
        if frame is not None:
            # Process frame with detection
            processed_frame = process_frame(frame)
            
            if processed_frame is not None:
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
            # ESP32-CAM not responding, send error frame
            error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(error_frame, "ESP32-CAM Not Responding", (100, 240),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', error_frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

# ============================================
# API Endpoints
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'esp32_connected': state.is_connected,
        'detector_ready': interpreter is not None and scaler is not None,
        'timestamp': time.time()
    })

@app.route('/api/connect', methods=['POST'])
def connect_device():
    """Connect/disconnect ESP32-CAM"""
    data = request.get_json() or {}
    source = data.get('source', 'esp32cam')
    action = data.get('action', 'connect')
    
    if action == 'disconnect':
        with state.lock:
            state.is_connected = False
            state.source = None
            state.detection_active = False
        return jsonify({'success': True, 'action': 'disconnected'})
    
    # Test ESP32-CAM connection
    test_frame = get_esp32_frame()
    
    if test_frame is not None:
        with state.lock:
            state.is_connected = True
            state.source = source
            state.detection_active = True
            state.detector_ready = interpreter is not None and scaler is not None
        return jsonify({
            'success': True,
            'source': source,
            'message': 'ESP32-CAM connected successfully'
        })
    else:
        return jsonify({
            'success': False,
            'source': source,
            'error': 'Unable to connect to ESP32-CAM at 192.168.4.1'
        }), 500

@app.route('/api/feed', methods=['GET'])
def video_feed():
    """MJPEG video stream endpoint"""
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current detection status and statistics"""
    with state.lock:
        return jsonify({
            'source': state.source,
            'detection_active': state.detection_active,
            'detector_ready': state.detector_ready,
            'stats': state.stats.copy(),
            'latest': state.latest.copy()
        })

# ============================================
# Main
# ============================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("ESP32-CAM Server Starting...")
    print("=" * 60)
    print(f"Server will run on: http://localhost:5001")
    print(f"Video feed: http://localhost:5001/api/feed")
    print(f"Health check: http://localhost:5001/api/health")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
