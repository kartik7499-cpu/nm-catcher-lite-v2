const { solveHint } = require("pokehint");

class HintService {
  async solve(message) {
    try {
      const results = await solveHint(message);
      if (!results || results.length === 0) return null;
      return results;
    } catch (err) {
      return null;
    }
  }
}

module.exports = HintService;