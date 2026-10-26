/**
 * Cloudflare Pages Function: /api/analyze
 * Statistical Perplexity, Burstiness & AI Probability Analyzer
 */

const BANNED_AI_WORDS = [
  'delve', 'testament', 'tapestry', 'beacon', 'multifaceted', 'crucial', 
  'paramount', 'realm', 'moreover', 'furthermore', 'in conclusion', 'embark', 
  'pivotal', 'underscores', 'encompasses', 'vibrant', 'notably', 'it is important to note',
  'seamless', 'fostering', 'holistic', 'interplay', 'cornerstone',
  'sumergirse', 'tapiz', 'testimonio', 'crucial', 'en conclusión', 
  'es fundamental destacar', 'cabe señalar', 'desempeña un papel', 'a fin de cuentas', 
  'por consiguiente', 'un sinfín de', 'no solo', 'sino también', 'vital', 'primordial'
];

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { text = '' } = await context.request.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Texto vacío' }), { status: 400, headers: corsHeaders });
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 2);
    const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);

    let burstiness = 10;
    if (sentenceLengths.length > 1) {
      const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentenceLengths.length;
      burstiness = Math.round(Math.sqrt(variance) * 4);
    }

    const lower = text.toLowerCase();
    const foundCliches = BANNED_AI_WORDS.filter(w => lower.includes(w));

    let aiScore = 40;
    if (burstiness < 15) aiScore += 35;
    else if (burstiness < 25) aiScore += 20;
    else if (burstiness > 35) aiScore -= 20;

    aiScore += foundCliches.length * 8;
    aiScore = Math.min(99, Math.max(5, aiScore));

    return new Response(JSON.stringify({
      success: true,
      metrics: {
        wordCount: words.length,
        charCount: text.length,
        sentenceCount: sentences.length,
        burstiness: Math.min(100, burstiness),
        clicheCount: foundCliches.length,
        cliches: foundCliches.slice(0, 8),
        aiProbability: aiScore,
        humanProbability: 100 - aiScore
      }
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
