const VECTOR_SIZE = 1536;

const textToVector = (text = '') => {
  const vector = new Array(VECTOR_SIZE).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  if (!tokens.length) return vector;

  for (const token of tokens) {
    for (let i = 0; i < token.length; i += 1) {
      const code = token.charCodeAt(i);
      const idx = (code * (i + 11) + token.length * 17) % VECTOR_SIZE;
      vector[idx] += 1;
    }
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
};

module.exports = {
  VECTOR_SIZE,
  textToVector,
};
