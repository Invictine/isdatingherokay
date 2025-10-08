const storage = window.localStorage;
const utils = window.RelationshipUtils;

async function fetchJson(url, options = {}) {
  const token = storage.getItem('idToken');
  const headers = Object.assign({}, options.headers, token ? { Authorization: `Bearer ${token}` } : {});
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function renderProfile(profile) {
  const summary = document.getElementById('profileSummary');
  if (!profile || !profile.name || !profile.birthdate) {
    summary.textContent = 'Complete your profile on the landing page to begin.';
    return;
  }
  summary.innerHTML = `<strong>${profile.name}</strong> · born ${profile.birthdate}`;
}

function calculatePoints(data) {
  const points = [];
  data.forEach(entry => {
    const primary = {
      name: entry.userName || 'User',
      birthdate: entry.userBirthdate
    };
    const partner = Object.assign({}, entry.partner, { name: entry.partner.name || 'Partner' });
    const metrics = utils.computeRelationshipMetrics(primary, partner);
    if (!metrics) return;
    points.push({
      metrics,
      primary,
      partner
    });
  });
  return points;
}

function getScale(points) {
  if (!points.length) {
    return 40;
  }
  const maxAge = points.reduce((acc, point) => {
    return Math.max(acc, point.metrics.startOlderAge, point.metrics.startYoungerAge);
  }, 0);
  const padded = Math.ceil((maxAge + 2) / 5) * 5;
  return Math.max(20, padded);
}

function drawChart(points) {
  const canvas = document.getElementById('relationshipChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const padding = 60;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const scaleMax = getScale(points);

  function toCanvasX(age) {
    return padding + (age / scaleMax) * (width - padding * 1.5);
  }

  function toCanvasY(age) {
    return height - padding - (age / scaleMax) * (height - padding * 1.5);
  }

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, toCanvasY(0));
  ctx.lineTo(padding, toCanvasY(scaleMax));
  ctx.lineTo(toCanvasX(scaleMax), toCanvasY(scaleMax));
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Older age', (padding + toCanvasX(scaleMax)) / 2, height - padding / 2);
  ctx.save();
  ctx.translate(padding / 2, (toCanvasY(scaleMax) + toCanvasY(0)) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Younger age', 0, 0);
  ctx.restore();

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let olderAge = 0; olderAge <= scaleMax; olderAge += scaleMax / 100) {
    const youngerAge = Math.max(0, olderAge / 2 + 7);
    const x = toCanvasX(olderAge);
    const y = toCanvasY(youngerAge);
    if (olderAge === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  points.forEach(point => {
    const { metrics, primary, partner } = point;
    const ok = metrics.okAtStart;
    const x = toCanvasX(metrics.startOlderAge);
    const y = toCanvasY(metrics.startYoungerAge);
    ctx.beginPath();
    ctx.fillStyle = ok ? '#16a34a' : '#dc2626';
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${primary.name} & ${partner.name}`, x + 8, y - 8);
  });

  ctx.strokeStyle = '#9ca3af';
  ctx.fillStyle = '#111827';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const ticks = Math.max(4, Math.min(8, Math.round(scaleMax / 5)));
  for (let i = 0; i <= ticks; i++) {
    const age = (scaleMax / ticks) * i;
    const x = toCanvasX(age);
    ctx.beginPath();
    ctx.moveTo(x, height - padding);
    ctx.lineTo(x, height - padding + 6);
    ctx.stroke();
    ctx.fillText(age.toFixed(0), x, height - padding + 10);

    const y = toCanvasY(age);
    ctx.beginPath();
    ctx.moveTo(padding - 6, y);
    ctx.lineTo(padding, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(age.toFixed(0), padding - 10, y - 4);
    ctx.textAlign = 'center';
  }
}

function renderTable(points) {
  const tbody = document.querySelector('#relationshipTable tbody');
  tbody.innerHTML = '';
  points.forEach(point => {
    const { metrics, primary, partner } = point;
    const row = document.createElement('tr');
    const label = `${primary.name} + ${partner.name}`;
    const start = utils.formatDate(metrics.start);
    const end = metrics.end ? utils.formatDate(metrics.end) : 'Present';
    const becomesOk = utils.formatDate(metrics.becomesOkDate);
    let statusText = 'Not okay for the recorded start period';
    if (metrics.okDuring) {
      statusText = 'Okay for entire period';
    } else if (metrics.okAtStart) {
      statusText = 'Okay, will remain acceptable';
    } else if (metrics.end && metrics.end >= metrics.thresholdDate) {
      statusText = 'Became okay during the timeline';
    }
    row.innerHTML = `
      <td>${label}</td>
      <td>${start} → ${end}</td>
      <td>${statusText}</td>
      <td>${becomesOk}</td>
      <td>${partner.notes || ''}</td>
    `;
    if (metrics.okDuring) {
      row.classList.add('ok');
    }
    tbody.appendChild(row);
  });
}

async function refresh() {
  const relationships = await fetchJson('/api/relationships');
  const points = calculatePoints(relationships);
  drawChart(points);
  renderTable(points);
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = storage.getItem('idToken');
  if (!token) {
    window.location.href = '/';
    return;
  }

  document.getElementById('signOut').addEventListener('click', () => {
    storage.removeItem('idToken');
    window.location.href = '/';
  });

  try {
    const profile = await fetchJson('/api/me');
    renderProfile(profile);
  } catch (error) {
    console.error(error);
  }

  const form = document.getElementById('partnerForm');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const payload = {
      name: form.partnerName.value,
      birthdate: form.partnerBirthdate.value,
      startDate: form.relationshipStart.value,
      endDate: form.relationshipEnd.value,
      notes: form.relationshipNotes.value
    };
    try {
      await fetchJson('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  });

  await refresh();
});
