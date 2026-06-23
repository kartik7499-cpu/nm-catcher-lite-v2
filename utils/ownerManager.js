const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../data/owners.json");

const envOwners = (process.env.OWNER_IDS || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

let owners = new Set();

function load() {
  if (!fs.existsSync(FILE)) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, "[]");
  }

  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const fileOwners = Array.isArray(data) ? data.map(id => id.trim()) : [];
    owners = new Set([...envOwners, ...fileOwners]);
  } catch {
    owners = new Set(envOwners);
  }
}

function save() {
  const toSave = [...owners].filter(id => !envOwners.includes(id));
  fs.writeFileSync(FILE, JSON.stringify(toSave, null, 2));
}

function add(id) {
  id = String(id).trim();
  if (owners.has(id)) return false;
  owners.add(id);
  save();
  return true;
}

function remove(id) {
  id = String(id).trim();
  if (!owners.has(id) || envOwners.includes(id)) return false;
  owners.delete(id);
  save();
  return true;
}

function getAll() {
  return [...owners];
}

function isOwner(id) {
  return owners.has(String(id).trim());
}

load();

module.exports = {
  add,
  remove,
  getAll,
  isOwner
};
