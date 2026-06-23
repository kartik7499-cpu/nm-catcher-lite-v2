const axios = require('axios');
const FormData = require('form-data');
const Logger = require('../utils/logger');

class AIPredictionService {
  constructor(bot) {
    this.bot = bot;

    const baseUrl = process.env.PREDICTION_API_URL || null;
    this.apiKey = process.env.PREDICTION_API_KEY || null;

    this.apiUrl = baseUrl
      ? baseUrl.endsWith('/predict')
        ? baseUrl
        : `${baseUrl.replace(/\/$/, '')}/predict`
      : null;

    this.enabled = Boolean(this.apiUrl && this.apiKey);

    if (!baseUrl) Logger.warn('⚠️ PREDICTION_API_URL not set');
    if (!this.apiKey) Logger.warn('⚠️ PREDICTION_API_KEY not set');

    if (this.enabled) {
      Logger.success(`🧠 AI Prediction enabled → ${this.apiUrl}`);
    } else {
      Logger.warn('🧠 AI Prediction service disabled');
    }
  }

  isAvailable() {
    return this.enabled;
  }

  normalizePokemonName(name) {
    if (!name) return name;

    let cleaned = String(name).toLowerCase().trim();
    cleaned = cleaned.replace(/[_-]+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');

    const SPECIAL = {
      "mr mime": "mr-mime",
      "mr rime": "mr-rime",
      "mime jr": "mime-jr",
      "type null": "type-null",
      "ho oh": "ho-oh",
      "porygon z": "porygon-z",
      "jangmo o": "jangmo-o",
      "hakamo o": "hakamo-o",
      "kommo o": "kommo-o"
    };

    const FORM_PREFIX = {
      alola: "alolan",
      galar: "galarian",
      hisui: "hisuian",
      paldea: "paldean"
    };

    const resolveBase = (n) => {
      if (n.includes("nidoran")) {
        if (n.includes("♂") || n.includes("male")) return "nidoran-m";
        if (n.includes("♀") || n.includes("female")) return "nidoran-f";
      }
      if (n.includes("basculin")) return "basculin";
      if (n.includes("oricorio")) return "oricorio";
      if (n.includes("lycanroc")) return "lycanroc";
      if (n.includes("tatsugiri")) return "tatsugiri";
      if (n.includes("wormadam")) return "wormadam";
      if (n.includes("gourgeist")) return "gourgeist";
      if (n.includes("pumpkaboo")) return "pumpkaboo";
      if (n.includes("eiscue")) return "eiscue";
      if (n.includes("darmanitan")) return "darmanitan";
      if (n.includes("dudunsparce")) return "dudunsparce";
      if (n.includes("shaymin")) return "shaymin";
      if (n.includes("hippopotas")) return "hippopotas";
      if (n.includes("mimikyu")) return "mimikyu";
      if (n.includes("minior")) return "minior";
      if (n.includes("maushold")) return "maushold";
      if (n.includes("flabebe")) return "flabebe";
      if (n.includes("florges")) return "florges";
      if (n.includes("cyclizar")) return "cyclizar";
      if (n.includes("urshifu")) return "urshifu";
      if (n.includes("giratina")) return "giratina";
      if (n.includes("morpeko")) return "morpeko";
      return null;
    };

    const parts = cleaned.split(" ");

    let form = null;
    const baseParts = [];

    for (const part of parts) {
      if (FORM_PREFIX[part]) {
        form = FORM_PREFIX[part];
      } else {
        baseParts.push(part);
      }
    }

    let base = baseParts.join(" ");

    const collapsed = resolveBase(base);
    if (collapsed) base = collapsed;

    if (SPECIAL[base]) {
      base = SPECIAL[base];
    } else {
      base = base.replace(/ /g, "-");
    }

    if (form) {
      return `${form} ${base}`;
    }

    return base;
  }

  async predictPokemon(imageBuffer) {
    if (!this.enabled) {
      return { success: false, error: 'AI service disabled' };
    }

    try {
      const form = new FormData();
      form.append('image', imageBuffer, {
        filename: 'pokemon.jpg',
        contentType: 'image/jpeg'
      });

      const response = await axios.post(this.apiUrl, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 10000,
        validateStatus: () => true
      });

      const data = response.data || {};

      if (response.status === 429) {
        return {
          success: false,
          retry: false,
          error: 'quota_exhausted'
        };
      }

      if (response.status !== 200) {
        return {
          success: false,
          retry: data?.retry !== false,
          error: data?.error || 'prediction_rejected'
        };
      }

      if (!data.success || !data.pokemon) {
        return {
          success: false,
          retry: true,
          error: data?.error || 'prediction_failed'
        };
      }

      const resolvedName = this.normalizePokemonName(data.pokemon);

      Logger.debug(`🧠 AI Raw: ${data.pokemon} → Resolved: ${resolvedName}`);

      return {
        success: true,
        pokemon: resolvedName,
        confidence: Number(data.confidence) || 0,
        latency: data.latency_ms || 0,
        latency_ms: data.latency_ms || 0,
        quotaRemaining: data.quota_remaining
      };

    } catch (err) {
      Logger.error(`❌ AI ERROR: ${err.message}`);
      return {
        success: false,
        retry: true,
        error: 'network_error'
      };
    }
  }
}

module.exports = AIPredictionService;
