import axios from 'axios';

const GEMINI_API_KEY = 'SUA_CHAVE_AQUI';

const PROMPT = `
Você é um assistente de reciclagem brasileiro.
Analise a imagem e responda APENAS em JSON, sem texto extra, nesse formato:

{
  "objeto": "nome do objeto identificado",
  "lixeira": "cor da lixeira correta",
  "material": "tipo do material",
  "preparo": "instrução simples de como preparar para reciclar",
  "reciclavel": true ou false
}

Cores de lixeira válidas no Brasil:
- Azul: papel e papelão
- Vermelho: plástico
- Verde: vidro
- Amarelo: metal
- Marrom: orgânico
- Cinza: não reciclável
`;

export async function classificarImagem(base64: string) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const texto = response.data.candidates[0].content.parts[0].text;
  const limpo = texto.replace(/```json|```/g, '').trim();
  return JSON.parse(limpo);
}