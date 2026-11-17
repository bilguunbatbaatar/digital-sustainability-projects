// ESP32 MQTT dashboard
// team1/msg  - ESP32 telemetry: {"temperature": 26, "humidity": 36, "led": 0}
// team1/led  - LED command: ON / OFF

const TELEMETRY_TOPIC = "team1/msg";
const CONTROL_TOPIC = "team1/led";
const MAX_POINTS = 60;   // 5 сек тутам = сүүлийн 5 минут
const MAX_LOG = 50;

const $ = (id) => document.getElementById(id);

let client = null;
let count = 0;
const stats = { temp: [], hum: [] };

// ---------- Chart ----------

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function makeChart(canvas, color, unit) {
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0
      }]
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: { label: (c) => c.parsed.y + " " + unit }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: cssVar("--muted"), maxTicksLimit: 6, maxRotation: 0 }
        },
        y: {
          grace: "10%",
          grid: { color: cssVar("--line") },
          ticks: { color: cssVar("--muted"), precision: 0 }
        }
      }
    }
  });
}

const tempChart = makeChart($("tempChart"), cssVar("--temp"), "°C");
const humChart = makeChart($("humChart"), cssVar("--hum"), "%");

function pushPoint(chart, label, value) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(value);
  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update();
}

// ---------- UI ----------

function setStatus(state, text) {
  $("status").className = "status " + state;
  $("status").querySelector("b").textContent = text;
  const online = state === "on";
  $("ledOn").disabled = !online;
  $("ledOff").disabled = !online;
}

function setLed(value) {
  const el = $("ledVal");
  el.textContent = value ? "ON" : "OFF";
  el.className = "led " + (value ? "on" : "off");
}

function updateMinMax(key, value, minId, maxId) {
  stats[key].push(value);
  $(minId).textContent = Math.min(...stats[key]);
  $(maxId).textContent = Math.max(...stats[key]);
}

function addLog(time, topic, payload) {
  const row = document.createElement("tr");
  [time, topic, payload].forEach((text) => {
    const td = document.createElement("td");
    td.textContent = text;
    row.appendChild(td);
  });
  $("log").prepend(row);
  while ($("log").children.length > MAX_LOG) {
    $("log").lastChild.remove();
  }
}

function timeNow() {
  return new Date().toLocaleTimeString("en-GB");
}

// ---------- MQTT ----------

function handleTelemetry(payload, time) {
  let data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    console.warn("JSON биш payload:", payload);
    return;
  }

  if (typeof data.temperature === "number") {
    $("tempVal").textContent = data.temperature;
    updateMinMax("temp", data.temperature, "tempMin", "tempMax");
    pushPoint(tempChart, time, data.temperature);
  }
  if (typeof data.humidity === "number") {
    $("humVal").textContent = data.humidity;
    updateMinMax("hum", data.humidity, "humMin", "humMax");
    pushPoint(humChart, time, data.humidity);
  }
  if (data.led !== undefined) {
    setLed(Number(data.led));
  }
}

function connect(host, port) {
  if (client) {
    client.end(true);
  }

  const url = "ws://" + host + ":" + port;
  setStatus("wait", "Холбогдож байна...");

  client = mqtt.connect(url, {
    clientId: "dashboard-team1-" + Math.random().toString(16).slice(2, 8),
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 5000
  });

  client.on("connect", () => {
    setStatus("on", "Холбогдсон · " + host);
    client.subscribe([TELEMETRY_TOPIC, CONTROL_TOPIC]);
  });

  client.on("reconnect", () => setStatus("wait", "Дахин холбогдож байна..."));
  client.on("offline", () => setStatus("off", "Салгагдсан"));
  client.on("error", (err) => console.error("MQTT error:", err.message));

  client.on("message", (topic, message) => {
    const payload = message.toString();
    const time = timeNow();

    count += 1;
    $("msgCount").textContent = count;
    $("lastTime").textContent = time;
    addLog(time, topic, payload);

    if (topic === TELEMETRY_TOPIC) {
      handleTelemetry(payload, time);
    }
  });
}

function publishLed(command) {
  if (client && client.connected) {
    client.publish(CONTROL_TOPIC, command);
  }
}

$("connForm").addEventListener("submit", (e) => {
  e.preventDefault();
  connect($("host").value.trim(), $("port").value.trim());
});

$("ledOn").addEventListener("click", () => publishLed("ON"));
$("ledOff").addEventListener("click", () => publishLed("OFF"));

// Хуудас нээгдэхэд шууд холбогдоно; ?host=10.3.203.123 гэж өөр broker заана
const params = new URLSearchParams(location.search);
if (params.get("host")) $("host").value = params.get("host");
if (params.get("port")) $("port").value = params.get("port");
connect($("host").value, $("port").value);
