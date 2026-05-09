const panels = document.querySelectorAll(".site-panel");
const navLinks = document.querySelectorAll(".nav-links a[href^='#']");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function scrollPageTop(behavior) {
  const scroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior });
  };

  scroll();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scroll();
    });
  });

  window.setTimeout(scroll, 50);
  window.setTimeout(scroll, 150);
}

function showPanel(panelId, updateHash = true, scrollToTop = true) {
  const targetPanel = document.getElementById(panelId);

  if (!targetPanel) {
    return;
  }

  panels.forEach((panel) => {
    panel.classList.toggle("active", panel === targetPanel);
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${panelId}`);
  });

  if (updateHash) {
    history.pushState(null, "", `#${panelId}`);
  }

  if (scrollToTop) {
    scrollPageTop(updateHash ? "smooth" : "auto");
  }
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPanel(link.getAttribute("href").slice(1));
  });
});

window.addEventListener("popstate", () => {
  showPanel(window.location.hash.slice(1) || "about", false);
});

showPanel(window.location.hash.slice(1) || "about", false);

window.addEventListener("load", () => {
  showPanel(window.location.hash.slice(1) || "about", false);
});

const cards = document.querySelectorAll(".project-card");

cards.forEach((card) => {
  card.addEventListener("mouseenter", () => {
    card.style.transform = "scale(1.05)";
  });

  card.addEventListener("mouseleave", () => {
    card.style.transform = "scale(1)";
  });
});

const canvas = document.getElementById("globe-bg");
const ctx = canvas.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let deviceScale = 1;
let frameId = null;

const latitudes = [-60, -35, -15, 0, 15, 35, 60];
const longitudes = Array.from({ length: 14 }, (_, index) => index * (Math.PI / 7));
const stars = Array.from({ length: 110 }, (_, index) => ({
  x: (Math.sin(index * 21.77) + 1) / 2,
  y: (Math.cos(index * 13.13) + 1) / 2,
  r: 0.45 + ((index * 37) % 100) / 120,
  twinkle: index * 0.37,
}));

function resizeGlobe() {
  deviceScale = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * deviceScale);
  canvas.height = Math.floor(height * deviceScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
}

function projectPoint(radius, latitude, longitude, rotation, centerX, centerY) {
  const lat = latitude * (Math.PI / 180);
  const lon = longitude + rotation;
  const x = radius * Math.cos(lat) * Math.sin(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(lon);
  const depth = (z + radius) / (radius * 2);
  const scale = 0.82 + depth * 0.28;

  return {
    x: centerX + x * scale,
    y: centerY + y * scale,
    visible: z > -radius * 0.72,
    alpha: 0.1 + depth * 0.55,
  };
}

function drawCurve(points, color, widthValue) {
  ctx.beginPath();

  points.forEach((point, index) => {
    if (!point.visible) {
      return;
    }

    if (index === 0 || !points[index - 1].visible) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = widthValue;
  ctx.stroke();
}

function drawGlobe(time) {
  ctx.clearRect(0, 0, width, height);

  const radius = Math.min(width, height) * (width < 760 ? 0.34 : 0.42);
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const rotation = time * 0.00016;

  ctx.fillStyle = "#06111f";
  ctx.fillRect(0, 0, width, height);

  stars.forEach((star) => {
    const alpha = 0.18 + Math.sin(time * 0.001 + star.twinkle) * 0.08;
    ctx.beginPath();
    ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
    ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.globalAlpha = 0.45;

  const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.6);
  glow.addColorStop(0, "rgba(34, 211, 238, 0.36)");
  glow.addColorStop(0.45, "rgba(37, 99, 235, 0.2)");
  glow.addColorStop(1, "rgba(6, 17, 31, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(165, 243, 252, 0.82)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  latitudes.forEach((latitude) => {
    const points = Array.from({ length: 180 }, (_, index) =>
      projectPoint(radius, latitude, index * (Math.PI / 89), rotation, centerX, centerY)
    );
    drawCurve(points, "rgba(125, 211, 252, 0.5)", 1.05);
  });

  longitudes.forEach((longitude) => {
    const points = Array.from({ length: 121 }, (_, index) =>
      projectPoint(radius, -90 + index * 1.5, longitude, rotation, centerX, centerY)
    );
    drawCurve(points, "rgba(96, 165, 250, 0.52)", 1);
  });

  for (let index = 0; index < 44; index += 1) {
    const latitude = -58 + ((index * 29) % 116);
    const longitude = index * 0.83;
    const point = projectPoint(radius, latitude, longitude, rotation * 1.8, centerX, centerY);

    if (point.visible) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(253, 224, 71, ${Math.min(point.alpha + 0.2, 0.9)})`;
      ctx.arc(point.x, point.y, 1.7 + point.alpha * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radius * 1.28, radius * 0.28, -0.18, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(250, 204, 21, 0.42)";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.restore();
}

function animateGlobe(time) {
  drawGlobe(time);

  if (!reducedMotion.matches) {
    frameId = window.requestAnimationFrame(animateGlobe);
  }
}

function startGlobe() {
  if (frameId) {
    window.cancelAnimationFrame(frameId);
  }

  frameId = window.requestAnimationFrame(animateGlobe);
}

window.addEventListener("resize", () => {
  resizeGlobe();
  drawGlobe(performance.now());
});

reducedMotion.addEventListener("change", startGlobe);

resizeGlobe();
startGlobe();
