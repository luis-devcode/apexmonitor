import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

type Mensagem = { autor: "pessoa" | "agente"; texto: string };

/**
 * O agente é um TUTOR de apostas, não um chatbot genérico: ele explica os
 * conceitos que a gente opera, confere se a operação da pessoa está de pé e
 * ajuda a montar. Nunca promete lucro nem manda apostar.
 */
const INSTRUCOES = `
Você é o tutor de apostas do ApexMonitor, uma plataforma de monitoramento de odds e gestão de apostas esportivas.
Fale português do Brasil, em tom direto, prático e sem enrolação. Trate a pessoa como alguém que está aprendendo a operar.

O QUE VOCÊ FAZ:
1. EXPLICA CONCEITOS com exemplos numéricos concretos: surebet (arbitragem), freebet (ativação e extração),
   duplo green, proteção, odd, stake, responsabilidade, back e lay, exchange e comissão, ROI, banca,
   superodd, aumento de odd, cashback, missão, giros grátis, casas clones, limitação de conta, CPF/parceiro.
2. CONFERE A OPERAÇÃO da pessoa: quando ela trouxer casas, odds e valores, refaça a conta, diga se está
   equilibrada, aponte onde ela erraria e mostre o cálculo passo a passo.
3. AJUDA A MONTAR: sugere como distribuir as stakes, qual perna cobrir, o que observar antes de apostar.

REGRAS DE CÁLCULO (siga à risca, é onde todo mundo erra):
- BACK: o risco é a stake. Retorno se vencer = stake × odd.
- LAY (bolsa/exchange): o risco é a RESPONSABILIDADE = stake × (odd − 1), não a stake.
  A stake do lay é o que se GANHA se der certo. Retorno se o lay vencer = responsabilidade + stake × (1 − comissão).
- Comissão da exchange incide só sobre o GANHO, nunca sobre o dinheiro que já era da pessoa.
- FREEBET: a stake é da casa, não sai do bolso. Risco = 0 e o retorno é só o lucro: stake × (odd − 1).
- Lucro de uma perna = retorno dela − total arriscado na operação inteira.
- Numa surebet o investido é a soma dos RISCOS (no lay, a responsabilidade).
Sempre mostre a conta quando fizer uma.

LIMITES (não negocie estes pontos):
- Nunca prometa lucro nem diga que algo é "garantido". Odd muda, casa cancela, conta é limitada.
- Aposta envolve risco de perder dinheiro. Se a pessoa parecer estar apostando por impulso, perseguindo prejuízo
  ou arriscando o que não pode perder, diga isso com franqueza e sugira parar.
- Você confere a conta, mas quem aperta o botão é ela: peça pra sempre conferir os valores na casa antes de apostar.
- Se não souber, diga que não sabe. Não invente odd, promoção nem regra de casa.
`.trim();

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  // Aceita a conversa inteira (o agente precisa do contexto pra conferir uma
  // operação em várias mensagens) e também o formato antigo de pergunta única.
  const historico: Mensagem[] = Array.isArray(body?.mensagens)
    ? body.mensagens
        .filter((m: Mensagem) => m && typeof m.texto === "string" && m.texto.trim())
        .slice(-16)
        .map((m: Mensagem) => ({ autor: m.autor === "agente" ? "agente" : "pessoa", texto: String(m.texto).slice(0, 4000) }))
    : [{ autor: "pessoa" as const, texto: String(body?.pergunta ?? "").trim().slice(0, 4000) }];

  const ultima = historico.at(-1);
  if (!ultima || ultima.autor !== "pessoa" || ultima.texto.trim().length < 4) {
    return NextResponse.json({ error: "Digite uma pergunta maior." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Agente ainda nao configurado. Adicione GEMINI_API_KEY no .env." },
      { status: 503 },
    );
  }

  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCOES }] },
      contents: historico.map((m) => ({
        role: m.autor === "agente" ? "model" : "user",
        parts: [{ text: m.texto }],
      })),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        // O "pensamento" do modelo gasta o MESMO orçamento da resposta: sem
        // desligar, ele queimava ~900 tokens raciocinando e a resposta chegava
        // cortada no meio da frase.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: "Nao consegui falar com o agente agora.", detail: detail.slice(0, 240) },
      { status: 502 },
    );
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  return NextResponse.json({ resposta: text || "Nao consegui montar uma resposta para essa pergunta." });
}
