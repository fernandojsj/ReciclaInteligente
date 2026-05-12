import axios from 'axios';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
console.log('API KEY carregada:', GEMINI_API_KEY ? `${GEMINI_API_KEY.slice(0, 8)}...` : 'VAZIA');

const PROMPT = `
Você é um especialista em reciclagem e coleta seletiva brasileira, com conhecimento das normas CONAMA e do sistema de coleta seletiva por cores.

Analise a imagem com atenção e RACIOCINE PASSO A PASSO antes de responder:
1. O que exatamente é esse objeto? (seja específico, ex: "garrafa PET de refrigerante", não apenas "garrafa")
2. De que material é feito PRINCIPALMENTE? (ex: plástico PET, plástico PP, papelão ondulado, vidro sódico-cálcico, alumínio, aço, etc.)
3. O item está limpo e em condição de reciclagem? Há restos de comida, gordura ou contaminação visível?
4. É um material composto (ex: caixa longa vida tem papel + plástico + alumínio)?
5. Existe destinação ESPECIAL além das lixeiras comuns?

SISTEMA BRASILEIRO DE CORES (CONAMA 275/2001):
- AZUL: papel e papelão LIMPOS e SECOS (jornais, revistas, caixas de papelão, papel A4)
- VERMELHO: plásticos limpos (PET, PP, PEAD, HDPE, PEBD) + caixas longa vida / Tetra Pak
- VERDE: vidro comum (garrafas, potes, frascos) — EXCETO espelhos, vidro de janela, pyrex, vidro temperado
- AMARELO: metais (latas de alumínio, latinhas, latas de aço, sucata metálica, cobre)
- MARROM: resíduos orgânicos (restos de comida, cascas, borra de café, plantas)
- CINZA: rejeitos não recicláveis (papel higiênico, papel engordurado, fraldas, absorventes, isopor contaminado, cerâmica, porcelana, espelhos)
- ESPECIAL: itens que NÃO vão nas lixeiras comuns e precisam de ponto específico

REGRAS CRÍTICAS — aplique sempre:
- Papelão/papel com gordura (ex: caixa de pizza suja) → CINZA, contaminado
- Isopor (EPS) → CINZA na maioria dos municípios brasileiros (não é aceito)
- Espelhos e vidro temperado/janela → CINZA (composição diferente do vidro reciclável)
- Pilhas e baterias → ESPECIAL (pontos de coleta em supermercados/lojas)
- Medicamentos vencidos → ESPECIAL (farmácias com coleta)
- Óleo de cozinha usado → ESPECIAL (pontos de coleta específicos)
- Eletrônicos e celulares → ESPECIAL (assistências técnicas ou pontos de coleta WEEE)
- Lâmpadas fluorescentes/LED → ESPECIAL (lojas de material elétrico)
- Caixa longa vida / Tetra Pak → VERMELHO (aceita em muitos municípios)
- Embalagem de plástico COM restos de comida → CINZA até ser lavada
- Se o item SERIA reciclável mas está contaminado, diga para lavar e reciclar

Quando usar confianca "baixa":
- A imagem está muito escura, desfocada ou o objeto não está claramente visível
- O objeto tem aparência ambígua (pode ser de vários materiais)
- Não é possível determinar se está limpo ou contaminado

Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois.
SEJA EXTREMAMENTE BREVE — máximo 5 palavras em "objeto", máximo 8 palavras em "preparo" e "dica":
{
  "objeto": "nome curto do objeto (ex: Garrafa PET, Lata de alumínio)",
  "material": "material em 1-3 palavras (ex: Plástico PET, Papelão)",
  "lixeira": "azul|vermelho|verde|amarelo|marrom|cinza|especial",
  "reciclavel": true ou false,
  "preparo": "ação direta em até 8 palavras (ex: Lave e amasse antes de descartar)",
  "dica": "fato rápido ou onde levar em até 8 palavras",
  "confianca": "alta|media|baixa"
}
`;

export async function verificarDescarte(
  base64: string,
  objeto: string,
  lixeira: string
): Promise<{ confirmado: boolean; motivo: string }> {
  const prompt = `
Analise esta imagem e determine se ela mostra o objeto "${objeto}" sendo descartado em uma lixeira/coletor de cor ${lixeira}.

Considere como CONFIRMADO se:
- O objeto aparece próximo ou dentro de uma lixeira de cor ${lixeira}
- Uma lixeira de cor ${lixeira} está claramente visível na imagem
- O objeto está sendo colocado em um coletor/recipiente da cor correta

Considere como NÃO CONFIRMADO se:
- Não é possível ver nenhuma lixeira na imagem
- A lixeira visível tem cor diferente de ${lixeira}
- A imagem está muito escura ou sem contexto claro de descarte

Responda APENAS com JSON válido, sem texto extra:
{
  "confirmado": true ou false,
  "motivo": "explicação em até 6 palavras"
}
`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }] }],
      generationConfig: { temperature: 0.1 },
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const texto = response.data.candidates[0].content.parts[0].text;
  const limpo = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpo);
}

export async function classificarImagem(base64: string) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        topK: 20,
      },
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const texto = response.data.candidates[0].content.parts[0].text;
  const limpo = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpo);
}
