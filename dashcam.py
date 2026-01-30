"""
Real-time Drowsiness Detection using MediaPipe v0.10.32+ (NEW API)
Requirements: opencv-python, tensorflow, mediapipe, numpy, scikit-learn
"""

import cv2
import numpy as np
import tensorflow as tf
import pickle
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

print("="*60)
print("DROWSINESS DETECTION - MEDIAPIPE v0.10.32")
print("="*60 + "\n")

# ============================================
# Load Model and Scaler
# ============================================

print("Loading drowsiness detection model...")

try:
    interpreter = tf.lite.Interpreter(model_path='drowsiness_model.tflite')
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("✓ TFLite model loaded")
except Exception as e:
    print(f"✗ Error loading model: {e}")
    print("Make sure 'drowsiness_model.tflite' is in the same folder!")
    exit()

try:
    with open('scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)
    print("✓ Scaler loaded")
except Exception as e:
    print(f"✗ Error loading scaler: {e}")
    print("Make sure 'scaler.pkl' is in the same folder!")
    exit()

# ============================================
# Download Face Landmarker Model
# ============================================

import os
import urllib.request

MODEL_PATH = 'face_landmarker.task'

if not os.path.exists(MODEL_PATH):
    print(f"\nDownloading MediaPipe Face Landmarker model (~30 MB)...")
    model_url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    
    try:
        print("Downloading from Google Cloud Storage...")
        urllib.request.urlretrieve(model_url, MODEL_PATH)
        print(f"✓ Model downloaded: {MODEL_PATH}")
    except Exception as e:
        print(f"✗ Download failed: {e}")
        print("\nManual download:")
        print(f"Download: {model_url}")
        print(f"Save as: {MODEL_PATH}")
        exit()

print("✓ Face Landmarker model ready\n")

# ============================================
# MediaPipe Face Mesh Landmark Indices
# ============================================

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
MOUTH = [61, 291, 0, 17, 84, 314, 405, 321, 375, 291]

# ============================================
# Feature Calculation Functions
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

# ============================================
# Create Face Landmarker Task (NEW API)
# ============================================

print("Initializing MediaPipe Face Landmarker (v0.10.32 API)...")

BaseOptions = python.BaseOptions
FaceLandmarker = vision.FaceLandmarker
FaceLandmarkerOptions = vision.FaceLandmarkerOptions
VisionRunningMode = vision.RunningMode

# IMAGE mode for synchronous detection
options_image = FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.IMAGE,
    num_faces=1,
    min_face_detection_confidence=0.5,
    min_face_presence_confidence=0.5,
    min_tracking_confidence=0.5
)

print("✓ MediaPipe Face Landmarker initialized\n")

# ============================================
# Open Webcam
# ============================================

print("Opening webcam...")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("✗ Cannot open webcam!")
    print("Trying different camera indices...")
    for i in range(1, 5):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            print(f"✓ Found camera at index {i}")
            break
    
    if not cap.isOpened():
        print("✗ No webcam found!")
        exit()

cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cap.set(cv2.CAP_PROP_FPS, 30)

print("✓ Webcam opened")

# Create window BEFORE the loop
WINDOW_NAME = 'Drowsiness Detection - MediaPipe'
cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)
cv2.resizeWindow(WINDOW_NAME, 640, 480)

print("\n" + "="*60)
print("SYSTEM READY - LOOK FOR THE WINDOW!")
print("="*60)
print("Instructions:")
print("  • Look at the camera")
print("  • Close eyes for 1-2 seconds to test drowsy detection")
print("  • Yawn to test drowsy detection")
print("  • Press 'q' to quit")
print("  • Press 's' to save screenshot")
print("="*60 + "\n")

print("🎥 WEBCAM WINDOW SHOULD BE VISIBLE NOW!")
print("If you don't see it, check your taskbar or minimize other windows\n")

# ============================================
# Main Detection Loop
# ============================================

