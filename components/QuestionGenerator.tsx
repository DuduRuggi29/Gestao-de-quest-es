'use client';

import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Loader2, CheckCircle2, ChevronDown, RefreshCw, Download, Clock, Target, XCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';

const BANCAS = ['Cebraspe (CESPE)', 'FGV', 'VUNESP', 'FCC', 'ESAF', 'IBFC', 'AOCP'];
const TEMAS = [
  'Qualquer Tema (Aleatório)',
  'Porcentagem',
  'Razão e Proporção',
  'Regra de Três',
  'Matemática Financeira',
  'Probabilidade',
  'Análise Combinatória',
  'Estatística',
  'Equações',
  'Geometria',
  'Trigonometria',
  'Lógica Matemática',
];
const NIVEIS = ['Fácil', 'Médio', 'Difícil'];

interface Question {
  id: string;
  enunciado: string;
  alternativas: string[];
  respostaCorreta: string;
  explicacao: string;
}

export default function QuestionGenerator() {
  const [banca, setBanca] = useState(BANCAS[0]);
  const [tema, setTema] = useState(TEMAS[0]);
  const [nivel, setNivel] = useState(NIVEIS[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New states for interactive features
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [seconds, setSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const generateQuestions = async (isLoadMore = false) => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave da API do Gemini não configurada.');
      }

      const ai = new GoogleGenAI({ apiKey });

      const previousQuestionsContext = isLoadMore && questions.length > 0
        ? `\nPara evitar repetição, NÃO crie questões semelhantes a estas já geradas anteriormente:\n${questions.map(q => `- ${q.enunciado.substring(0, 100)}...`).join('\n')}`
        : '';

      const temaText = tema === 'Qualquer Tema (Aleatório)' 
        ? 'diversos temas de matemática e raciocínio lógico comuns em concursos' 
        : `o tema "${tema}"`;

      const prompt = `
Você é um especialista em elaboração de questões de matemática para concursos públicos no Brasil.
Sua tarefa é criar 10 questões INÉDITAS, ORIGINAIS e SEM REPETIÇÃO sobre ${temaText}, no nível de dificuldade "${nivel}", simulando com alta fidelidade o estilo da banca "${banca}".

Regras de estilo por banca:
- Cebraspe (CESPE): questões mais analíticas, contextualizadas, muitas vezes com interpretação e raciocínio matemático mais lógico.
- FGV: questões com pegadinhas elegantes, lógica apurada, enunciados técnicos e abordagem refinada.
- VUNESP: questões mais diretas, práticas, objetivas e com cálculo bem aplicado.
- Outras bancas: siga seus padrões mais comuns.

Instruções rigorosas:
1. Crie 10 questões completamente novas. Não copie questões reais existentes.
2. Cada questão deve ter um enunciado claro e 5 alternativas (A, B, C, D, E).
3. Apenas UMA alternativa deve estar correta.
4. Forneça uma explicação curta e objetiva da resolução.
5. As questões devem ser plausíveis e coerentes com o nível escolhido.
${isLoadMore ? '6. IMPORTANTE: Gere questões diferentes das que você normalmente geraria primeiro, para evitar repetição em relação a lotes anteriores.' : ''}${previousQuestionsContext}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                enunciado: {
                  type: Type.STRING,
                  description: 'O texto completo do enunciado da questão.',
                },
                alternativas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista com exatamente 5 alternativas (sem as letras A, B, C, D, E no início do texto, apenas o conteúdo da alternativa).',
                },
                respostaCorreta: {
                  type: Type.STRING,
                  description: 'A letra da alternativa correta (A, B, C, D ou E).',
                },
                explicacao: {
                  type: Type.STRING,
                  description: 'Explicação curta e objetiva da resolução da questão.',
                },
              },
              required: ['enunciado', 'alternativas', 'respostaCorreta', 'explicacao'],
            },
          },
        },
      });

      const text = response.text;
      if (!text) throw new Error('Resposta vazia da API.');

      const newQuestionsRaw = JSON.parse(text);
      
      const newQuestions: Question[] = newQuestionsRaw.map((q: any) => ({
        id: Math.random().toString(36).substring(2, 15),
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        respostaCorreta: q.respostaCorreta,
        explicacao: q.explicacao,
      }));

      if (isLoadMore) {
        setQuestions((prev) => [...prev, ...newQuestions]);
      } else {
        setQuestions(newQuestions);
        setUserAnswers({});
        setScore({ correct: 0, incorrect: 0 });
        setSeconds(0);
        setIsTimerActive(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao gerar as questões. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, selectedLetter: string, correctLetter: string) => {
    if (userAnswers[questionId]) return; // Prevent changing answer

    setUserAnswers((prev) => ({ ...prev, [questionId]: selectedLetter }));

    if (selectedLetter === correctLetter) {
      setScore((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setScore((s) => ({ ...s, incorrect: s.incorrect + 1 }));
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Questões Infinitas - Simulado', margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Banca: ${banca} | Tema: ${tema} | Nível: ${nivel}`, margin, y);
    y += 15;

    questions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Questão ${i + 1}`, margin, y);
      y += 7;

      doc.setFont('helvetica', 'normal');
      const splitEnunciado = doc.splitTextToSize(q.enunciado, maxLineWidth);
      
      // Check if enunciado fits on current page
      if (y + (splitEnunciado.length * 6) > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(splitEnunciado, margin, y);
      y += splitEnunciado.length * 6 + 4;

      q.alternativas.forEach((alt, altIdx) => {
        const letter = letters[altIdx];
        const splitAlt = doc.splitTextToSize(`${letter}) ${alt}`, maxLineWidth);
        
        if (y + (splitAlt.length * 6) > 280) {
          doc.addPage();
          y = 20;
        }

        doc.text(splitAlt, margin, y);
        y += splitAlt.length * 6 + 2;
      });
      
      y += 8;
    });

    // Gabarito Page
    doc.addPage();
    y = 20;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Gabarito e Explicações', margin, y);
    y += 15;

    doc.setFontSize(12);
    questions.forEach((q, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Questão ${i + 1} - Resposta: ${q.respostaCorreta}`, margin, y);
      y += 7;
      
      doc.setFont('helvetica', 'normal');
      const splitExp = doc.splitTextToSize(`Explicação: ${q.explicacao}`, maxLineWidth);
      
      if (y + (splitExp.length * 6) > 280) {
        doc.addPage();
        y = 20;
      }

      doc.text(splitExp, margin, y);
      y += splitExp.length * 6 + 10;
    });

    doc.save('questoes_infinitas.pdf');
  };

  const letters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Configuration Panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Banca do Concurso</label>
            <div className="relative">
              <select
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8"
              >
                {BANCAS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Matéria / Tema (Opcional)</label>
            <div className="relative">
              <select
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8"
              >
                {TEMAS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nível de Dificuldade</label>
            <div className="relative">
              <select
                value={nivel}
                onChange={(e) => setNivel(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8"
              >
                {NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => generateQuestions(false)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading && questions.length === 0 ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando Questões...
              </>
            ) : (
              'Gerar Questões'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Stats Panel */}
      {questions.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-5 h-5 text-indigo-500" />
              <span className="font-mono font-medium text-lg">{formatTime(seconds)}</span>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-5 h-5" />
                <span>{score.correct} Acertos</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-600 font-medium">
                <XCircle className="w-5 h-5" />
                <span>{score.incorrect} Erros</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Target className="w-4 h-4" />
            {Object.keys(userAnswers).length} / {questions.length} Respondidas
          </div>
        </div>
      )}

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-6">
          {questions.map((q, index) => {
            const answeredLetter = userAnswers[q.id];
            const isAnswered = !!answeredLetter;

            return (
              <div key={q.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Questão {index + 1}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                    {banca} • {nivel}
                  </span>
                </div>
                
                <div className="prose prose-slate max-w-none mb-6">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{q.enunciado}</p>
                </div>

                <div className="space-y-3 mb-6">
                  {q.alternativas.map((alt, altIndex) => {
                    const letter = letters[altIndex];
                    const isCorrectOption = letter === q.respostaCorreta;
                    const isSelectedOption = letter === answeredLetter;
                    
                    let optionStyle = 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50 cursor-pointer';
                    let letterStyle = 'bg-slate-100 text-slate-600';
                    let icon = null;

                    if (isAnswered) {
                      optionStyle = 'bg-white border-slate-200 opacity-60 cursor-default';
                      
                      if (isCorrectOption) {
                        optionStyle = 'bg-emerald-50 border-emerald-200';
                        letterStyle = 'bg-emerald-500 text-white';
                        icon = <CheckCircle2 className="h-5 w-5 text-emerald-500 ml-auto flex-shrink-0 mt-1" />;
                      } else if (isSelectedOption) {
                        optionStyle = 'bg-rose-50 border-rose-200';
                        letterStyle = 'bg-rose-500 text-white';
                        icon = <XCircle className="h-5 w-5 text-rose-500 ml-auto flex-shrink-0 mt-1" />;
                      }
                    }

                    return (
                      <div
                        key={altIndex}
                        onClick={() => handleAnswer(q.id, letter, q.respostaCorreta)}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${optionStyle}`}
                      >
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${letterStyle}`}>
                          {letter}
                        </div>
                        <div className="pt-1.5 text-slate-700 text-sm">
                          {alt}
                        </div>
                        {icon}
                      </div>
                    );
                  })}
                </div>

                {isAnswered && (
                  <div className="border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-900">Resposta correta:</span>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-700 font-bold text-sm">
                          {q.respostaCorreta}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-900 block mb-1">Explicação:</span>
                        {q.explicacao}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 pb-12">
            <button
              onClick={() => generateQuestions(true)}
              disabled={loading}
              className="w-full sm:w-auto bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando mais...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Gerar mais questões
                </>
              )}
            </button>
            
            <button
              onClick={downloadPDF}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Download className="h-5 w-5" />
              Baixar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
