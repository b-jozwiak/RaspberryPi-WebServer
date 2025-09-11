from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import math

app = Flask(__name__, static_folder="../react-frontend/dist", static_url_path="/")
socketio = SocketIO(app, cors_allowed_origins="*")

buffer = []

@app.route("/submit", methods=["POST"])
def submit():
    global buffer
    data = request.json
    dataToAppend = {
        "time": datetime.now(),
        "temperature": int(data["temperature"]),
        "humidity": int(data["humidity"])
    }

    print(dataToAppend)
    buffer.append(dataToAppend)
    return jsonify({"status": "ok"})


def flush_buffer():
    global buffer
    if not buffer:
        return
    avg_temp = round(sum(d["temperature"] for d in buffer) / len(buffer), 1)
    avg_hum  = round(sum(d["humidity"] for d in buffer) / len(buffer), 1)
    now = datetime.now()
    floored_second = 0 if now.second < 30 else 30
    timestamp = now.replace(second=floored_second, microsecond=0)
    timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
    timestamp_ms = int(timestamp.timestamp() * 1000)

    with open("data.csv", "a") as f:
        f.write(f"{timestamp_str},{avg_temp:.2f},{avg_hum:.2f}\n")

    socketio.emit("update", {
        "time": timestamp_ms,  
        "label": timestamp_str,
        "temperature": avg_temp,
        "humidity": avg_hum
    })
    buffer.clear()


@app.route("/history")
def history():
    data = []
    try:
        with open("data.csv", "r") as f:
            for line in f:
                t, temp, hum = line.strip().split(",")
                data.append({"time": t, "temperature": float(temp), "humidity": float(hum)})
    except FileNotFoundError:
        pass
    return jsonify(data)


@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.errorhandler(404)
def not_found(_):
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=flush_buffer, trigger="cron", second="0,30")
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())
