(() => {
  "use strict";

  const SAVE_KEY = "cookie-crumb-save-v1";
  const buildings = [
    { id: "cursor", name: "Cursor", icon: "👆", description: "A helpful little hand", baseCost: 15, cps: 0.1, unlock: 0 },
    { id: "grandma", name: "Grandma", icon: "👵", description: "Bakes the old-fashioned way", baseCost: 100, cps: 1, unlock: 0 },
    { id: "farm", name: "Cookie garden", icon: "🌱", description: "Grows the good stuff", baseCost: 1100, cps: 8, unlock: 10 },
    { id: "mine", name: "Cocoa mine", icon: "⛏️", description: "Digs up chocolate chips", baseCost: 12000, cps: 47, unlock: 30 },
    { id: "bakery", name: "Big bakery", icon: "🏠", description: "Room for one more oven", baseCost: 130000, cps: 260, unlock: 50 },
    { id: "bank", name: "Cookie bank", icon: "🏦", description: "Makes dough make dough", baseCost: 1400000, cps: 1400, unlock: 75 },
    { id: "temple", name: "Sugar temple", icon: "🏛️", description: "A little divine inspiration", baseCost: 20000000, cps: 7800, unlock: 100 },
    { id: "portal", name: "Dough portal", icon: "🌀", description: "Cookies from another crumb-iverse", baseCost: 330000000, cps: 44000, unlock: 125 }
  ];
  const upgrades = [
    { id: "rolling-pin", name: "Polished rolling pin", icon: "🥖", description: "Cookies per click ×2", cost: 50, kind: "click", factor: 2, unlock: s => s.cookiesBaked >= 25 },
    { id: "choc-chips", name: "Extra chocolate chips", icon: "🍫", description: "Cookies per click ×2", cost: 500, kind: "click", factor: 2, unlock: s => s.cookiesBaked >= 250 },
    { id: "cursor-gloves", name: "Comfy clicky gloves", icon: "🧤", description: "Cookies per click ×3", cost: 5000, kind: "click", factor: 3, unlock: s => s.cookiesBaked >= 2500 },
    { id: "grandma-recipe", name: "Grandma's secret recipe", icon: "📖", description: "Grandma production ×2", cost: 1000, kind: "building", target: "grandma", factor: 2, unlock: s => s.owned.grandma >= 5 },
    { id: "garden-fertilizer", name: "Maple sugar compost", icon: "🍁", description: "Garden production ×2", cost: 11000, kind: "building", target: "farm", factor: 2, unlock: s => s.owned.farm >= 5 },
    { id: "cocoa-cart", name: "Shiny new mine carts", icon: "🛒", description: "Mine production ×2", cost: 120000, kind: "building", target: "mine", factor: 2, unlock: s => s.owned.mine >= 5 },
    { id: "bakery-oven", name: "Double-decker ovens", icon: "♨️", description: "Bakery production ×2", cost: 1300000, kind: "building", target: "bakery", factor: 2, unlock: s => s.owned.bakery >= 5 },
    { id: "butter-secret", name: "Butter makes it better", icon: "🧈", description: "All production ×1.5", cost: 50000000, kind: "all", factor: 1.5, unlock: s => s.cookiesBaked >= 1000000 }
  ];
  const milestones = [
    { target: 12, name: "First dozen", copy: "Bake 12 cookies to earn your first little star." },
    { target: 100, name: "Cookie jar", copy: "Keep going until your jar hits 100 cookies." },
    { target: 1000, name: "A thousand smiles", copy: "Bake 1,000 cookies. That's a lot of dunking." },
    { target: 10000, name: "Neighborhood favorite", copy: "The whole block can smell those cookies." },
    { target: 100000, name: "Little cookie legend", copy: "A hundred thousand cookies. Grandma would cry." },
    { target: 1000000, name: "Million-cookie bakery", copy: "One million cookies, one very big cookie jar." },
    { target: 10000000, name: "Cookie constellation", copy: "So many cookies they need their own galaxy." }
  ];
  const badges = [
    { id: "first", icon: "✳", title: "First batch", test: s => s.cookiesBaked >= 1 },
    { id: "dozen", icon: "▦", title: "A dozen", test: s => s.cookiesBaked >= 12 },
    { id: "grandma", icon: "♡", title: "Meet Grandma", test: s => s.owned.grandma >= 1 },
    { id: "hundred", icon: "✦", title: "Cookie jar", test: s => s.cookiesBaked >= 100 },
    { id: "clicks", icon: "☝", title: "Busy baker", test: s => s.clicks >= 100 },
    { id: "buildings", icon: "⌂", title: "Shopkeeper", test: s => totalBuildings(s) >= 10 }
  ];
  const quotes = [
    "The secret ingredient is always one more cookie.",
    "A balanced diet is a cookie in each hand.",
    "There is no such thing as too many chocolate chips.",
    "The oven timer is just a suggestion.",
    "Bake someone happy today. Start with yourself."
  ];
  const initialState = () => ({
    cookies: 0, cookiesBaked: 0, clicks: 0, owned: Object.fromEntries(buildings.map(b => [b.id, 0])),
    boughtUpgrades: [], startedAt: Date.now(), sound: false, luckyUntil: 0, luckyMultiplier: 1,
    lastSaved: Date.now(), lastSeen: Date.now()
  });

  let state = loadState();
  let quantity = 1;
  let currentTab = "buildings";
  let toastTimer;
  let goldenTimer;
  let goldenHideTimer;
  let lastDisplay = 0;
  let lastRender = 0;
  let audioContext;

  const $ = id => document.getElementById(id);
  const cookieButton = $("cookie-button");
  const shopList = $("shop-list");

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved || typeof saved !== "object") return initialState();
      const fresh = initialState();
      return {
        ...fresh, ...saved,
        cookies: Math.max(0, Number(saved.cookies) || 0),
        cookiesBaked: Math.max(0, Number(saved.cookiesBaked) || 0),
        clicks: Math.max(0, Number(saved.clicks) || 0),
        owned: { ...fresh.owned, ...(saved.owned || {}) },
        boughtUpgrades: Array.isArray(saved.boughtUpgrades) ? saved.boughtUpgrades : [],
        luckyUntil: 0, luckyMultiplier: 1
      };
    } catch { return initialState(); }
  }

  function saveState() {
    state.lastSaved = Date.now();
    state.lastSeen = state.lastSaved;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      $("save-status").textContent = "SAVED LOCALLY";
    } catch { $("save-status").textContent = "SAVE UNAVAILABLE"; }
  }

  function totalBuildings(s = state) { return Object.values(s.owned).reduce((sum, amount) => sum + amount, 0); }
  function multiplierFor(id) {
    let value = 1;
    for (const upgrade of upgrades) {
      if (!state.boughtUpgrades.includes(upgrade.id)) continue;
      if (upgrade.kind === "building" && upgrade.target === id) value *= upgrade.factor;
      if (upgrade.kind === "all") value *= upgrade.factor;
    }
    return value;
  }
  function clickPower() {
    let value = 1;
    for (const upgrade of upgrades) if (upgrade.kind === "click" && state.boughtUpgrades.includes(upgrade.id)) value *= upgrade.factor;
    return value;
  }
  function baseCps() { return buildings.reduce((sum, b) => sum + state.owned[b.id] * b.cps * multiplierFor(b.id), 0); }
  function cps() { return baseCps() * (Date.now() < state.luckyUntil ? state.luckyMultiplier : 1); }
  function costAt(building, offset = 0) { return Math.ceil(building.baseCost * Math.pow(1.15, state.owned[building.id] + offset)); }
  function bundleCost(building, count) {
    const owned = state.owned[building.id];
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.ceil(building.baseCost * Math.pow(1.15, owned + i));
    return total;
  }
  function affordableBundle(building, limit = 100) {
    let count = 0;
    let total = 0;
    while (count < limit) {
      const nextCost = costAt(building, count);
      if (total + nextCost > state.cookies) break;
      total += nextCost;
      count++;
    }
    return count;
  }
  function fmt(value, decimals = 1) {
    if (!Number.isFinite(value)) return "∞";
    const absolute = Math.abs(value);
    if (absolute < 1000) return (absolute > 0 && absolute < 10 ? value.toFixed(decimals) : Math.floor(value).toLocaleString("en-US"));
    const suffixes = [[1e15, "Qa"], [1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
    const [base, suffix] = suffixes.find(([limit]) => absolute >= limit);
    const amount = value / base;
    return `${amount.toFixed(Math.abs(amount) < 10 ? 2 : 1).replace(/0+$/, "").replace(/\.$/, "")}${suffix}`;
  }
  function unlocked(building) { return state.cookiesBaked >= building.unlock; }
  function showToast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2300);
  }
  function playPop() {
    if (!state.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(580 + Math.random() * 180, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + .075);
      gain.gain.setValueAtTime(.06, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + .08);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(); oscillator.stop(audioContext.currentTime + .08);
    } catch { /* Audio is an optional flourish. */ }
  }
  function floatText(text, x, y, type = "normal") {
    const label = document.createElement("span");
    label.className = "float-text";
    label.textContent = text;
    label.style.left = `${x}px`; label.style.top = `${y}px`;
    if (type === "lucky") { label.style.color = "#9b7022"; label.style.fontSize = "21px"; }
    const scene = cookieButton.closest(".scene");
    scene.append(label);
    label.addEventListener("animationend", () => label.remove(), { once: true });
  }
  function clickCookie(event) {
    const amount = clickPower();
    state.cookies += amount;
    state.cookiesBaked += amount;
    state.clicks += 1;
    cookieButton.classList.remove("pop");
    void cookieButton.offsetWidth;
    cookieButton.classList.add("pop");
    const rect = cookieButton.closest(".scene").getBoundingClientRect();
    const x = event?.clientX ? event.clientX - rect.left : rect.width / 2;
    const y = event?.clientY ? event.clientY - rect.top : rect.height / 2;
    floatText(`+${fmt(amount)}`, x, y);
    playPop();
    render();
  }
  function buyBuilding(id) {
    const building = buildings.find(item => item.id === id);
    if (!building || !unlocked(building)) return;
    let count = quantity;
    let price = bundleCost(building, count);
    if (count === 100) {
      count = affordableBundle(building);
      price = bundleCost(building, Math.max(1, count));
    }
    if (state.cookies < price) { showToast(`You need ${fmt(price - state.cookies)} more cookies.`); return; }
    state.cookies -= price;
    state.owned[id] += count;
    showToast(`${building.name}${count > 1 ? ` ×${count}` : ""} joined your bakery!`);
    render();
  }
  function buyUpgrade(id) {
    const upgrade = upgrades.find(item => item.id === id);
    if (!upgrade || state.boughtUpgrades.includes(id) || !upgrade.unlock(state)) return;
    if (state.cookies < upgrade.cost) { showToast(`You need ${fmt(upgrade.cost - state.cookies)} more cookies.`); return; }
    state.cookies -= upgrade.cost;
    state.boughtUpgrades.push(id);
    showToast(`${upgrade.name} unlocked!`);
    render();
  }
  function renderBuildings() {
    shopList.innerHTML = "";
    const visible = buildings.filter(unlocked);
    visible.push(...buildings.filter(b => !unlocked(b)).slice(0, 2));
    for (const building of visible) {
      const isUnlocked = unlocked(building);
      const count = quantity === 100 ? Math.max(1, affordableBundle(building)) : quantity;
      const price = bundleCost(building, count);
      const affordable = state.cookies >= price;
      const row = document.createElement("div");
      row.className = `shop-item${affordable && isUnlocked ? " affordable" : ""}${isUnlocked ? "" : " locked"}`;
      const displayName = isUnlocked ? building.name : "???";
      row.innerHTML = `<span class="building-icon" aria-hidden="true">${isUnlocked ? building.icon : "🔒"}</span><div class="building-info"><strong>${displayName}</strong><span>${isUnlocked ? `${fmt(building.cps * multiplierFor(building.id))} cookies / sec` : `Bake ${fmt(building.unlock)} to unlock`}</span></div><button class="buy-building building-buy" type="button" aria-label="Buy ${displayName}" ${!isUnlocked || !affordable ? "disabled" : ""}><span class="building-price"><span class="price-cookie">●</span>${fmt(price)}</span><span class="building-count">${state.owned[building.id]}</span></button>`;
      row.querySelector("button").addEventListener("click", () => buyBuilding(building.id));
      shopList.append(row);
    }
  }
  function renderUpgrades() {
    shopList.innerHTML = "";
    const available = upgrades.filter(u => !state.boughtUpgrades.includes(u.id) && u.unlock(state));
    $("empty-upgrades").hidden = available.length > 0;
    $("upgrade-dot").hidden = available.length === 0;
    for (const upgrade of available) {
      const button = document.createElement("button");
      button.className = "upgrade-card";
      button.type = "button";
      button.disabled = state.cookies < upgrade.cost;
      button.innerHTML = `<span class="upgrade-icon" aria-hidden="true">${upgrade.icon}</span><span class="upgrade-info"><strong>${upgrade.name}</strong><span>${upgrade.description} · ● ${fmt(upgrade.cost)}</span></span>`;
      button.addEventListener("click", () => buyUpgrade(upgrade.id));
      shopList.append(button);
    }
  }
  function renderMilestone() {
    const next = milestones.find(m => state.cookiesBaked < m.target) || milestones[milestones.length - 1];
    const previous = milestones[milestones.indexOf(next) - 1]?.target || 0;
    const ratio = Math.max(0, Math.min(1, (state.cookiesBaked - previous) / (next.target - previous)));
    $("milestone-name").textContent = next.name;
    $("milestone-copy").textContent = next.copy;
    $("milestone-current").textContent = fmt(state.cookiesBaked);
    $("milestone-target").textContent = `${fmt(next.target)} cookies`;
    $("milestone-progress").style.width = `${ratio * 100}%`;
    $("milestone-percent").textContent = `${Math.floor(ratio * 100)}%`;
  }
  function renderBadges() {
    const container = $("badge-row");
    container.innerHTML = "";
    badges.forEach(badge => {
      const node = document.createElement("span");
      const earned = badge.test(state);
      node.className = `badge${earned ? " earned" : ""}`;
      node.textContent = badge.icon;
      node.title = earned ? badge.title : "A little win waiting to happen";
      node.setAttribute("aria-label", node.title);
      container.append(node);
    });
  }
  function render() {
    const now = Date.now();
    $("lifetime-count").textContent = fmt(state.cookiesBaked);
    $("cps-count").textContent = fmt(cps());
    $("click-count").textContent = fmt(clickPower());
    $("upgrade-dot").hidden = !upgrades.some(u => !state.boughtUpgrades.includes(u.id) && u.unlock(state));
    $("day-count").textContent = String(Math.max(1, Math.floor((now - state.startedAt) / 86400000) + 1)).padStart(2, "0");
    renderMilestone(); renderBadges();
    if (currentTab === "buildings") { $("empty-upgrades").hidden = true; renderBuildings(); }
    else renderUpgrades();
    if (now >= state.luckyUntil) { state.luckyMultiplier = 1; $("oven-status").textContent = state.cookiesBaked > 0 ? "Something sweet" : "Warming up"; }
    else { $("oven-status").textContent = `${state.luckyMultiplier}× cookie rush!`; }
  }
  function gameTick() {
    const now = Date.now();
    const elapsed = Math.min(.5, (now - lastDisplay) / 1000);
    lastDisplay = now;
    const earned = cps() * elapsed;
    state.cookies += earned;
    state.cookiesBaked += earned;
    if (now >= state.luckyUntil && state.luckyMultiplier !== 1) { state.luckyMultiplier = 1; }
    if (now - state.lastSaved > 10000) saveState();
    if (now - lastRender >= 500) { lastRender = now; render(); }
  }
  function scheduleGoldenCookie() {
    clearTimeout(goldenTimer);
    const delay = 25000 + Math.random() * 35000;
    goldenTimer = setTimeout(() => {
      $("golden-cookie").hidden = false;
      goldenHideTimer = setTimeout(() => { $("golden-cookie").hidden = true; scheduleGoldenCookie(); }, 10000);
    }, delay);
  }
  function collectGoldenCookie() {
    $("golden-cookie").hidden = true;
    clearTimeout(goldenHideTimer);
    const scene = cookieButton.closest(".scene").getBoundingClientRect();
    if (Math.random() < .7) {
      state.luckyMultiplier = 7;
      state.luckyUntil = Date.now() + 13000;
      showToast("Lucky! Cookie production ×7 for 13 seconds!");
      floatText("7× COOKIE RUSH!", scene.width / 2, scene.height / 2 - 50, "lucky");
    } else {
      const reward = Math.max(13, Math.min(state.cookiesBaked * .12, cps() * 900));
      state.cookies += reward;
      state.cookiesBaked += reward;
      showToast(`Lucky! A little cookie windfall: +${fmt(reward)}!`);
      floatText(`+${fmt(reward)} cookies!`, scene.width / 2, scene.height / 2 - 50, "lucky");
    }
    scheduleGoldenCookie(); render();
  }
  function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll(".shop-tab").forEach(button => {
      const active = button.dataset.tab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $("shop-list").setAttribute("aria-label", tab === "buildings" ? "Available buildings" : "Available upgrades");
    if (tab === "upgrades") renderUpgrades(); else { $("empty-upgrades").hidden = true; renderBuildings(); }
  }
  function resetGame() {
    if (!window.confirm("Start a new bakery from scratch? Your saved bakery will be cleared.")) return;
    state = initialState();
    saveState(); setTab("buildings"); render(); showToast("A fresh batch. Let's bake!");
  }
  function initialize() {
    $("bakery-quote").textContent = quotes[Math.floor(Math.random() * quotes.length)];
    document.querySelectorAll(".buy-option").forEach(button => button.addEventListener("click", () => {
      quantity = Number(button.dataset.quantity);
      document.querySelectorAll(".buy-option").forEach(option => option.classList.toggle("active", option === button));
      render();
    }));
    document.querySelectorAll(".shop-tab").forEach(button => button.addEventListener("click", () => setTab(button.dataset.tab)));
    cookieButton.addEventListener("click", clickCookie);
    $("golden-cookie").addEventListener("click", collectGoldenCookie);
    $("reset-button").addEventListener("click", resetGame);
    $("sound-toggle").addEventListener("click", () => {
      state.sound = !state.sound;
      $("sound-icon").textContent = state.sound ? "♫" : "♪";
      $("sound-toggle").setAttribute("aria-label", state.sound ? "Turn sound off" : "Turn sound on");
      if (state.sound) playPop();
      saveState();
    });
    window.addEventListener("keydown", event => {
      if (event.code === "Space" && !event.repeat && !["BUTTON", "INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); clickCookie(); }
    });
    window.addEventListener("beforeunload", saveState);
    $("sound-icon").textContent = state.sound ? "♫" : "♪";
    $("sound-toggle").setAttribute("aria-label", state.sound ? "Turn sound off" : "Turn sound on");
    const awaySeconds = Math.max(0, Math.min(28800, (Date.now() - (state.lastSeen || Date.now())) / 1000));
    if (awaySeconds > 30) {
      const windfall = cpsFromSave(state) * awaySeconds * .5;
      if (windfall > 1) {
        state.cookies += windfall; state.cookiesBaked += windfall;
        showToast(`While you were away, your bakery made ${fmt(windfall)} cookies.`);
      }
    }
    lastDisplay = Date.now();
    lastRender = lastDisplay;
    render();
    setInterval(gameTick, 200);
    scheduleGoldenCookie();
  }
  function cpsFromSave(s) {
    let result = 0;
    for (const building of buildings) {
      let multiplier = 1;
      for (const upgrade of upgrades) {
        if (!s.boughtUpgrades?.includes(upgrade.id)) continue;
        if (upgrade.kind === "building" && upgrade.target === building.id) multiplier *= upgrade.factor;
        if (upgrade.kind === "all") multiplier *= upgrade.factor;
      }
      result += (s.owned?.[building.id] || 0) * building.cps * multiplier;
    }
    return result;
  }

  initialize();
})();