drowsy_frames = 0
DROWSY_THRESHOLD = 15

fps_start_time = time.time()
fps_frame_count = 0
fps = 0

total_frames = 0
drowsy_detections = 0
alert_detections = 0

with FaceLandmarker.create_from_options(options_image) as landmarker:
    
    frame_counter = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame - retrying...")
            time.sleep(0.1)
            continue
        
        total_frames += 1
        frame_counter += 1
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]
        
        # Convert to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Detect face landmarks
        try:
            detection_result = landmarker.detect(mp_image)
        except Exception as e:
            print(f"Detection error: {e}")
            continue
        
        # Calculate FPS
        fps_frame_count += 1
        if fps_frame_count >= 30:
            fps_end_time = time.time()
            fps = fps_frame_count / (fps_end_time - fps_start_time)
            fps_start_time = time.time()
            fps_frame_count = 0
        
        # Default status
        status_text = "👤 No face detected"
        status_color = (0, 0, 255)
        bg_color = (50, 50, 50)
        
        # Check if faces detected
        if detection_result.face_landmarks:
            face_landmarks = detection_result.face_landmarks[0]
            
            # Extract eye coordinates
            left_eye_coords = []
            for idx in LEFT_EYE:
                landmark = face_landmarks[idx]
                left_eye_coords.append([landmark.x * w, landmark.y * h])
            left_eye = np.array(left_eye_coords)
            
            right_eye_coords = []
            for idx in RIGHT_EYE:
                landmark = face_landmarks[idx]
                right_eye_coords.append([landmark.x * w, landmark.y * h])
            right_eye = np.array(right_eye_coords)
            
            mouth_coords = []
            for idx in MOUTH:
                landmark = face_landmarks[idx]
                mouth_coords.append([landmark.x * w, landmark.y * h])
            mouth = np.array(mouth_coords)
            
            # Calculate features
            left_ear = calculate_ear(left_eye)
            right_ear = calculate_ear(right_eye)
            avg_ear = (left_ear + right_ear) / 2.0
            mar = calculate_mar(mouth)
            ear_diff = abs(left_ear - right_ear)
            
            # Prepare features for model
            features = np.array([[avg_ear, left_ear, right_ear, ear_diff, mar]], dtype=np.float32)
            features_scaled = scaler.transform(features).astype(np.float32)
            
            # Run inference
            interpreter.set_tensor(input_details[0]['index'], features_scaled)
            interpreter.invoke()
            prediction = interpreter.get_tensor(output_details[0]['index'])[0][0]
            
            is_drowsy = prediction > 0.65
            
            # Update statistics
            if is_drowsy:
                drowsy_detections += 1
                drowsy_frames += 1
            else:
                alert_detections += 1
                drowsy_frames = 0
            
            # Determine status
            if drowsy_frames >= DROWSY_THRESHOLD:
                status_text = "⚠️ DROWSINESS ALERT!"
                status_color = (0, 0, 255)
                bg_color = (0, 0, 150)
            elif is_drowsy:
                status_text = "😴 Drowsy Detected"
                status_color = (0, 165, 255)
                bg_color = (0, 50, 100)
            else:
                status_text = "✓ Alert & Awake"
                status_color = (0, 255, 0)
                bg_color = (0, 80, 0)
            
            # Draw landmarks - EYES (green)
            for point in left_eye:
                cv2.circle(frame, (int(point[0]), int(point[1])), 3, (0, 255, 0), -1)
            cv2.polylines(frame, [left_eye.astype(int)], True, (0, 255, 0), 2)
            
            for point in right_eye:
                cv2.circle(frame, (int(point[0]), int(point[1])), 3, (0, 255, 0), -1)
            cv2.polylines(frame, [right_eye.astype(int)], True, (0, 255, 0), 2)
            
            # Draw landmarks - MOUTH (blue)
            for point in mouth[::2]:
                cv2.circle(frame, (int(point[0]), int(point[1])), 3, (255, 0, 0), -1)
            cv2.polylines(frame, [mouth.astype(int)], True, (255, 0, 0), 2)
            
            # Draw metrics panel (bottom left)
            panel_x = 10
            panel_y = h - 180
            panel_width = 400
            panel_height = 170
            
            # Semi-transparent background
            overlay = frame.copy()
            cv2.rectangle(overlay, (panel_x, panel_y), (panel_x + panel_width, panel_y + panel_height), 
                         (0, 0, 0), -1)
            cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
            
            cv2.rectangle(frame, (panel_x, panel_y), (panel_x + panel_width, panel_y + panel_height), 
                         (255, 255, 255), 2)
            
            y_offset = panel_y + 25
            cv2.putText(frame, "📊 METRICS", (panel_x + 10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
            
            y_offset += 30
            cv2.putText(frame, f"EAR: {avg_ear:.3f} (L:{left_ear:.2f} R:{right_ear:.2f})", 
                       (panel_x + 10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            y_offset += 30
            cv2.putText(frame, f"MAR: {mar:.3f}", 
                       (panel_x + 10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            y_offset += 30
            cv2.putText(frame, f"Confidence: {prediction:.3f} ({prediction*100:.1f}%)", 
                       (panel_x + 10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            y_offset += 30
            cv2.putText(frame, f"Drowsy frames: {drowsy_frames}/{DROWSY_THRESHOLD}", 
                       (panel_x + 10, y_offset), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 165, 0), 1)
            
            y_offset += 30
            eye_status = "CLOSED" if avg_ear < 0.22 else "OPEN"
            eye_color = (0, 0, 255) if avg_ear < 0.22 else (0, 255, 0)
            cv2.putText(frame, f"Eyes: {eye_status}", (panel_x + 10, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, eye_color, 2)
            
            # Console feedback
            if frame_counter % 10 == 0:  # Print every 10 frames
                print(f"✓ Frame {total_frames:05d} | EAR: {avg_ear:.3f} | MAR: {mar:.3f} | {status_text}      ", end='\r')
        
        # Draw status bar at top
        cv2.rectangle(frame, (0, 0), (w, 100), bg_color, -1)
        cv2.putText(frame, status_text, (20, 60), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.3, status_color, 3)
        
        # Draw FPS (top right)
        cv2.putText(frame, f"FPS: {fps:.1f}", (w - 150, 35), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, f"MediaPipe", (w - 150, 65), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Draw instructions (bottom)
        cv2.putText(frame, "Press 'q' to quit | 's' to screenshot", (w - 350, h - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        # Show frame counter for debugging
        cv2.putText(frame, f"#{frame_counter}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)
        
        # DISPLAY THE FRAME - THIS IS THE KEY LINE!
        cv2.imshow(WINDOW_NAME, frame)
        
        # Bring window to front every 100 frames
        if frame_counter % 100 == 1:
            cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_TOPMOST, 1)
            cv2.setWindowProperty(WINDOW_NAME, cv2.WND_PROP_TOPMOST, 0)
        
        # Handle key presses
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            print("\n\nQuitting...")
            break
        elif key == ord('s'):
            filename = f"drowsy_screenshot_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame)
            print(f"\n✓ Screenshot saved: {filename}                              ")

# ============================================
# Cleanup
# ============================================

cap.release()
cv2.destroyAllWindows()

print("\n\n" + "="*60)
print("SESSION STATISTICS")
print("="*60)
print(f"Total frames processed: {total_frames}")
print(f"Alert detections:       {alert_detections} ({alert_detections/max(1,total_frames)*100:.1f}%)")
print(f"Drowsy detections:      {drowsy_detections} ({drowsy_detections/max(1,total_frames)*100:.1f}%)")
print(f"Average FPS:            {fps:.1f}")
print("="*60)
print("✓ Session complete!")
print("="*60)
